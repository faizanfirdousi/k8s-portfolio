// services/blog/src/index.js
//
// Blog service: reads Markdown files from the /posts directory and renders them to HTML.
//
// How it works:
//   - On startup, it scans the posts/ directory and loads all .md files
//   - Each .md file has "front matter" — YAML metadata at the top (title, date, tags)
//   - GET /blog       → list of all posts (title, date, excerpt)
//   - GET /blog/:slug → full post rendered to HTML
//
// The "slug" is the filename without the .md extension.
// E.g., "why-k8s-portfolio.md" → accessible at /blog/why-k8s-portfolio

'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const fm = require('front-matter'); // Parses YAML front matter from markdown files
const { metricsPanelCss, renderMetricsPanel } = require('./metrics-panel');

const app = express();
const PORT = process.env.PORT || 3000;

// The posts directory is at /app/posts inside the container
// (because Dockerfile copies posts/ to /app/posts/)
const POSTS_DIR = path.join(__dirname, '..', 'posts');

// ── Post loading ──────────────────────────────────────────────────────────────
// We load posts at startup rather than on every request.
// Why? The posts are files in the image — they don't change while the container runs.
// Loading them once into memory is much faster than reading files on every request.
//
// If you ever update blog posts, you'd rebuild the image and redeploy the Pod.
// The new Pod starts fresh with the new posts loaded.

function loadPosts() {
  const posts = [];

  // Check if the posts directory exists
  if (!fs.existsSync(POSTS_DIR)) {
    console.warn(`[blog] Posts directory not found: ${POSTS_DIR}`);
    return posts;
  }

  const files = fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md'))  // Only process .md files
    .sort()                           // Sort alphabetically (filename order)
    .reverse();                        // Newest first (assumes date-prefixed filenames or just alphabetical)

  for (const filename of files) {
    const slug = filename.replace('.md', '');  // "why-k8s-portfolio.md" → "why-k8s-portfolio"
    const content = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf-8');

    // front-matter parses the YAML block at the top of the file
    // and returns: { attributes: { title, date, ... }, body: "markdown content..." }
    const parsed = fm(content);
    const { title, date, excerpt, tags } = parsed.attributes;

    posts.push({
      slug,
      title: title || slug,                          // Fallback to slug if no title
      date: date || 'Unknown date',
      excerpt: excerpt || '',
      tags: tags || [],
      body: parsed.body,                              // The raw Markdown (without front matter)
      html: marked(parsed.body),                     // Pre-render Markdown → HTML
    });
  }

  console.log(`[blog] Loaded ${posts.length} posts from ${POSTS_DIR}`);
  return posts;
}

const posts = loadPosts();

// Build a lookup map for fast access by slug: { "why-k8s-portfolio": postObject }
const postsBySlug = Object.fromEntries(posts.map(p => [p.slug, p]));

// ── Shared page wrapper ───────────────────────────────────────────────────────
// Returns the outer HTML shell (head, nav, etc.) wrapping any content
function pageWrapper(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | Faizan Firdousi</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #f8fafc; --surface: #ffffff; --border: #e2e8f0;
      --accent: #4f46e5; --accent2: #0891b2; --text: #0f172a;
      --muted: #64748b; --green: #059669; --tag-bg: #f1f5f9;
    }
    .dark {
      --bg: #0a0e1a; --surface: #111827; --border: #1f2937;
      --accent: #6366f1; --accent2: #06b6d4; --text: #f1f5f9;
      --muted: #94a3b8; --green: #10b981; --tag-bg: #1e293b;
    }
    .theme-toggle {
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.5rem;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      z-index: 50;
    }
    .theme-toggle:hover {
      border-color: var(--accent);
    }
    .theme-toggle svg { width: 18px; height: 18px; }
    .dark .sun-icon { display: none; }
    .dark .moon-icon { display: block; }
    .sun-icon { display: block; }
    .moon-icon { display: none; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
    .container { max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem; }
    .breadcrumb { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); margin-bottom: 2rem; }
    .breadcrumb a { color: var(--accent2); text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .pod-badge { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--tag-bg); border: 1px solid var(--border); border-radius: 9999px; padding: 0.25rem 0.75rem; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); margin-bottom: 2rem; }
    .dot { width: 6px; height: 6px; background: var(--green); border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
    /* Post list styles */
    .post-list { display: flex; flex-direction: column; gap: 1rem; }
    .post-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; transition: border-color 0.2s, transform 0.2s; }
    .post-card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .post-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.4rem; }
    .post-title a { color: var(--text); text-decoration: none; }
    .post-title a:hover { color: var(--accent); }
    .post-meta { font-size: 0.78rem; color: var(--muted); font-family: 'JetBrains Mono', monospace; margin-bottom: 0.6rem; }
    .post-excerpt { font-size: 0.9rem; color: var(--muted); }
    .tags { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.75rem; }
    .tag { background: var(--tag-bg); border: 1px solid var(--border); border-radius: 6px; padding: 0.15rem 0.5rem; font-size: 0.7rem; color: var(--accent2); font-family: 'JetBrains Mono', monospace; }
    /* Post detail styles */
    .post-content h1 { font-size: 1.9rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    .post-content h2 { font-size: 1.3rem; font-weight: 600; margin: 2rem 0 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .post-content h3 { font-size: 1.1rem; font-weight: 600; margin: 1.5rem 0 0.5rem; color: var(--accent2); }
    .post-content p { color: var(--muted); margin-bottom: 1rem; line-height: 1.75; }
    .post-content ul, .post-content ol { color: var(--muted); margin: 0.75rem 0 1rem 1.5rem; }
    .post-content li { margin-bottom: 0.4rem; }
    .post-content pre { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; overflow-x: auto; margin: 1rem 0; }
    .post-content code { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--accent2); }
    .post-content pre code { color: var(--text); }
    .back-link { display: inline-flex; align-items: center; gap: 0.4rem; color: var(--muted); text-decoration: none; font-size: 0.875rem; margin-bottom: 2rem; }
    .back-link:hover { color: var(--accent); }
    .page-title { font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    .page-subtitle { color: var(--muted); margin-bottom: 2.5rem; }
    .section-title { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent2); margin-bottom: 1.25rem; font-family: 'JetBrains Mono', monospace; }
    ${metricsPanelCss()}
  </style>
</head>
<body>
  <script>
    // Inline script to prevent flash of incorrect theme
    const currentTheme = localStorage.getItem('portfolio-theme');
    if (currentTheme === 'dark') { document.documentElement.classList.add('dark'); }
  </script>
  <button id="theme-toggle-btn" class="theme-toggle" aria-label="Toggle theme">
    <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
    <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
  </button>
  <div class="container">
    <div class="page-layout">
      <div class="page-main">
    ${content}
      </div>
      ${renderMetricsPanel('blog')}
    </div>
  </div>
  <script>
    const toggleBtn = document.getElementById('theme-toggle-btn');
    const root = document.documentElement;
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        root.classList.toggle('dark');
        const isDark = root.classList.contains('dark');
        localStorage.setItem('portfolio-theme', isDark ? 'dark' : 'light');
      });
    }
    window.addEventListener('storage', (e) => {
      if (e.key === 'portfolio-theme') {
        if (e.newValue === 'dark') { root.classList.add('dark'); }
        else { root.classList.remove('dark'); }
      }
    });
  </script>
</body>
</html>`;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Post list: GET /blog or GET / (after ingress path rewriting strips /blog prefix)
app.get(['/', '/blog', '/blog/'], (req, res) => {
  const listHTML = `
    <div class="breadcrumb"><a href="/">~/portfolio</a> / blog</div>
    <div class="pod-badge"><div class="dot"></div>Served by <code>blog-*</code> pod in <code>ns/blog</code></div>
    <h1 class="page-title">Blog</h1>
    <p class="page-subtitle">Writing about cloud engineering, Go, systems programming, and Kubernetes.</p>
    <div class="section-title">// ${posts.length} post${posts.length !== 1 ? 's' : ''}</div>
    <div class="post-list">
      ${posts.length > 0
        ? posts.map(post => `
          <div class="post-card">
            <div class="post-title"><a href="/blog/${post.slug}">${post.title}</a></div>
            <div class="post-meta">${post.date}</div>
            <div class="post-excerpt">${post.excerpt}</div>
            <div class="tags">
              ${post.tags.map(t => `<span class="tag">${t}</span>`).join('')}
            </div>
          </div>
        `).join('')
        : '<p style="color:var(--muted)">No posts yet.</p>'
      }
    </div>
  `;
  res.send(pageWrapper('Blog', listHTML));
});

// Health check — MUST be registered BEFORE the wildcard /:slug route below.
// If /:slug comes first, it intercepts /healthz and returns a 404 (post not found).
// Kubernetes liveness/readiness probes call this directly on the pod, bypassing the ingress.
app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

// Individual post: GET /blog/:slug or GET /:slug (after ingress rewrite)
app.get(['/blog/:slug', '/:slug'], (req, res) => {
  const post = postsBySlug[req.params.slug];

  if (!post) {
    // Return a proper 404 if the post doesn't exist
    return res.status(404).send(pageWrapper('Post not found', `
      <div class="breadcrumb"><a href="/blog">← Blog</a></div>
      <h1 class="page-title">Post not found</h1>
      <p style="color:var(--muted)">The post you're looking for doesn't exist.</p>
    `));
  }

  const postHTML = `
    <div class="breadcrumb"><a href="/blog">← Blog</a></div>
    <div class="pod-badge"><div class="dot"></div>Served by <code>blog-*</code> pod in <code>ns/blog</code></div>
    <div class="post-content">
      <h1>${post.title}</h1>
      <div class="post-meta" style="margin-bottom:2rem">${post.date}</div>
      <div class="tags" style="margin-bottom:2rem">
        ${post.tags.map(t => `<span class="tag">${t}</span>`).join('')}
      </div>
      ${post.html}
    </div>
  `;
  res.send(pageWrapper(post.title, postHTML));
});

// Health check
app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[blog] Server listening on port ${PORT}`);
  console.log(`[blog] ${posts.length} posts loaded`);
});

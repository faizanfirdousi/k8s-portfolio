// services/blog/src/index.js
//
// Blog service: dynamically fetches real articles from the DEV.to API for @faizanfirdousi.
//
// Features:
//   - Live integration with DEV.to API (https://dev.to/api/articles?username=faizanfirdousi)
//   - 5-minute in-memory caching to optimize response times & respect rate limits
//   - Rich rendering for article listings and full individual article reading
//   - Responsive dark/light theme matching the cluster design system

'use strict';

const express = require('express');
const fetch = require('node-fetch');
const { marked } = require('marked');
let metricsPanelCss = () => '';
let renderMetricsPanel = () => '';
try {
  const mp = require('./metrics-panel');
  metricsPanelCss = mp.metricsPanelCss;
  renderMetricsPanel = mp.renderMetricsPanel;
} catch (e) {
  try {
    const mp = require('../../shared/metrics-panel');
    metricsPanelCss = mp.metricsPanelCss;
    renderMetricsPanel = mp.renderMetricsPanel;
  } catch (err) {}
}

const app = express();

// ── Configuration ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const DEVTO_USERNAME = process.env.DEVTO_USERNAME || 'faizanfirdousi';
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS || '300000', 10); // 5 min default

// ── In-Memory Caches ─────────────────────────────────────────────────────────
let articlesCache = { data: null, fetchedAt: 0 };
const articleDetailCache = new Map(); // slug -> { data, fetchedAt }

// ── DEV.to API Helpers ───────────────────────────────────────────────────────
async function fetchDevToArticles() {
  const now = Date.now();
  if (articlesCache.data && now - articlesCache.fetchedAt < CACHE_TTL_MS) {
    console.log('[blog] Serving article list from in-memory cache');
    return articlesCache.data;
  }

  console.log(`[blog] Fetching real articles from DEV.to API for @${DEVTO_USERNAME}...`);

  const headers = {
    'Accept': 'application/vnd.forem.api-v1+json',
    'User-Agent': 'portfolio-blog-service (faizanfirdousi)',
  };

  try {
    const res = await fetch(`https://dev.to/api/articles?username=${DEVTO_USERNAME}`, { headers });
    if (!res.ok) {
      console.error(`[blog] DEV.to API error: ${res.status} ${res.statusText}`);
      return articlesCache.data || [];
    }

    const raw = await res.json();
    const data = raw.map(article => ({
      id: article.id,
      title: article.title,
      description: article.description || '',
      slug: article.slug,
      url: article.url,
      coverImage: article.cover_image || article.social_image || null,
      publishedAt: new Date(article.published_timestamp || article.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      readingTime: article.reading_time_minutes || 1,
      reactionsCount: article.public_reactions_count || 0,
      commentsCount: article.comments_count || 0,
      tags: Array.isArray(article.tag_list) ? article.tag_list : (article.tags ? article.tags.split(',').map(t => t.trim()) : []),
      author: article.user ? {
        name: article.user.name,
        username: article.user.username,
        profileImage: article.user.profile_image || null,
      } : null,
    }));

    articlesCache = { data, fetchedAt: Date.now() };
    return data;
  } catch (err) {
    console.error('[blog] Failed to fetch from DEV.to:', err.message);
    return articlesCache.data || [];
  }
}

async function fetchDevToArticleDetail(slug) {
  const now = Date.now();
  const cached = articleDetailCache.get(slug);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    console.log(`[blog] Serving article detail [${slug}] from in-memory cache`);
    return cached.data;
  }

  console.log(`[blog] Fetching full article content for [${slug}] from DEV.to...`);

  const headers = {
    'Accept': 'application/vnd.forem.api-v1+json',
    'User-Agent': 'portfolio-blog-service (faizanfirdousi)',
  };

  try {
    const res = await fetch(`https://dev.to/api/articles/${DEVTO_USERNAME}/${slug}`, { headers });
    if (!res.ok) {
      console.error(`[blog] DEV.to API single article error: ${res.status} ${res.statusText}`);
      return cached ? cached.data : null;
    }

    const article = await res.json();
    const data = {
      id: article.id,
      title: article.title,
      description: article.description || '',
      slug: article.slug,
      url: article.url,
      coverImage: article.cover_image || null,
      publishedAt: new Date(article.published_timestamp || article.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      readingTime: article.reading_time_minutes || 1,
      reactionsCount: article.public_reactions_count || 0,
      commentsCount: article.comments_count || 0,
      tags: Array.isArray(article.tag_list) ? article.tag_list : (article.tags ? article.tags.split(',').map(t => t.trim()) : []),
      bodyHtml: article.body_html || marked(article.body_markdown || ''),
      author: article.user ? {
        name: article.user.name,
        username: article.user.username,
        profileImage: article.user.profile_image || null,
      } : null,
    };

    articleDetailCache.set(slug, { data, fetchedAt: Date.now() });
    return data;
  } catch (err) {
    console.error(`[blog] Failed to fetch article [${slug}]:`, err.message);
    return cached ? cached.data : null;
  }
}

// ── Shared Page Wrapper ───────────────────────────────────────────────────────
function pageWrapper(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Technical blog posts and articles by Faizan Firdousi on Cloud, Kubernetes, Go, and Systems." />
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
    .post-list { display: flex; flex-direction: column; gap: 1.25rem; margin-bottom: 3rem; }
    .post-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 1.5rem; transition: border-color 0.2s, transform 0.2s; display: flex; flex-direction: column; gap: 0.75rem; }
    .post-card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .post-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .post-title { font-size: 1.2rem; font-weight: 700; line-height: 1.4; }
    .post-title a { color: var(--text); text-decoration: none; }
    .post-title a:hover { color: var(--accent); }
    .post-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; font-size: 0.78rem; color: var(--muted); font-family: 'JetBrains Mono', monospace; }
    .post-meta-item { display: inline-flex; align-items: center; gap: 0.3rem; }
    .post-excerpt { font-size: 0.92rem; color: var(--muted); line-height: 1.6; }
    .tags { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.25rem; }
    .tag { background: var(--tag-bg); border: 1px solid var(--border); border-radius: 6px; padding: 0.2rem 0.5rem; font-size: 0.72rem; color: var(--accent2); font-family: 'JetBrains Mono', monospace; }
    .post-actions { display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem; padding-top: 0.75rem; border-top: 1px solid var(--border); }
    .read-link { font-size: 0.85rem; font-weight: 600; color: var(--accent); text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem; }
    .read-link:hover { text-decoration: underline; }
    .devto-link { font-size: 0.8rem; color: var(--muted); text-decoration: none; font-family: 'JetBrains Mono', monospace; }
    .devto-link:hover { color: var(--accent2); text-decoration: underline; }

    /* Post detail styles */
    .post-header { margin-bottom: 2rem; border-bottom: 1px solid var(--border); pb: 1.5rem; }
    .post-cover-img { width: 100%; max-height: 380px; object-fit: cover; border-radius: 12px; margin-bottom: 1.5rem; border: 1px solid var(--border); }
    .post-content h1 { font-size: 2rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.75rem; line-height: 1.3; }
    .post-content h2 { font-size: 1.35rem; font-weight: 600; margin: 2rem 0 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .post-content h3 { font-size: 1.15rem; font-weight: 600; margin: 1.5rem 0 0.5rem; color: var(--accent2); }
    .post-content p { color: var(--text); margin-bottom: 1.25rem; line-height: 1.8; font-size: 1rem; }
    .post-content ul, .post-content ol { color: var(--text); margin: 0.75rem 0 1.25rem 1.5rem; line-height: 1.7; }
    .post-content li { margin-bottom: 0.4rem; }
    .post-content pre { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1.2rem; overflow-x: auto; margin: 1.25rem 0; }
    .post-content code { font-family: 'JetBrains Mono', monospace; font-size: 0.88rem; color: var(--accent2); }
    .post-content pre code { color: var(--text); }
    .post-content blockquote { border-left: 4px solid var(--accent); padding-left: 1rem; margin: 1.25rem 0; color: var(--muted); font-style: italic; }
    .back-link { display: inline-flex; align-items: center; gap: 0.4rem; color: var(--muted); text-decoration: none; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .back-link:hover { color: var(--accent); }
    .page-title { font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    .page-subtitle { color: var(--muted); margin-bottom: 2.5rem; font-size: 1rem; }
    .section-title { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent2); margin-bottom: 1.25rem; font-family: 'JetBrains Mono', monospace; }
    .cache-note { font-size: 0.75rem; color: var(--muted); font-family: 'JetBrains Mono', monospace; margin-top: -1rem; margin-bottom: 1.5rem; }
    ${metricsPanelCss()}
  </style>
</head>
<body>
  <script>
    const currentTheme = localStorage.getItem('portfolio-theme');
    if (currentTheme === 'dark') { document.documentElement.classList.add('dark'); }
  </script>
  <button id="theme-toggle-btn" class="theme-toggle" aria-label="Toggle theme">
    <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
    <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 0 1 1-9-9Z"/></svg>
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

// Health check — Registered before wildcards
app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

// Articles List: GET /blog or GET /
app.get(['/', '/blog', '/blog/'], async (req, res) => {
  const articles = await fetchDevToArticles();

  const listHTML = `
    <div class="breadcrumb"><a href="/">~/portfolio</a> / blog</div>
    <div class="pod-badge"><div class="dot"></div>Served by <code>blog-*</code> pod in <code>ns/blog</code></div>
    <h1 class="page-title">Blog</h1>
    <p class="page-subtitle">
      Real technical writeups on Kubernetes, Go, systems, and databases. Fetched live via the DEV.to API from
      <a href="https://dev.to/${DEVTO_USERNAME}" target="_blank" style="color:var(--accent2); text-decoration:none; font-weight:600">@${DEVTO_USERNAME}</a>.
    </p>
    <div class="section-title">// ${articles.length} Published Articles</div>
    <p class="cache-note">Articles cached for 5 minutes to prevent rate limits.</p>

    <div class="post-list">
      ${articles.length > 0
        ? articles.map(article => `
          <article class="post-card">
            <div class="post-card-header">
              <h2 class="post-title">
                <a href="/blog/${article.slug}">${article.title}</a>
              </h2>
            </div>
            <div class="post-meta">
              <span class="post-meta-item">📅 ${article.publishedAt}</span>
              <span class="post-meta-item">⏱️ ${article.readingTime} min read</span>
              ${article.reactionsCount > 0 ? `<span class="post-meta-item">❤️ ${article.reactionsCount} reactions</span>` : ''}
              ${article.commentsCount > 0 ? `<span class="post-meta-item">💬 ${article.commentsCount} comments</span>` : ''}
            </div>
            <p class="post-excerpt">${article.description}</p>
            <div class="tags">
              ${article.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
            </div>
            <div class="post-actions">
              <a href="/blog/${article.slug}" class="read-link">Read Post →</a>
              <a href="${article.url}" target="_blank" rel="noopener" class="devto-link">Open on DEV.to ↗</a>
            </div>
          </article>
        `).join('')
        : '<p style="color:var(--muted)">No articles loaded yet from DEV.to.</p>'
      }
    </div>
  `;

  res.send(pageWrapper('Blog', listHTML));
});

// Single Article: GET /blog/:slug or GET /:slug
app.get(['/blog/:slug', '/:slug'], async (req, res) => {
  const slug = req.params.slug;
  const article = await fetchDevToArticleDetail(slug);

  if (!article) {
    return res.status(404).send(pageWrapper('Article Not Found', `
      <div class="breadcrumb"><a href="/blog">← Back to Blog</a></div>
      <h1 class="page-title">Article Not Found</h1>
      <p style="color:var(--muted)">Could not load the article from DEV.to.</p>
      <div style="margin-top:1.5rem">
        <a href="/blog" style="color:var(--accent); text-decoration:none; font-weight:600">← Return to all articles</a>
      </div>
    `));
  }

  const postHTML = `
    <a href="/blog" class="back-link">← Back to All Articles</a>
    <div class="pod-badge"><div class="dot"></div>Served by <code>blog-*</code> pod in <code>ns/blog</code></div>

    ${article.coverImage ? `<img src="${article.coverImage}" alt="${article.title}" class="post-cover-img" />` : ''}

    <div class="post-content">
      <div class="post-header">
        <h1>${article.title}</h1>
        <div class="post-meta" style="margin-top:0.75rem; margin-bottom:1rem">
          <span class="post-meta-item">📅 Published ${article.publishedAt}</span>
          <span class="post-meta-item">⏱️ ${article.readingTime} min read</span>
          ${article.reactionsCount > 0 ? `<span class="post-meta-item">❤️ ${article.reactionsCount} reactions</span>` : ''}
          <a href="${article.url}" target="_blank" rel="noopener" style="color:var(--accent2); text-decoration:none; font-weight:600">View on DEV.to ↗</a>
        </div>
        <div class="tags" style="margin-bottom:1.5rem">
          ${article.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
        </div>
      </div>

      <div class="article-body">
        ${article.bodyHtml}
      </div>

      <div style="margin-top:3rem; padding-top:1.5rem; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem">
        <a href="/blog" class="read-link">← Back to All Articles</a>
        <a href="${article.url}" target="_blank" rel="noopener" class="read-link" style="color:var(--accent2)">Discuss &amp; Comment on DEV.to ↗</a>
      </div>
    </div>
  `;

  res.send(pageWrapper(article.title, postHTML));
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[blog] Server listening on port ${PORT}`);
  console.log(`[blog] Integrated with DEV.to API for user: ${DEVTO_USERNAME}`);
});

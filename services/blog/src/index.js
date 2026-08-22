// services/blog/src/index.js
//
// Blog service: dynamically fetches real articles from the DEV.to API for @faizanfirdousi.
//
// Hardened with strict slug validation, URI encoding, request timeouts,
// HTML entity escaping, and security headers.

'use strict';

const express = require('express');
const fetch = require('node-fetch');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');
let metricsPanelCss = () => '';
let renderMetricsPanel = () => '';
let renderPageToolbar = () => '';
let themeToggleScript = () => '';
function loadMetricsPanel(mp) {
  if (!mp || typeof mp !== 'object') return;
  if (typeof mp.metricsPanelCss === 'function') metricsPanelCss = mp.metricsPanelCss;
  if (typeof mp.renderMetricsPanel === 'function') renderMetricsPanel = mp.renderMetricsPanel;
  if (typeof mp.renderPageToolbar === 'function') renderPageToolbar = mp.renderPageToolbar;
  if (typeof mp.themeToggleScript === 'function') themeToggleScript = mp.themeToggleScript;
}
try {
  loadMetricsPanel(require('./metrics-panel'));
} catch (e) {
  try {
    loadMetricsPanel(require('../../shared/metrics-panel'));
  } catch (err) {}
}

const app = express();

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data: https:;");
  next();
});

// ── Configuration ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const DEVTO_USERNAME = process.env.DEVTO_USERNAME || 'faizanfirdousi';
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS || '300000', 10); // 5 min default
const FETCH_TIMEOUT_MS = 8000; // 8s timeout to prevent thread hangs

const SANITIZE_OPTIONS = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'code', 'blockquote', 'figure', 'figcaption']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    a: ['href', 'name', 'target', 'rel'],
    code: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
};

function sanitizeArticleHtml(html) {
  if (typeof html !== 'string' || !html) return '';
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

// ── In-Memory Caches ─────────────────────────────────────────────────────────
let articlesCache = { data: null, fetchedAt: 0 };
const articleDetailCache = new Map(); // slug -> { data, fetchedAt }

// ── Security Helpers ─────────────────────────────────────────────────────────
const SLUG_REGEX = /^[a-zA-Z0-9_-]{1,150}$/;

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeUrl(url) {
  if (typeof url !== 'string') return '#';
  const trimmed = url.trim();
  if (trimmed.startsWith('https://dev.to/') || trimmed.startsWith('https://')) {
    return escapeHtml(trimmed);
  }
  return '#';
}

function sanitizeImageUrl(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('https://')) {
    return escapeHtml(trimmed);
  }
  return null;
}

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const encodedUser = encodeURIComponent(DEVTO_USERNAME);
    const res = await fetch(`https://dev.to/api/articles?username=${encodedUser}`, {
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[blog] DEV.to API error: ${res.status} ${res.statusText}`);
      return articlesCache.data || [];
    }

    const raw = await res.json();
    if (!Array.isArray(raw)) {
      return articlesCache.data || [];
    }

    const data = raw.map(article => ({
      id: article.id,
      title: article.title || 'Untitled',
      description: article.description || '',
      slug: article.slug || '',
      url: article.url || '',
      coverImage: article.cover_image || article.social_image || null,
      publishedAt: new Date(article.published_timestamp || article.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      readingTime: typeof article.reading_time_minutes === 'number' ? article.reading_time_minutes : 1,
      reactionsCount: typeof article.public_reactions_count === 'number' ? article.public_reactions_count : 0,
      commentsCount: typeof article.comments_count === 'number' ? article.comments_count : 0,
      tags: Array.isArray(article.tag_list) ? article.tag_list : (typeof article.tags === 'string' ? article.tags.split(',').map(t => t.trim()) : []),
      author: article.user ? {
        name: article.user.name || '',
        username: article.user.username || '',
        profileImage: article.user.profile_image || null,
      } : null,
    }));

    articlesCache = { data, fetchedAt: Date.now() };
    return data;
  } catch (err) {
    console.error('[blog] Failed to fetch from DEV.to:', err.message);
    return articlesCache.data || [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchDevToArticleDetail(slug) {
  if (!SLUG_REGEX.test(slug)) {
    return null;
  }

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const encodedUser = encodeURIComponent(DEVTO_USERNAME);
    const encodedSlug = encodeURIComponent(slug);
    const res = await fetch(`https://dev.to/api/articles/${encodedUser}/${encodedSlug}`, {
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[blog] DEV.to API single article error: ${res.status} ${res.statusText}`);
      return cached ? cached.data : null;
    }

    const article = await res.json();
    const data = {
      id: article.id,
      title: article.title || 'Untitled',
      description: article.description || '',
      slug: article.slug || slug,
      url: article.url || '',
      coverImage: article.cover_image || null,
      publishedAt: new Date(article.published_timestamp || article.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      readingTime: typeof article.reading_time_minutes === 'number' ? article.reading_time_minutes : 1,
      reactionsCount: typeof article.public_reactions_count === 'number' ? article.public_reactions_count : 0,
      commentsCount: typeof article.comments_count === 'number' ? article.comments_count : 0,
      tags: Array.isArray(article.tag_list) ? article.tag_list : (typeof article.tags === 'string' ? article.tags.split(',').map(t => t.trim()) : []),
      bodyHtml: sanitizeArticleHtml(article.body_html || (article.body_markdown ? marked(article.body_markdown) : '')),
      author: article.user ? {
        name: article.user.name || '',
        username: article.user.username || '',
        profileImage: article.user.profile_image || null,
      } : null,
    };

    articleDetailCache.set(slug, { data, fetchedAt: Date.now() });
    return data;
  } catch (err) {
    console.error(`[blog] Failed to fetch article [${slug}]:`, err.message);
    return cached ? cached.data : null;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Shared Page Wrapper ───────────────────────────────────────────────────────
function pageWrapper(title, content) {
  const safeTitle = escapeHtml(title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <script>
    (function() {
      if (localStorage.getItem('portfolio-theme') === 'dark') {
        document.documentElement.classList.add('dark');
      }
    })();
  </script>

  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Technical blog posts and articles by Faizan Firdousi on Cloud, Kubernetes, Go, and Systems." />
  <title>${safeTitle} | Faizan Firdousi</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #f8fafc; --surface: #ffffff; --border: #e2e8f0;
      --accent: #4f46e5; --accent2: #0891b2; --text: #0f172a;
      --muted: #334155; --green: #047857; --tag-bg: #f1f5f9;
    }
    .dark {
      --bg: #0f172a; --surface: #111827; --border: #334155;
      --accent: #a5b4fc; --accent2: #67e8f9; --text: #f8fafc;
      --muted: #cbd5e1; --green: #6ee7b7; --tag-bg: #1e293b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
    .container { max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem; }
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
    .post-header { margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; }
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
    .page-subtitle { color: var(--muted); margin-bottom: 2.5rem; font-size: 1rem; line-height: 1.6; }
    .section-title { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent2); margin-bottom: 1.25rem; font-family: 'JetBrains Mono', monospace; }
    ${metricsPanelCss()}
  </style>
</head>
<body>
  <div class="container">
    <div class="page-layout">
      <div class="page-main">
    ${content}
      </div>
      ${renderMetricsPanel('blog')}
    </div>
  </div>
  ${themeToggleScript()}
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
    ${renderPageToolbar('blog')}
    <div class="pod-badge"><div class="dot"></div>Served by <code data-live="pod-name">blog-*</code> pod in <code>ns/blog</code></div>
    <h1 class="page-title">Blog</h1>
    <p class="page-subtitle">
      Technical writeups on Kubernetes, Go, systems, and databases.
    </p>
    <div class="section-title">// Articles</div>

    <div class="post-list">
      ${articles.length > 0
        ? articles.map(article => {
            const safeSlug = encodeURIComponent(article.slug);
            const safeTitle = escapeHtml(article.title);
            const safeDesc = escapeHtml(article.description);
            const safeDate = escapeHtml(article.publishedAt);
            const safeUrl = sanitizeUrl(article.url);
            const safeTags = Array.isArray(article.tags) ? article.tags.map(t => escapeHtml(t)) : [];

            return `
          <article class="post-card">
            <div class="post-card-header">
              <h2 class="post-title">
                <a href="/blog/${safeSlug}">${safeTitle}</a>
              </h2>
            </div>
            <div class="post-meta">
              <span class="post-meta-item">📅 ${safeDate}</span>
              <span class="post-meta-item">⏱️ ${article.readingTime} min read</span>
              ${article.reactionsCount > 0 ? `<span class="post-meta-item">❤️ ${article.reactionsCount} reactions</span>` : ''}
              ${article.commentsCount > 0 ? `<span class="post-meta-item">💬 ${article.commentsCount} comments</span>` : ''}
            </div>
            <p class="post-excerpt">${safeDesc}</p>
            <div class="tags">
              ${safeTags.map(t => `<span class="tag">#${t}</span>`).join('')}
            </div>
            <div class="post-actions">
              <a href="/blog/${safeSlug}" class="read-link">Read Post →</a>
              <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="devto-link">Open on DEV.to ↗</a>
            </div>
          </article>
        `;
          }).join('')
        : '<p style="color:var(--muted)">No articles published yet.</p>'
      }
    </div>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(pageWrapper('Blog', listHTML));
});

// Single Article: GET /blog/:slug or GET /:slug
app.get(['/blog/:slug', '/:slug'], async (req, res) => {
  const slug = req.params.slug;

  if (!SLUG_REGEX.test(slug)) {
    return res.status(400).send(pageWrapper('Invalid Article Request', `
      ${renderPageToolbar('blog')}
      <div class="breadcrumb"><a href="/blog">← Back to Blog</a></div>
      <h1 class="page-title">Invalid Request</h1>
      <p style="color:var(--muted)">The requested article slug contains invalid characters.</p>
      <div style="margin-top:1.5rem">
        <a href="/blog" style="color:var(--accent); text-decoration:none; font-weight:600">← Return to all articles</a>
      </div>
    `));
  }

  const article = await fetchDevToArticleDetail(slug);

  if (!article) {
    return res.status(404).send(pageWrapper('Article Not Found', `
      ${renderPageToolbar('blog')}
      <div class="breadcrumb"><a href="/blog">← Back to Blog</a></div>
      <h1 class="page-title">Article Not Found</h1>
      <p style="color:var(--muted)">This article could not be found.</p>
      <div style="margin-top:1.5rem">
        <a href="/blog" style="color:var(--accent); text-decoration:none; font-weight:600">← Return to all articles</a>
      </div>
    `));
  }

  const safeTitle = escapeHtml(article.title);
  const safeDate = escapeHtml(article.publishedAt);
  const safeUrl = sanitizeUrl(article.url);
  const safeCover = sanitizeImageUrl(article.coverImage);
  const safeTags = Array.isArray(article.tags) ? article.tags.map(t => escapeHtml(t)) : [];

  const postHTML = `
    ${renderPageToolbar('blog')}
    <a href="/blog" class="back-link">← Back to All Articles</a>
    <div class="pod-badge"><div class="dot"></div>Served by <code data-live="pod-name">blog-*</code> pod in <code>ns/blog</code></div>

    ${safeCover ? `<img src="${safeCover}" alt="${safeTitle}" class="post-cover-img" />` : ''}

    <div class="post-content">
      <div class="post-header">
        <h1>${safeTitle}</h1>
        <div class="post-meta" style="margin-top:0.75rem; margin-bottom:1rem">
          <span class="post-meta-item">📅 Published ${safeDate}</span>
          <span class="post-meta-item">⏱️ ${article.readingTime} min read</span>
          ${article.reactionsCount > 0 ? `<span class="post-meta-item">❤️ ${article.reactionsCount} reactions</span>` : ''}
          <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--accent2); text-decoration:none; font-weight:600">View on DEV.to ↗</a>
        </div>
        <div class="tags" style="margin-bottom:1.5rem">
          ${safeTags.map(t => `<span class="tag">#${t}</span>`).join('')}
        </div>
      </div>

      <div class="article-body">
        ${article.bodyHtml}
      </div>

      <div style="margin-top:3rem; padding-top:1.5rem; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem">
        <a href="/blog" class="read-link">← Back to All Articles</a>
        <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="read-link" style="color:var(--accent2)">Discuss &amp; Comment on DEV.to ↗</a>
      </div>
    </div>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(pageWrapper(article.title, postHTML));
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[blog] Server listening on port ${PORT}`);
});

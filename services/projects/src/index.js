// services/projects/src/index.js
//
// This is the "projects" section service.
// It calls GitHub API to get stats for pinned repos and renders an HTML page.
//
// Hardened with HTML entity escaping, request timeouts, security headers,
// and sanitized error handling.

'use strict';

const express = require('express');
const fetch = require('node-fetch');
const { metricsPanelCss, renderMetricsPanel } = require('./metrics-panel');

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
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'faizanfirdousi';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS || '300000', 10);
const FETCH_TIMEOUT_MS = 8000; // 8s timeout to prevent DoS from slow external APIs

// ── In-memory cache ───────────────────────────────────────────────────────────
let cache = { data: null, fetchedAt: 0 };

// ── Security Helpers ─────────────────────────────────────────────────────────
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
  if (trimmed.startsWith('https://github.com/') || trimmed.startsWith('https://')) {
    return escapeHtml(trimmed);
  }
  return '#';
}

// ── GitHub API helper ─────────────────────────────────────────────────────────
async function fetchGitHubRepos() {
  const now = Date.now();
  if (cache.data && (now - cache.fetchedAt) < CACHE_TTL_MS) {
    console.log('[projects] Serving from cache');
    return cache.data;
  }

  console.log(`[projects] Fetching repos from GitHub for @${GITHUB_USERNAME}...`);

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'portfolio-projects-service',
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const encodedUsername = encodeURIComponent(GITHUB_USERNAME);
    const response = await fetch(
      `https://api.github.com/users/${encodedUsername}/repos?type=public&sort=pushed&per_page=20`,
      { headers, signal: controller.signal }
    );

    if (!response.ok) {
      console.error(`[projects] GitHub API error: ${response.status} ${response.statusText}`);
      return cache.data || [];
    }

    const repos = await response.json();
    if (!Array.isArray(repos)) {
      return cache.data || [];
    }

    const ownRepos = repos
      .filter(r => !r.fork)
      .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
      .slice(0, 8);

    const data = ownRepos.map(repo => ({
      name: repo.name || 'Untitled',
      description: repo.description || 'No description provided.',
      url: repo.html_url || '',
      stars: typeof repo.stargazers_count === 'number' ? repo.stargazers_count : 0,
      forks: typeof repo.forks_count === 'number' ? repo.forks_count : 0,
      language: repo.language || '',
      updatedAt: repo.pushed_at ? new Date(repo.pushed_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      }) : '',
    }));

    cache = { data, fetchedAt: Date.now() };
    return data;

  } catch (err) {
    console.error('[projects] Failed to fetch from GitHub:', err.message);
    return cache.data || [];
  } finally {
    clearTimeout(timeout);
  }
}

// ── HTML renderer ─────────────────────────────────────────────────────────────
function renderPage(repos) {
  const safeRepos = Array.isArray(repos) ? repos : [];
  const repoCards = safeRepos.length > 0
    ? safeRepos.map(repo => {
        const safeName = escapeHtml(repo.name);
        const safeDesc = escapeHtml(repo.description);
        const safeUrl = sanitizeUrl(repo.url);
        const safeLang = escapeHtml(repo.language);
        const safeUpdated = escapeHtml(repo.updatedAt);
        const stars = Number.isInteger(repo.stars) && repo.stars > 0 ? repo.stars : 0;
        const forks = Number.isInteger(repo.forks) && repo.forks > 0 ? repo.forks : 0;

        return `
        <div class="repo-card">
          <div class="repo-header">
            <a href="${safeUrl}" class="repo-name" target="_blank" rel="noopener noreferrer">${safeName}</a>
            <div class="repo-stats">
              ${stars > 0 ? `<span class="stat">⭐ ${stars}</span>` : ''}
              ${forks > 0 ? `<span class="stat">🍴 ${forks}</span>` : ''}
            </div>
          </div>
          <p class="repo-desc">${safeDesc}</p>
          <div class="repo-footer">
            ${safeLang ? `<span class="lang-badge">${safeLang}</span>` : ''}
            ${safeUpdated ? `<span class="updated">Updated ${safeUpdated}</span>` : ''}
          </div>
        </div>`;
      }).join('')
    : `<p class="no-repos">Could not load repositories. GitHub API may be unavailable.</p>`;

  const safeUsername = escapeHtml(GITHUB_USERNAME);

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
  <meta name="description" content="Faizan Firdousi's GitHub projects and code repositories." />
  <title>Faizan Firdousi | Projects</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    .cluster-cta {
      position: absolute;
      top: 1.5rem;
      right: 4.5rem;
      left: auto;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.875rem;
      transition: all 0.2s;
      z-index: 50;
    }
    .cluster-cta:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    :root {
      --bg: #f8fafc; --surface: #ffffff; --border: #e2e8f0;
      --accent: #4f46e5; --accent2: #0891b2; --text: #0f172a;
      --muted: #475569; --green: #047857; --tag-bg: #f1f5f9;
    }
    .dark {
      --bg: #0f172a; --surface: #111827; --border: #334155;
      --accent: #a5b4fc; --accent2: #67e8f9; --text: #f8fafc;
      --muted: #cbd5e1; --green: #6ee7b7; --tag-bg: #1e293b;
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
    .breadcrumb span { color: var(--accent2); }
    .pod-badge { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--tag-bg); border: 1px solid var(--border); border-radius: 9999px; padding: 0.25rem 0.75rem; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); margin-bottom: 2rem; }
    .dot { width: 6px; height: 6px; background: var(--green); border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
    h1 { font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    .subtitle { color: var(--muted); margin-bottom: 2.5rem; font-size: 1rem; }
    .github-link { color: var(--accent2); text-decoration: none; }
    .github-link:hover { text-decoration: underline; }
    .section-title { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent2); margin-bottom: 1.25rem; font-family: 'JetBrains Mono', monospace; }
    .repos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 3rem; }
    .repo-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; transition: border-color 0.2s, transform 0.2s; }
    .repo-card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .repo-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
    .repo-name { font-weight: 600; color: var(--accent); text-decoration: none; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; word-break: break-all; }
    .repo-name:hover { text-decoration: underline; }
    .repo-stats { display: flex; gap: 0.5rem; flex-shrink: 0; }
    .stat { font-size: 0.75rem; color: var(--muted); }
    .repo-desc { font-size: 0.875rem; color: var(--muted); line-height: 1.5; flex: 1; }
    .repo-footer { display: flex; justify-content: space-between; align-items: center; }
    .lang-badge { background: var(--tag-bg); border: 1px solid var(--border); border-radius: 6px; padding: 0.2rem 0.5rem; font-size: 0.72rem; color: var(--accent2); font-family: 'JetBrains Mono', monospace; }
    .updated { font-size: 0.72rem; color: var(--muted); }
    .no-repos { color: var(--muted); font-style: italic; }
    .cache-note { font-size: 0.75rem; color: var(--muted); font-family: 'JetBrains Mono', monospace; margin-top: -0.5rem; margin-bottom: 1.5rem; }
    ${metricsPanelCss()}
  </style>
</head>
<body>
  <script>
    const currentTheme = localStorage.getItem('portfolio-theme');
    if (currentTheme === 'dark') { document.documentElement.classList.add('dark'); }
  </script>
  
  <a href="/" class="cluster-cta" aria-label="View Live Cluster">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
    View Live Cluster
  </a>
  <button id="theme-toggle-btn" class="theme-toggle" aria-label="Toggle theme">
    <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
    <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 0 1 1-9-9Z"/></svg>
  </button>
  <div class="container">
    <div class="page-layout">
      <div class="page-main">
    <div class="breadcrumb"><a href="/">~/portfolio</a> / projects</div>
    <div class="pod-badge"><div class="dot"></div>Served by <code data-live="pod-name">projects-*</code> pod in <code>ns/projects</code></div>
    <h1>Projects</h1>
    <p class="subtitle">
      Featured projects and code repositories. Live stats fetched from
      <a href="https://github.com/${safeUsername}" class="github-link" target="_blank" rel="noopener noreferrer">@${safeUsername}</a>.
    </p>
    <div class="section-title">// GitHub repositories</div>
    <p class="cache-note">Stats cached for 5 minutes to respect GitHub rate limits.</p>
    <div class="repos-grid">
      ${repoCards}
    </div>
      </div>
      ${renderMetricsPanel('projects')}
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

// Health check — MUST be before any wildcard routes
app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

// Main route: fetch repos and render the HTML page
app.get(['/', '/projects', '/projects/'], async (req, res) => {
  try {
    const repos = await fetchGitHubRepos();
    res.setHeader('Content-Type', 'text/html');
    res.send(renderPage(repos));
  } catch (err) {
    console.error('[projects] Error handling request:', err);
    res.status(500).send('Internal server error');
  }
});

// JSON API route: returns raw repo data for debugging
app.get(['/projects/api/repos', '/api/repos'], async (req, res) => {
  try {
    const repos = await fetchGitHubRepos();
    res.json({ repos, cachedAt: new Date(cache.fetchedAt).toISOString() });
  } catch (err) {
    console.error('[projects] API error:', err.message);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[projects] Server listening on port ${PORT}`);
});

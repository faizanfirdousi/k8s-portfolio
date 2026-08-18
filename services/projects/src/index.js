// services/projects/src/index.js
//
// This is the "projects" section service.
// It does two things:
//   1. Calls the GitHub API to get stats (stars, forks, description) for pinned repos
//   2. Renders an HTML page with that data + your project writeups
//
// WHY NODE/EXPRESS HERE AND NOT NGINX?
//   This page needs DYNAMIC data — live GitHub stats change over time.
//   We can't bake them into a static HTML file. We need a server that
//   fetches fresh data on each request (with caching to avoid rate limits).

'use strict';

const express = require('express');
const fetch = require('node-fetch');
const { metricsPanelCss, renderMetricsPanel } = require('./metrics-panel');

const app = express();

// ── Configuration ────────────────────────────────────────────────────────────
// Reading config from environment variables is the Kubernetes way.
// Never hardcode values that change between environments (local vs prod).

const PORT = process.env.PORT || 3000;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'faizanfirdousi';
// Optional: set GITHUB_TOKEN env var (as a K8s Secret) for higher rate limits
// Without a token: 60 requests/hour. With token: 5000 requests/hour.
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
// Cache TTL: how long to keep GitHub API responses before re-fetching.
// 5 minutes = 300,000 milliseconds. This prevents hitting rate limits.
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS || '300000', 10);

// ── In-memory cache ───────────────────────────────────────────────────────────
// Simple cache: { data: [...], fetchedAt: timestamp }
// WHY IN-MEMORY AND NOT REDIS?
//   For v1, this is good enough. The cache lives in the Node process.
//   If the Pod restarts, cache is cleared — but that's fine, it'll re-fetch.
//   Using Redis would add another dependency and another Pod to manage.
let cache = { data: null, fetchedAt: 0 };

// ── GitHub API helper ─────────────────────────────────────────────────────────
async function fetchGitHubRepos() {
  // Check if our cache is still fresh
  const now = Date.now();
  if (cache.data && (now - cache.fetchedAt) < CACHE_TTL_MS) {
    console.log('[projects] Serving from cache');
    return cache.data;
  }

  console.log(`[projects] Fetching repos from GitHub for @${GITHUB_USERNAME}...`);

  // Build the headers for the GitHub API request
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'portfolio-projects-service',
  };
  // If we have a GitHub token, use it (higher rate limits)
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  try {
    // GitHub API: list public repos sorted by recently pushed, limit to 20
    const response = await fetch(
      `https://api.github.com/users/${GITHUB_USERNAME}/repos?type=public&sort=pushed&per_page=20`,
      { headers }
    );

    if (!response.ok) {
      console.error(`[projects] GitHub API error: ${response.status} ${response.statusText}`);
      // Return cached data if available (stale is better than nothing)
      return cache.data || [];
    }

    const repos = await response.json();

    // Filter out forked repos — we want only original work
    // Sort by stars descending — most popular first
    const ownRepos = repos
      .filter(r => !r.fork)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 8); // Show top 8

    // Transform to only what we need — don't expose the full API response
    const data = ownRepos.map(repo => ({
      name: repo.name,
      description: repo.description || 'No description provided.',
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      updatedAt: new Date(repo.pushed_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      }),
    }));

    // Update the cache
    cache = { data, fetchedAt: Date.now() };
    return data;

  } catch (err) {
    console.error('[projects] Failed to fetch from GitHub:', err.message);
    return cache.data || []; // Return stale cache or empty array on error
  }
}

// ── HTML renderer ─────────────────────────────────────────────────────────────
function renderPage(repos) {
  // We build HTML as a template string.
  // In production you'd use a template engine (Handlebars, EJS, etc.)
  // but for our small service, a template string is clear and dependency-free.

  const repoCards = repos.length > 0
    ? repos.map(repo => `
        <div class="repo-card">
          <div class="repo-header">
            <a href="${repo.url}" class="repo-name" target="_blank" rel="noopener">${repo.name}</a>
            <div class="repo-stats">
              ${repo.stars > 0 ? `<span class="stat">⭐ ${repo.stars}</span>` : ''}
              ${repo.forks > 0 ? `<span class="stat">🍴 ${repo.forks}</span>` : ''}
            </div>
          </div>
          <p class="repo-desc">${repo.description}</p>
          <div class="repo-footer">
            ${repo.language ? `<span class="lang-badge">${repo.language}</span>` : ''}
            <span class="updated">Updated ${repo.updatedAt}</span>
          </div>
        </div>
      `).join('')
    : `<p class="no-repos">Could not load repositories. GitHub API may be unavailable.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Faizan Firdousi's GitHub projects and code repositories." />
  <title>Faizan Firdousi | Projects</title>
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
  <button id="theme-toggle-btn" class="theme-toggle" aria-label="Toggle theme">
    <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
    <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 0 1 1-9-9Z"/></svg>
  </button>
  <div class="container">
    <div class="page-layout">
      <div class="page-main">
    <div class="breadcrumb"><span>~/portfolio</span> / projects</div>
    <div class="pod-badge"><div class="dot"></div>Served by <code>projects-*</code> pod in <code>ns/projects</code></div>
    <h1>Projects</h1>
    <p class="subtitle">
      Featured projects and code repositories. Live stats fetched from
      <a href="https://github.com/${GITHUB_USERNAME}" class="github-link" target="_blank">@${GITHUB_USERNAME}</a>.
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
// Kubernetes probes call this directly on the pod (bypassing ingress)
app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

// Main route: fetch repos and render the HTML page
// Handles both /projects (direct) and / (after ingress strips the prefix)
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
    res.status(500).json({ error: err.message });
  }
});

// Health check: Kubernetes probes call this
// IMPORTANT: this must return 200 OK quickly, without external calls.
// That's why we don't call GitHub here — if GitHub is down, our Pod should still be "healthy".
app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  // 0.0.0.0 means listen on ALL network interfaces inside the container.
  // If we listened on 127.0.0.1 (localhost), Kubernetes wouldn't be able to reach us.
  console.log(`[projects] Server listening on port ${PORT}`);
  console.log(`[projects] GitHub username: @${GITHUB_USERNAME}`);
  console.log(`[projects] Cache TTL: ${CACHE_TTL_MS / 1000}s`);
});

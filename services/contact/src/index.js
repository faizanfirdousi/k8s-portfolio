// services/contact/src/index.js
//
// Contact service: serves a contact form and handles form submissions.
//
// Hardened with HTML entity escaping, strict input validation,
// body limits, in-memory rate limiting, and security headers.

'use strict';

const express = require('express');
const { metricsPanelCss, renderMetricsPanel } = require('./metrics-panel');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data: https:;");
  next();
});

// Enforce request body size limits to prevent memory exhaustion / DoS
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));

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

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// In-memory rate limiting for form submissions (5 requests per minute per IP)
const submissionRateMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 5;

// Clean up stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of submissionRateMap.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
      submissionRateMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = submissionRateMap.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 1;
    entry.windowStart = now;
  } else {
    entry.count += 1;
  }
  submissionRateMap.set(ip, entry);
  return entry.count <= MAX_SUBMISSIONS_PER_WINDOW;
}

// ── HTML template ─────────────────────────────────────────────────────────────
function contactPageHtml(errorMessage = '') {
  const errorBanner = errorMessage
    ? `<div style="background:#fee2e2; border:1px solid #ef4444; color:#991b1b; padding:0.75rem 1rem; border-radius:8px; margin-bottom:1.5rem; font-size:0.875rem;">${escapeHtml(errorMessage)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Contact Faizan Firdousi — Cloud Engineer &amp; Go Developer based in Pune, India." />
  <title>Contact | Faizan Firdousi</title>
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
    .subtitle { color: var(--muted); margin-bottom: 2.5rem; }
    .form-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 2rem; }
    .form-group { margin-bottom: 1.25rem; }
    label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.4rem; color: var(--muted); }
    input, textarea {
      width: 100%; padding: 0.75rem 1rem;
      background: var(--bg); border: 1px solid var(--border);
      border-radius: 8px; color: var(--text); font-family: 'Inter', sans-serif;
      font-size: 0.9rem; transition: border-color 0.2s; outline: none;
    }
    input:focus, textarea:focus { border-color: var(--accent); }
    textarea { resize: vertical; min-height: 140px; }
    .submit-btn {
      width: 100%; padding: 0.875rem;
      background: var(--accent); color: white;
      border: none; border-radius: 8px; font-size: 0.95rem;
      font-weight: 600; cursor: pointer; transition: opacity 0.2s;
      font-family: 'Inter', sans-serif;
    }
    .submit-btn:hover { opacity: 0.85; }
    .k8s-note { margin-top: 1.5rem; font-size: 0.78rem; color: var(--muted); font-family: 'JetBrains Mono', monospace; text-align: center; }
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
    <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
  </button>
  <div class="container">
    <div class="page-layout">
      <div class="page-main">
    <div class="breadcrumb"><span>~/portfolio</span> / contact</div>
    <div class="pod-badge"><div class="dot"></div>Served by <code>contact-*</code> pod in <code>ns/contact</code></div>

    <h1>Say hello.</h1>
    <p class="subtitle">
      Interested in connecting, discussing cloud systems, Go development, AI, or collaborating? Drop me a message.
    </p>

    ${errorBanner}

    <div class="form-card">
      <form id="contact-form" method="POST" action="/contact/submit">
        <div class="form-group">
          <label for="name">Name</label>
          <input type="text" id="name" name="name" required maxlength="100" placeholder="Your name" />
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required maxlength="100" placeholder="you@example.com" />
        </div>
        <div class="form-group">
          <label for="message">Message</label>
          <textarea id="message" name="message" required maxlength="2000" placeholder="What's on your mind?"></textarea>
        </div>
        <button type="submit" class="submit-btn" id="submit-btn">Send Message</button>
      </form>
      <p class="k8s-note">
        // This form is handled by a Pod in the <code>contact</code> namespace.<br/>
        // Submissions are logged to stdout: <code>kubectl logs -n contact deploy/contact</code>
      </p>
    </div>
      </div>
      ${renderMetricsPanel('contact')}
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

// Success page shown after a form submission (HTML escaped against XSS)
function successPage(name) {
  const safeName = escapeHtml(name);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Message Sent | Faizan Firdousi</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    :root { --bg: #f8fafc; --accent: #4f46e5; --text: #0f172a; --muted: #64748b; --green: #059669; }
    .dark { --bg: #0a0e1a; --accent: #6366f1; --text: #f1f5f9; --muted: #94a3b8; --green: #10b981; }
    body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { text-align: center; max-width: 400px; padding: 2rem; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
    p { color: var(--muted); margin-bottom: 1.5rem; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <script>
    const currentTheme = localStorage.getItem('portfolio-theme');
    if (currentTheme === 'dark') { document.documentElement.classList.add('dark'); }
  </script>
  <div class="card">
    <div class="icon">✉️</div>
    <h1>Message received!</h1>
    <p>Thanks, ${safeName}. I'll get back to you soon.</p>
    <a href="/contact">← Send another message</a>
  </div>
</body>
</html>`;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check — MUST be before wildcard routes
app.get('/healthz', (req, res) => res.status(200).send('ok'));

// Serve the contact form — handles both /contact (direct) and / (after ingress rewrite)
app.get(['/', '/contact', '/contact/'], (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(contactPageHtml());
});

// Handle form submission — both /contact/submit and /submit (after ingress rewrite)
app.post(['/contact/submit', '/submit'], (req, res) => {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(clientIp)) {
    return res.status(429).send(contactPageHtml('Too many submissions. Please wait a minute before trying again.'));
  }

  const { name, email, message } = req.body || {};

  // Strict input validation
  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
    return res.status(400).send(contactPageHtml('Invalid form payload format.'));
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedMessage = message.trim();

  if (!trimmedName || !trimmedEmail || !trimmedMessage) {
    return res.status(400).send(contactPageHtml('All fields are required.'));
  }

  if (trimmedName.length > 100 || trimmedEmail.length > 100 || trimmedMessage.length > 2000) {
    return res.status(400).send(contactPageHtml('Input exceeds maximum allowed length.'));
  }

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return res.status(400).send(contactPageHtml('Please provide a valid email address.'));
  }

  // Log sanitized structured submission
  console.log(JSON.stringify({
    event: 'contact_form_submission',
    timestamp: new Date().toISOString(),
    name: trimmedName.replace(/[\r\n]/g, ' '),
    email: trimmedEmail.replace(/[\r\n]/g, ' '),
    messageLength: trimmedMessage.length,
    podName: process.env.HOSTNAME || 'local',
  }));

  res.setHeader('Content-Type', 'text/html');
  res.send(successPage(trimmedName));
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(contactPageHtml('Page not found.'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[contact] Server listening on port ${PORT}`);
});


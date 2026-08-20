'use strict';

/**
 * Shared metrics placeholder panel for portfolio section pages.
 * Replace "—" values with live data from Prometheus / the proxy API later.
 */

const COMMON_POD_METRICS = [
  { label: 'CPU', hint: 'Prometheus' },
  { label: 'Memory', hint: 'Prometheus' },
  { label: 'Restarts', hint: 'kube-state-metrics' },
  { label: 'Uptime', hint: 'Prometheus' },
];

const SECTIONS = {
  about: {
    namespace: 'about',
    podPrefix: 'about',
    serviceName: 'about-svc',
    serviceMetrics: [
      { label: 'Requests/s', hint: 'Traefik' },
      { label: 'P99 Latency', hint: 'Prometheus' },
      { label: 'Bytes Out', hint: 'Prometheus' },
    ],
    extraMetrics: [
      { label: 'Static Assets', hint: 'Nginx' },
      { label: 'Cache Hit Rate', hint: 'Nginx' },
    ],
  },
  projects: {
    namespace: 'projects',
    podPrefix: 'projects',
    serviceName: 'projects-svc',
    serviceMetrics: [
      { label: 'Requests/s', hint: 'Traefik' },
      { label: 'P99 Latency', hint: 'Prometheus' },
      { label: 'Error Rate', hint: 'Prometheus' },
    ],
    extraMetrics: [
      { label: 'GitHub API Latency', hint: 'Custom' },
      { label: 'Cache Hit Rate', hint: 'In-process' },
      { label: 'Rate Limit Left', hint: 'GitHub API' },
    ],
  },
  blog: {
    namespace: 'blog',
    podPrefix: 'blog',
    serviceName: 'blog-svc',
    serviceMetrics: [
      { label: 'Requests/s', hint: 'Traefik' },
      { label: 'P99 Latency', hint: 'Prometheus' },
      { label: 'Error Rate', hint: 'Prometheus' },
    ],
    extraMetrics: [
      { label: 'Posts Loaded', hint: 'Startup' },
      { label: 'Render Time', hint: 'Custom' },
      { label: 'Markdown Cache', hint: 'In-memory' },
    ],
  },
  contact: {
    namespace: 'contact',
    podPrefix: 'contact',
    serviceName: 'contact-svc',
    serviceMetrics: [
      { label: 'Requests/s', hint: 'Traefik' },
      { label: 'P99 Latency', hint: 'Prometheus' },
      { label: 'Error Rate', hint: 'Prometheus' },
    ],
    extraMetrics: [
      { label: 'Form Submissions', hint: 'stdout / Loki' },
      { label: 'POST /submit', hint: 'Custom' },
      { label: 'Validation Errors', hint: 'Custom' },
    ],
  },
  skills: {
    namespace: 'skills',
    podPrefix: 'skills',
    serviceName: 'skills-svc',
    serviceMetrics: [
      { label: 'Requests/s', hint: 'Traefik' },
      { label: 'P99 Latency', hint: 'Prometheus' },
      { label: 'Error Rate', hint: 'Prometheus' },
    ],
    extraMetrics: [
      { label: 'Skills Loaded', hint: 'Startup' },
      { label: 'Render Time', hint: 'Custom' },
      { label: 'Asset Cache', hint: 'Nginx' },
    ],
  },
};

function metricSlot(label, hint) {
  return `
    <div class="metric-slot" data-metric="${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">
      <span class="metric-slot__label">${label}</span>
      <span class="metric-slot__value">—</span>
      <span class="metric-slot__hint">${hint}</span>
    </div>`;
}

function metricsPanelCss() {
  return `
    .page-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
      align-items: start;
    }
    @media (min-width: 960px) {
      .page-layout { grid-template-columns: 1fr 280px; }
      .metrics-panel { position: sticky; top: 1.5rem; }
    }
    .metrics-panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem;
    }
    .metrics-panel__title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent2);
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }
    .metrics-panel__title:not(:first-child) { margin-top: 1rem; }
    .metrics-panel__info {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 0.5rem;
      font-size: 0.75rem;
    }
    .metrics-panel__info-row {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .metrics-panel__info-row .label { color: var(--muted); }
    .metrics-panel__info-row .value {
      font-family: 'JetBrains Mono', monospace;
      color: var(--text);
      text-align: right;
      word-break: break-all;
    }
    .metrics-panel__info-row .value.accent { color: var(--green); }
    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.45rem;
    }
    .metric-slot {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.45rem 0.35rem;
      border-radius: 8px;
      border: 1px dashed var(--border);
      background: rgba(255, 255, 255, 0.02);
      text-align: center;
    }
    .metric-slot__label {
      font-size: 0.6rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .metric-slot__value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      color: var(--muted);
      margin: 0.15rem 0;
    }
    .metric-slot__hint {
      font-size: 0.55rem;
      color: var(--muted);
    }
    .metrics-panel__footer {
      margin-top: 0.85rem;
      padding-top: 0.65rem;
      border-top: 1px dashed var(--border);
      font-size: 0.62rem;
      color: var(--muted);
      font-family: 'JetBrains Mono', monospace;
      text-align: center;
    }

    @media (max-width: 640px) {
      .container { padding: 1rem 0.85rem; }
      .breadcrumb { margin-bottom: 1.25rem; word-break: break-all; }
      .pod-badge { margin-bottom: 1.25rem; max-width: 100%; flex-wrap: wrap; }
      .subtitle, .page-subtitle { margin-bottom: 1.5rem; font-size: 0.9rem; }
      .repos-grid { grid-template-columns: 1fr; }
      .repo-header { flex-direction: column; align-items: flex-start; }
      .repo-footer { flex-direction: column; align-items: flex-start; gap: 0.35rem; }
      .skills-grid { grid-template-columns: 1fr; }
      .socials { justify-content: center; }
      .hero h1, .page-title { font-size: clamp(1.5rem, 7vw, 2.25rem); }
      .form-card { padding: 1.25rem; }
      .post-card { padding: 1rem; }
      .timeline-item { gap: 0.75rem; }
      .about-text { padding: 1.25rem; }
      .metrics-grid { grid-template-columns: 1fr 1fr; }
      .metric-slot__hint { display: none; }
      .metrics-panel__info-row { flex-direction: column; align-items: flex-start; gap: 0.15rem; }
      .metrics-panel__info-row .value { text-align: left; }
    }

    @media (max-width: 400px) {
      .metrics-grid { grid-template-columns: 1fr; }
    }`;
}

function renderMetricsPanel(sectionKey, options = {}) {
  const config = SECTIONS[sectionKey];
  if (!config) return '';

  const podName = options.podName || process.env.HOSTNAME || `${config.podPrefix}-*`;
  const status = options.status || 'Running';

  const podMetrics = COMMON_POD_METRICS.map((m) => metricSlot(m.label, m.hint)).join('');
  const svcMetrics = config.serviceMetrics.map((m) => metricSlot(m.label, m.hint)).join('');
  const extraMetrics = config.extraMetrics.map((m) => metricSlot(m.label, m.hint)).join('');

  return `
    <aside class="metrics-panel" aria-label="Pod and service metrics" data-namespace="${config.namespace}">
      <div class="metrics-panel__title">// Pod info</div>
      <div class="metrics-panel__info">
        <div class="metrics-panel__info-row">
          <span class="label">Namespace</span>
          <span class="value">${config.namespace}</span>
        </div>
        <div class="metrics-panel__info-row">
          <span class="label">Pod</span>
          <span class="value accent" data-live="pod-name">${podName}</span>
        </div>
        <div class="metrics-panel__info-row">
          <span class="label">Status</span>
          <span class="value accent" data-live="pod-status">${status}</span>
        </div>
        <div class="metrics-panel__info-row">
          <span class="label">Service</span>
          <span class="value">${config.serviceName}</span>
        </div>
      </div>

      <div class="metrics-panel__title">// Pod metrics</div>
      <div class="metrics-grid">${podMetrics}</div>

      <div class="metrics-panel__title">// Service metrics</div>
      <div class="metrics-grid">${svcMetrics}</div>

      <div class="metrics-panel__title">// ${sectionKey} metrics</div>
      <div class="metrics-grid">${extraMetrics}</div>

      <div class="metrics-panel__footer">Pod data live · CPU/Memory in Phase 2</div>
    </aside>${metricsLiveScript()}`;
}

/** Static HTML version for the nginx about page (no process.env). */
function renderMetricsPanelHtml(sectionKey, podName) {
  const config = SECTIONS[sectionKey];
  if (!config) return '';

  const name = podName || `${config.podPrefix}-*`;
  const podMetrics = COMMON_POD_METRICS.map((m) => metricSlot(m.label, m.hint)).join('');
  const svcMetrics = config.serviceMetrics.map((m) => metricSlot(m.label, m.hint)).join('');
  const extraMetrics = config.extraMetrics.map((m) => metricSlot(m.label, m.hint)).join('');

  return `
    <aside class="metrics-panel" aria-label="Pod and service metrics" data-namespace="${config.namespace}">
      <div class="metrics-panel__title">// Pod info</div>
      <div class="metrics-panel__info">
        <div class="metrics-panel__info-row">
          <span class="label">Namespace</span>
          <span class="value">${config.namespace}</span>
        </div>
        <div class="metrics-panel__info-row">
          <span class="label">Pod</span>
          <span class="value accent" data-live="pod-name">${name}</span>
        </div>
        <div class="metrics-panel__info-row">
          <span class="label">Status</span>
          <span class="value accent" data-live="pod-status">Running</span>
        </div>
        <div class="metrics-panel__info-row">
          <span class="label">Service</span>
          <span class="value">${config.serviceName}</span>
        </div>
      </div>
      <div class="metrics-panel__title">// Pod metrics</div>
      <div class="metrics-grid">${podMetrics}</div>
      <div class="metrics-panel__title">// Service metrics</div>
      <div class="metrics-grid">${svcMetrics}</div>
      <div class="metrics-panel__title">// ${sectionKey} metrics</div>
      <div class="metrics-grid">${extraMetrics}</div>
      <div class="metrics-panel__footer">Pod data live · CPU/Memory in Phase 2</div>
    </aside>${metricsLiveScript()}`;
}

/**
 * Client-side script that fetches /api/topology and populates live data
 * into the metrics panel. Injected once per page via the render functions.
 */
function metricsLiveScript() {
  return `
    <script>
    (function() {
      var panel = document.querySelector('.metrics-panel[data-namespace]');
      if (!panel) return;
      var ns = panel.getAttribute('data-namespace');

      function update() {
        fetch('/api/topology')
          .then(function(r) { return r.ok ? r.json() : null; })
          .then(function(data) {
            if (!data || !data.pods) return;
            var pod = data.pods.find(function(p) { return p.namespace === ns; });
            if (!pod) return;

            // Pod info
            var nameEl = panel.querySelector('[data-live="pod-name"]');
            var statusEl = panel.querySelector('[data-live="pod-status"]');
            if (nameEl) nameEl.textContent = pod.name;
            if (statusEl) {
              statusEl.textContent = pod.status;
              statusEl.className = 'value ' + (pod.status === 'Running' ? 'accent' : '');
            }

            // Pod metrics slots
            var slots = panel.querySelectorAll('.metric-slot');
            slots.forEach(function(slot) {
              var label = slot.querySelector('.metric-slot__label');
              var value = slot.querySelector('.metric-slot__value');
              if (!label || !value) return;
              var key = label.textContent.trim().toLowerCase();
              if (key === 'restarts') {
                value.textContent = pod.restarts;
                value.style.color = pod.restarts > 0 ? '#f97316' : '';
              } else if (key === 'uptime') {
                value.textContent = pod.age || '—';
              }
            });
          })
          .catch(function() { /* silent */ });
      }

      update();
      setInterval(update, 10000);
    })();
    <\/script>`;
}

module.exports = {
  metricsPanelCss,
  renderMetricsPanel,
  renderMetricsPanelHtml,
  metricsLiveScript,
  SECTIONS,
};

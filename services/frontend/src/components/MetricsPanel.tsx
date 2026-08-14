import MetricPlaceholder from './MetricPlaceholder';
import type { TopologyData } from '../hooks/useTopology';

interface MetricsPanelProps {
  data: TopologyData | null;
  error: string | null;
  lastUpdated: Date | null;
}

const PLACEHOLDER_EVENTS = [
  { dot: 'green', text: 'Pod frontend-* ready' },
  { dot: 'blue', text: 'Ingress route synced' },
  { dot: 'yellow', text: 'Metrics pipeline pending' },
  { dot: 'purple', text: 'Proxy connected to API' },
];

export default function MetricsPanel({ data, error, lastUpdated }: MetricsPanelProps) {
  const runningPods = data?.pods.filter((p) => p.status === 'Running').length ?? 0;
  const readyNodes = data?.nodes.filter((n) => n.status === 'Ready').length ?? 0;

  return (
    <aside className="dash-metrics">
      <section className="dash-metrics__card glass-panel">
        <h3 className="dash-metrics__title">Cluster Details</h3>
        <dl className="dash-metrics__list">
          <div className="dash-metrics__row">
            <dt>Cluster Name</dt>
            <dd className="mono">portfolio-cluster</dd>
          </div>
          <div className="dash-metrics__row">
            <dt>Kubernetes Version</dt>
            <dd className="mono">v1.29.2+k3s1</dd>
          </div>
          <div className="dash-metrics__row">
            <dt>Nodes</dt>
            <dd className="mono accent">{data ? `${readyNodes} Ready` : '—'}</dd>
          </div>
          <div className="dash-metrics__row">
            <dt>Namespaces</dt>
            <dd className="mono">6</dd>
          </div>
          <div className="dash-metrics__row">
            <dt>Total Pods</dt>
            <dd className="mono">{data ? data.pods.length : '—'}</dd>
          </div>
          <div className="dash-metrics__row">
            <dt>Status</dt>
            <dd className={`mono ${error ? 'warn' : 'accent'}`}>
              {error ? 'Degraded' : data ? 'Healthy' : 'Connecting…'}
            </dd>
          </div>
        </dl>

        <div className="dash-metrics__placeholders">
          <MetricPlaceholder label="Cluster CPU" hint="Prometheus" />
          <MetricPlaceholder label="Cluster Memory" hint="Prometheus" />
          <MetricPlaceholder label="Network I/O" hint="Prometheus" />
        </div>
      </section>

      <section className="dash-metrics__card glass-panel">
        <h3 className="dash-metrics__title">Live Activity</h3>
        <ul className="dash-metrics__activity">
          {data ? (
            data.pods.slice(0, 4).map((pod) => (
              <li key={pod.name}>
                <span className={`activity-dot activity-dot--${pod.status === 'Running' ? 'green' : 'yellow'}`} />
                <span>
                  Pod <span className="mono">{pod.name.slice(0, 20)}</span> — {pod.status}
                </span>
              </li>
            ))
          ) : (
            PLACEHOLDER_EVENTS.map((evt) => (
              <li key={evt.text}>
                <span className={`activity-dot activity-dot--${evt.dot}`} />
                <span>{evt.text}</span>
              </li>
            ))
          )}
        </ul>
        <div className="metric-slot-grid">
          <div className="metric-slot">
            <span className="metric-slot__label">Events/min</span>
            <span className="metric-slot__placeholder">—</span>
          </div>
          <div className="metric-slot">
            <span className="metric-slot__label">Restarts (24h)</span>
            <span className="metric-slot__placeholder">—</span>
          </div>
        </div>
      </section>

      <section className="dash-metrics__card glass-panel dash-metrics__terminal">
        <div className="dash-metrics__terminal-header">
          <span className="mono">kubectl get pods -A</span>
        </div>
        <div className="dash-metrics__terminal-body mono">
          <div className="terminal-row terminal-row--head">
            <span>NAMESPACE</span>
            <span>NAME</span>
            <span>READY</span>
            <span>STATUS</span>
          </div>
          {data ? (
            data.pods.map((pod) => (
              <div key={pod.name} className="terminal-row">
                <span>{pod.namespace}</span>
                <span>{pod.name.slice(0, 18)}</span>
                <span>1/1</span>
                <span className={pod.status === 'Running' ? 'accent' : 'warn'}>
                  {pod.status}
                </span>
              </div>
            ))
          ) : (
            <>
              <div className="terminal-row terminal-row--placeholder">
                <span>frontend</span><span>frontend-*</span><span>—/—</span><span>—</span>
              </div>
              <div className="terminal-row terminal-row--placeholder">
                <span>about</span><span>about-*</span><span>—/—</span><span>—</span>
              </div>
              <div className="terminal-row terminal-row--placeholder">
                <span>proxy</span><span>proxy-*</span><span>—/—</span><span>—</span>
              </div>
            </>
          )}
        </div>
        <div className="dash-metrics__terminal-stats">
          <span>{runningPods > 0 ? `${runningPods} running` : '— running'}</span>
          <span>Updates every 5s</span>
        </div>
      </section>

      <footer className="dash-metrics__footer">
        <span>Cluster updates every 5s</span>
        {lastUpdated && (
          <span className="mono">Last sync {lastUpdated.toLocaleTimeString()}</span>
        )}
        <span>Built with ♥ on Kubernetes</span>
      </footer>
    </aside>
  );
}

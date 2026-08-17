import type { TopologyData } from '../hooks/useTopology';
import type { ClusterEvent, PodRef } from '../types/topology';

interface MetricsPanelProps {
  data: TopologyData | null;
  error: string | null;
  lastUpdated: Date | null;
  events: ClusterEvent[];
  onPodClick: (ref: PodRef) => void;
}

function eventDotColor(type: string) {
  if (type === 'Warning') return 'yellow';
  if (type === 'Normal') return 'green';
  return 'blue';
}

export default function MetricsPanel({ data, error, lastUpdated, events, onPodClick }: MetricsPanelProps) {
  const runningPods = data?.pods.filter((p) => p.status === 'Running').length ?? 0;
  const readyNodes = data?.nodes.filter((n) => n.status === 'Ready').length ?? 0;
  const namespaceCount = data ? new Set(data.pods.map((p) => p.namespace)).size : 0;
  const totalRestarts = data?.pods.reduce((sum, p) => sum + p.restarts, 0) ?? 0;

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
            <dd className="mono">{data?.clusterVersion ?? '—'}</dd>
          </div>
          <div className="dash-metrics__row">
            <dt>Nodes</dt>
            <dd className="mono accent">{data ? `${readyNodes} Ready` : '—'}</dd>
          </div>
          <div className="dash-metrics__row">
            <dt>Namespaces</dt>
            <dd className="mono">{data ? namespaceCount : '—'}</dd>
          </div>
          <div className="dash-metrics__row">
            <dt>Total Pods</dt>
            <dd className="mono">{data ? data.pods.length : '—'}</dd>
          </div>
          <div className="dash-metrics__row">
            <dt>Total Restarts</dt>
            <dd className={`mono ${totalRestarts > 0 ? 'warn' : ''}`}>
              {data ? totalRestarts : '—'}
            </dd>
          </div>
          <div className="dash-metrics__row">
            <dt>Status</dt>
            <dd className={`mono ${error ? 'warn' : 'accent'}`}>
              {error ? 'Degraded' : data ? 'Healthy' : 'Connecting…'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="dash-metrics__card glass-panel">
        <h3 className="dash-metrics__title">Live Activity</h3>
        <ul className="dash-metrics__activity">
          {events.length > 0 ? (
            events.slice(0, 5).map((evt, i) => (
              <li key={`${evt.reason}-${evt.lastSeen}-${i}`}>
                <span className={`activity-dot activity-dot--${eventDotColor(evt.type)}`} />
                <span>
                  <span className="mono">{evt.reason}</span>
                  {' — '}
                  {evt.message.length > 50 ? evt.message.slice(0, 50) + '…' : evt.message}
                  <span className="dash-metrics__activity-age"> · {evt.age}</span>
                </span>
              </li>
            ))
          ) : data ? (
            data.pods.slice(0, 4).map((pod) => (
              <li key={pod.name}>
                <span className={`activity-dot activity-dot--${pod.status === 'Running' ? 'green' : 'yellow'}`} />
                <span>
                  Pod <span className="mono">{pod.name.slice(0, 20)}</span> — {pod.status}
                </span>
              </li>
            ))
          ) : (
            <li>
              <span className="activity-dot activity-dot--blue" />
              <span>Waiting for cluster events…</span>
            </li>
          )}
        </ul>
        <div className="metric-slot-grid">
          <div className="metric-slot">
            <span className="metric-slot__label">Events</span>
            <span className="metric-slot__value mono">{events.length > 0 ? events.length : '—'}</span>
          </div>
          <div className="metric-slot">
            <span className="metric-slot__label">Restarts</span>
            <span className={`metric-slot__value mono ${totalRestarts > 0 ? 'warn' : ''}`}>
              {data ? totalRestarts : '—'}
            </span>
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
            <span className="terminal-col--extra">RESTARTS</span>
            <span className="terminal-col--extra">AGE</span>
          </div>
          {data ? (
            data.pods.map((pod) => (
              <div
                key={pod.name}
                className="terminal-row terminal-row--clickable"
                onClick={() => onPodClick({ namespace: pod.namespace, name: pod.name })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onPodClick({ namespace: pod.namespace, name: pod.name });
                  }
                }}
              >
                <span>{pod.namespace}</span>
                <span title={pod.name}>{pod.name.length > 18 ? pod.name.slice(0, 16) + '…' : pod.name}</span>
                <span>{pod.ready}</span>
                <span className={pod.status === 'Running' ? 'accent' : 'warn'}>
                  {pod.status}
                </span>
                <span className={`terminal-col--extra ${pod.restarts > 0 ? 'warn' : ''}`}>
                  {pod.restarts}
                </span>
                <span className="terminal-col--extra">{pod.age}</span>
              </div>
            ))
          ) : (
            <>
              <div className="terminal-row terminal-row--placeholder">
                <span>frontend</span><span>frontend-*</span><span>—/—</span><span>—</span>
                <span className="terminal-col--extra">—</span><span className="terminal-col--extra">—</span>
              </div>
              <div className="terminal-row terminal-row--placeholder">
                <span>about</span><span>about-*</span><span>—/—</span><span>—</span>
                <span className="terminal-col--extra">—</span><span className="terminal-col--extra">—</span>
              </div>
              <div className="terminal-row terminal-row--placeholder">
                <span>proxy</span><span>proxy-*</span><span>—/—</span><span>—</span>
                <span className="terminal-col--extra">—</span><span className="terminal-col--extra">—</span>
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

import { X } from 'lucide-react';
import type { PodDetailData, PodRef } from '../types/topology';

interface PodDetailDrawerProps {
  selected: PodRef | null;
  detail: PodDetailData | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

function eventDotClass(type: string) {
  if (type === 'Warning') return 'yellow';
  if (type === 'Normal') return 'green';
  return 'blue';
}

export default function PodDetailDrawer({
  selected,
  detail,
  loading,
  error,
  onClose,
}: PodDetailDrawerProps) {
  if (!selected) return null;

  return (
    <>
      <div className="pod-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="pod-drawer glass-panel" aria-label="Pod details">
        <header className="pod-drawer__header">
          <div>
            <p className="pod-drawer__eyebrow mono">Pod details</p>
            <h2 className="pod-drawer__title mono">{selected.name}</h2>
            <p className="pod-drawer__subtitle">
              {selected.namespace} · {detail?.node || '—'}
            </p>
          </div>
          <button type="button" className="pod-drawer__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        {loading && !detail && (
          <p className="pod-drawer__status">Loading pod details…</p>
        )}

        {error && (
          <p className="pod-drawer__status warn">Failed to load: {error}</p>
        )}

        {detail && (
          <div className="pod-drawer__body">
            <section className="pod-drawer__section">
              <h3>Overview</h3>
              <dl className="pod-drawer__grid">
                <div><dt>Status</dt><dd className={detail.status === 'Running' ? 'accent' : 'warn'}>{detail.status}</dd></div>
                <div><dt>Ready</dt><dd className="mono">{detail.ready}</dd></div>
                <div><dt>Restarts</dt><dd className="mono">{detail.restarts}</dd></div>
                <div><dt>Age</dt><dd className="mono">{detail.age}</dd></div>
                <div><dt>Node</dt><dd className="mono">{detail.node || '—'}</dd></div>
                <div><dt>Started</dt><dd className="mono">{detail.startedAt ? new Date(detail.startedAt).toLocaleString() : '—'}</dd></div>
              </dl>
            </section>

            {(detail.resourceRequests || detail.resourceLimits) && (
              <section className="pod-drawer__section">
                <h3>Resources</h3>
                <dl className="pod-drawer__grid">
                  {detail.resourceRequests && (
                    <>
                      <div><dt>CPU request</dt><dd className="mono">{detail.resourceRequests.cpu || '—'}</dd></div>
                      <div><dt>Memory request</dt><dd className="mono">{detail.resourceRequests.memory || '—'}</dd></div>
                    </>
                  )}
                  {detail.resourceLimits && (
                    <>
                      <div><dt>CPU limit</dt><dd className="mono">{detail.resourceLimits.cpu || '—'}</dd></div>
                      <div><dt>Memory limit</dt><dd className="mono">{detail.resourceLimits.memory || '—'}</dd></div>
                    </>
                  )}
                </dl>
              </section>
            )}

            <section className="pod-drawer__section">
              <h3>Containers ({detail.containers.length})</h3>
              <ul className="pod-drawer__containers">
                {detail.containers.map((container) => (
                  <li key={container.name} className="pod-drawer__container">
                    <div className="pod-drawer__container-head">
                      <span className="mono">{container.name}</span>
                      <span className={container.ready ? 'accent' : 'warn'}>
                        {container.ready ? 'Ready' : container.state}
                      </span>
                    </div>
                    {container.image && (
                      <p className="pod-drawer__container-image mono">{container.image}</p>
                    )}
                    <p className="pod-drawer__container-meta mono">
                      Restarts: {container.restarts} · State: {container.state}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="pod-drawer__section">
              <h3>Recent events</h3>
              {detail.events.length === 0 ? (
                <p className="pod-drawer__empty">No recent events for this pod.</p>
              ) : (
                <ul className="pod-drawer__events">
                  {detail.events.map((event, index) => (
                    <li key={`${event.reason}-${event.lastSeen}-${index}`}>
                      <span className={`activity-dot activity-dot--${eventDotClass(event.type)}`} />
                      <div>
                        <span className="mono">{event.reason}</span>
                        <span className="pod-drawer__event-meta"> · {event.age} ago</span>
                        <p>{event.message}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </aside>
    </>
  );
}

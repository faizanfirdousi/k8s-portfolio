import type { TopologyData } from '../hooks/useTopology';
import type { ClusterEvent, PodRef } from '../types/topology';
import type { PageMetrics } from '../hooks/usePageMetrics';
import { cn } from '@/lib/utils';

interface MetricsPanelProps {
  data: TopologyData | null;
  error: string | null;
  lastUpdated: Date | null;
  events: ClusterEvent[];
  onPodClick: (ref: PodRef) => void;
  pageMetrics: PageMetrics;
  topologyResponseMs: number | null;
}

function formatMilliseconds(value: number | null) {
  if (value === null) return 'Measuring…';
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${value} ms`;
}

export default function MetricsPanel({
  data,
  error,
  lastUpdated,
  events,
  onPodClick,
  pageMetrics,
  topologyResponseMs,
}: MetricsPanelProps) {
  const runningPods = data?.pods.filter((p) => p.status === 'Running').length ?? 0;
  const readyNodes = data?.nodes.filter((n) => n.status === 'Ready').length ?? 0;
  const namespaceCount = data ? new Set(data.pods.map((p) => p.namespace)).size : 0;
  const totalRestarts = data?.pods.reduce((sum, p) => sum + p.restarts, 0) ?? 0;
  return (
    <aside className="flex w-full flex-col gap-4 border-t-2 border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900 xl:w-80 xl:shrink-0 xl:overflow-y-auto xl:border-l xl:border-t-0 2xl:w-96">
      <section className="rounded-2xl border-2 border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          Cluster Info
        </h3>
        <dl className="space-y-2 text-sm">
          {[
            { label: 'Kubernetes', value: data?.clusterVersion ?? '—', accent: true },
            { label: 'Cloud', value: 'k3s (local)' },
            { label: 'Region', value: 'Home Lab' },
            {
              label: 'Status',
              value: error ? 'Degraded' : data ? 'Healthy' : 'Connecting',
            },
          ].map(({ label, value, accent }) => (
            <div key={label} className="flex justify-between gap-2">
              <dt className="text-zinc-700">{label}</dt>
              <dd className={cn('mono font-medium', accent && 'text-indigo-600')}>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { label: 'Nodes', value: readyNodes, color: 'text-green-600' },
            { label: 'Pods', value: data?.pods.length ?? '—', color: 'text-blue-600' },
            { label: 'Namespaces', value: namespaceCount, color: 'text-purple-600' },
            { label: 'Restarts', value: totalRestarts, color: totalRestarts > 0 ? 'text-amber-600' : '' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <div className={cn('text-lg font-bold', color)}>{value}</div>
              <div className="text-[10px] uppercase text-zinc-600">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
        <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">Request delivery</h3>
        <p className="mb-3 text-xs text-zinc-700">Measured in this browser for your visit.</p>
        <dl className="space-y-2 text-sm">
          {[
            { label: 'Page loaded', value: formatMilliseconds(pageMetrics.loadMs) },
            { label: 'Server response', value: formatMilliseconds(pageMetrics.ttfbMs) },
            { label: 'Cluster API fetch', value: formatMilliseconds(topologyResponseMs) },
            { label: 'Snapshot age', value: lastUpdated ? 'Live · ≤ 5 s' : 'Waiting' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-3 border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
              <dt className="text-zinc-700">{label}</dt>
              <dd className="mono text-right text-xs font-semibold text-zinc-800">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border-2 border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">Live Activity</h3>
        <ul className="max-h-48 space-y-2 overflow-y-auto">
          {(events.length > 0 ? events.slice(0, 6) : data?.pods.slice(0, 5) ?? []).map((item, i) => {
            const isEvent = 'reason' in item;
            return (
              <li
                key={isEvent ? `${item.reason}-${i}` : item.name}
                className="flex items-start gap-2 rounded-lg bg-zinc-50 p-2 text-xs"
              >
                <span
                  className={cn(
                    'mt-1 h-2 w-2 shrink-0 rounded-full',
                    isEvent
                      ? item.type === 'Warning'
                        ? 'bg-amber-400'
                        : 'bg-green-500'
                      : item.status === 'Running'
                        ? 'bg-green-500'
                        : 'bg-amber-400',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="mono truncate font-medium">
                    {isEvent ? item.reason : item.name.slice(0, 20)}
                  </p>
                  <p className="truncate text-zinc-400">
                    {isEvent ? item.message.slice(0, 40) : `ns/${item.namespace}`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border-2 border-zinc-900 bg-zinc-900 p-3 text-white shadow-[4px_4px_0_0_#6366f1]">
        <div className="mb-2 flex items-center gap-2 border-b border-zinc-700 pb-2">
          <div className="flex gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <span className="mono text-[10px] text-zinc-400">kubectl get pods -A</span>
        </div>
        <div className="mono max-h-56 overflow-y-auto text-[10px]">
          <div className="grid grid-cols-3 gap-1 border-b border-zinc-700 pb-1 font-bold text-zinc-400">
            <span>NS</span><span>NAME</span><span>STATUS</span>
          </div>
          {data ? (
            data.pods.map((pod) => (
              <button
                key={pod.name}
                type="button"
                className="grid w-full grid-cols-3 gap-1 border-b border-zinc-800 py-1.5 text-left transition-colors hover:bg-zinc-800"
                onClick={() => onPodClick({ namespace: pod.namespace, name: pod.name })}
              >
                <span className="truncate">{pod.namespace}</span>
                <span className="truncate">{pod.name.slice(0, 14)}</span>
                <span className={pod.status === 'Running' ? 'text-green-400' : 'text-amber-400'}>
                  {pod.status}
                </span>
              </button>
            ))
          ) : (
            <p className="py-4 text-center text-zinc-500">Waiting for cluster…</p>
          )}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-zinc-500">
          <span>{runningPods} running</span>
          <span>↻ 5s</span>
        </div>
      </section>

      <footer className="text-center text-[10px] text-zinc-400">
        {lastUpdated && <p>Last sync {lastUpdated.toLocaleTimeString()}</p>}
        <p>Built on Kubernetes ♥</p>
      </footer>
    </aside>
  );
}

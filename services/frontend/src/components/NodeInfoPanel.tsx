import { useState, useEffect } from 'react';
import type { PortfolioRoute } from '../config/portfolioRoutes';
import type { TopologyPod } from '../hooks/useTopology';
import { Button } from '@/components/ui/button';
import { X, Cpu, Database, Zap } from 'lucide-react';

interface NodeInfoPanelProps {
  route: PortfolioRoute;
  pod?: TopologyPod;
  onClose: () => void;
}

interface PodLiveMetrics {
  cpuUsageCores: string;
  memoryUsageBytes: string;
  fetchedAt: string;
}

function formatCpuCores(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n) || n === 0) return '—';
  if (n < 0.001) return '<1m';
  if (n < 1) return `${Math.round(n * 1000)}m`;
  return `${n.toFixed(3)}`;
}

function formatMemBytes(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n) || n === 0) return '—';
  const mb = n / (1024 * 1024);
  if (mb > 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${Math.round(mb)} MB`;
}

export default function NodeInfoPanel({ route, pod, onClose }: NodeInfoPanelProps) {
  const isRunning = pod?.status === 'Running';
  const [liveMetrics, setLiveMetrics] = useState<PodLiveMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  useEffect(() => {
    if (!pod) return;
    let mounted = true;

    const fetchLive = async () => {
      setMetricsLoading(true);
      try {
        const res = await fetch(`/api/pods/${pod.namespace}/${pod.name}/metrics`);
        if (res.ok && mounted) {
          const data: PodLiveMetrics = await res.json();
          setLiveMetrics(data);
        }
      } catch {
        // silently ignore — metrics are best-effort
      } finally {
        if (mounted) setMetricsLoading(false);
      }
    };

    fetchLive();
    const id = setInterval(fetchLive, 10_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [pod?.namespace, pod?.name]);

  return (
    <div
      className="pointer-events-auto absolute bottom-6 left-1/2 z-20 w-[min(420px,92vw)] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="rounded-2xl border-2 border-zinc-900 bg-white p-4 shadow-[6px_6px_0_0_#18181b]">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <div className="mono text-sm font-bold text-indigo-600">{route.route}</div>
            <div className="text-xs text-zinc-500">namespace / {route.namespace}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </Button>
        </div>

        {/* Status + pod name */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isRunning ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isRunning ? 'bg-green-500' : 'bg-amber-500'}`} />
            {pod?.status ?? 'No pod data'}
          </span>
          {pod && (
            <span className="mono truncate text-[11px] text-zinc-500" title={pod.name}>
              {pod.name}
            </span>
          )}
        </div>

        {/* K8s metadata grid */}
        <div className="mb-3 grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 p-2 text-center">
          {[
            { label: 'Ready', value: pod?.ready ?? '—/—' },
            { label: 'Restarts', value: pod !== undefined ? String(pod.restarts) : '—' },
            { label: 'Age', value: pod?.age ?? '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-[10px] uppercase text-zinc-400">{label}</div>
              <div className="mono text-sm font-semibold">{value}</div>
            </div>
          ))}
        </div>

        {/* Live cAdvisor metrics */}
        <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <Zap size={11} className="text-yellow-500" />
            Live Usage
            {metricsLoading && (
              <span className="ml-1 inline-block h-1.5 w-1.5 animate-ping rounded-full bg-zinc-400" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <Cpu size={13} />
              </div>
              <div>
                <div className="text-[10px] text-zinc-400">CPU</div>
                <div className="mono text-sm font-bold text-zinc-900">
                  {liveMetrics ? formatCpuCores(liveMetrics.cpuUsageCores) : '—'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Database size={13} />
              </div>
              <div>
                <div className="text-[10px] text-zinc-400">Memory</div>
                <div className="mono text-sm font-bold text-zinc-900">
                  {liveMetrics ? formatMemBytes(liveMetrics.memoryUsageBytes) : '—'}
                </div>
              </div>
            </div>
          </div>
          {pod?.resourceRequests && (
            <div className="mt-2 flex gap-3 text-[10px] text-zinc-400">
              <span>Req: {pod.resourceRequests.cpu ?? '—'} CPU / {formatMemBytes(pod.resourceRequests.memory ?? '0')}</span>
            </div>
          )}
        </div>

        <p className="mb-4 text-xs leading-relaxed text-zinc-500">{route.description}</p>

        <a
          href={route.href}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border-2 border-indigo-700 bg-indigo-600 text-sm font-semibold text-white shadow-[3px_3px_0_0_#312e81] transition-all hover:bg-indigo-500 active:scale-[0.98]"
        >
          Open {route.route} →
        </a>
      </div>
    </div>
  );
}

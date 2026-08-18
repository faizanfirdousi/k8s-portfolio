import type { TopologyPod } from '../hooks/useTopology';
import type { PodRef } from '../types/topology';
import { ROUTE_BY_NAMESPACE } from '../config/portfolioRoutes';
import { cn } from '@/lib/utils';

interface ClusterArchitectureProps {
  pods: TopologyPod[];
  onPodClick: (ref: PodRef) => void;
}

const SECTIONS = ['about', 'projects', 'skills', 'blog', 'contact'] as const;

function PodCard({
  ns,
  pod,
  highlighted,
  onPodClick,
}: {
  ns: string;
  pod?: TopologyPod;
  highlighted?: boolean;
  onPodClick: (ref: PodRef) => void;
}) {
  const color = ROUTE_BY_NAMESPACE[ns]?.color ?? '#6366f1';
  const status = pod?.status ?? 'Pending';

  return (
    <div
      className={cn(
        'rounded-xl border-2 p-3 transition-all',
        highlighted ? 'border-indigo-600 bg-indigo-50 shadow-[4px_4px_0_0_#4338ca]' : 'border-zinc-200 bg-white',
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase text-zinc-400">namespace</span>
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      </div>
      <p className="mono mb-3 text-sm font-bold">{ns}</p>
      <button
        type="button"
        disabled={!pod}
        onClick={() => pod && onPodClick({ namespace: pod.namespace, name: pod.name })}
        className={cn(
          'w-full rounded-lg border-2 border-zinc-900 p-2 text-left text-xs disabled:opacity-50',
          pod && 'cursor-pointer hover:bg-zinc-50',
        )}
      >
        <p className="text-[10px] uppercase text-zinc-400">pod</p>
        <p className="mono truncate font-semibold">{pod?.name ?? `${ns}-pod`}</p>
        <p className={cn('mt-1 font-mono', status === 'Running' ? 'text-green-600' : 'text-amber-600')}>
          {pod?.ready ?? '—/—'} · {status}
        </p>
      </button>
    </div>
  );
}

export default function ClusterArchitecture({ pods, onPodClick }: ClusterArchitectureProps) {
  const podByNs = Object.fromEntries(pods.map((p) => [p.namespace, p]));
  const frontendPod = pods.find((p) => p.namespace === 'frontend');
  const proxyPod = pods.find((p) => p.namespace === 'proxy');

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="rounded-xl border-2 border-zinc-900 bg-zinc-900 px-6 py-3 text-center text-white shadow-[4px_4px_0_0_#6366f1]">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400">ingress</p>
          <p className="mono font-bold">traefik</p>
          <p className="text-xs text-green-400">Running</p>
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {SECTIONS.map((ns) => (
          <PodCard key={ns} ns={ns} pod={podByNs[ns]} onPodClick={onPodClick} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PodCard ns="proxy" pod={proxyPod} onPodClick={onPodClick} />
        <PodCard ns="frontend" pod={frontendPod} highlighted onPodClick={onPodClick} />
      </div>
    </div>
  );
}

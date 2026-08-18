import type { PortfolioRoute } from '../config/portfolioRoutes';
import type { TopologyPod } from '../hooks/useTopology';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface NodeInfoPanelProps {
  route: PortfolioRoute;
  pod?: TopologyPod;
  onClose: () => void;
}

export default function NodeInfoPanel({ route, pod, onClose }: NodeInfoPanelProps) {
  const isRunning = pod?.status === 'Running';

  return (
    <div
      className="pointer-events-auto absolute bottom-6 left-1/2 z-20 w-[min(380px,92vw)] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="rounded-2xl border-2 border-zinc-900 bg-white p-4 shadow-[6px_6px_0_0_#18181b]">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <div className="mono text-sm font-bold text-indigo-600">{route.route}</div>
            <div className="text-xs text-zinc-500">namespace / {route.namespace}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </Button>
        </div>

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

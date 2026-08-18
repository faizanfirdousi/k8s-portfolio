import { X, ExternalLink } from 'lucide-react';
import type { PodDetailData, PodRef } from '../types/topology';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PodDetailDrawerProps {
  selected: PodRef | null;
  detail: PodDetailData | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

const NS_HREF: Record<string, string> = {
  about: '/about',
  projects: '/projects',
  blog: '/blog',
  contact: '/contact',
  skills: '/skills',
  frontend: '/',
};

export default function PodDetailDrawer({
  selected,
  detail,
  loading,
  error,
  onClose,
}: PodDetailDrawerProps) {
  if (!selected) return null;

  const pageHref = NS_HREF[selected.namespace];

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-3xl border-t-2 border-zinc-200 bg-white shadow-2xl transition-transform sm:bottom-auto sm:left-auto sm:right-0 sm:top-16 sm:max-h-none sm:h-[calc(100vh-4rem)] sm:w-full sm:max-w-md sm:rounded-none sm:border-l-2 sm:border-t-0"
        aria-label="Pod details"
      >
        <header className="flex items-start justify-between gap-3 border-b border-zinc-200 bg-zinc-50 p-4">
          <div className="min-w-0">
            <p className="mono text-[10px] uppercase tracking-wide text-zinc-400">
              pod · {selected.namespace}
            </p>
            <h2 className="mono truncate text-sm font-bold text-zinc-900">{selected.name}</h2>
            <p className="text-xs text-zinc-500">
              {selected.namespace}
              {detail?.node ? ` · ${detail.node}` : ''}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </Button>
        </header>

        {pageHref && (
          <div className="border-b border-zinc-100 p-3">
            <a
              href={pageHref}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-zinc-900 bg-white px-3 py-2 text-sm font-semibold shadow-[3px_3px_0_0_#18181b] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#18181b]"
            >
              <ExternalLink size={14} />
              Open /{selected.namespace}
            </a>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {loading && !detail && (
            <p className="text-sm text-zinc-500">Loading pod details…</p>
          )}
          {error && <p className="text-sm text-red-600">Failed to load: {error}</p>}

          {detail && (
            <div className="space-y-6">
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">Overview</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { label: 'Status', value: detail.status, warn: detail.status !== 'Running' },
                    { label: 'Ready', value: detail.ready },
                    { label: 'Restarts', value: String(detail.restarts), warn: detail.restarts > 0 },
                    { label: 'Age', value: detail.age },
                    { label: 'Node', value: detail.node || '—' },
                  ].map(({ label, value, warn }) => (
                    <div key={label} className="rounded-lg bg-zinc-50 p-2">
                      <dt className="text-[10px] uppercase text-zinc-400">{label}</dt>
                      <dd className={cn('mono font-semibold', warn && 'text-amber-600')}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Containers ({detail.containers.length})
                </h3>
                <ul className="space-y-2">
                  {detail.containers.map((c) => (
                    <li key={c.name} className="rounded-xl border border-zinc-200 p-3 text-sm">
                      <div className="flex justify-between font-medium">
                        <span className="mono">{c.name}</span>
                        <span className={c.ready ? 'text-green-600' : 'text-amber-600'}>
                          {c.ready ? 'Ready' : c.state}
                        </span>
                      </div>
                      {c.image && (
                        <p className="mono mt-1 truncate text-[10px] text-zinc-400">{c.image}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Recent Events
                </h3>
                {detail.events.length === 0 ? (
                  <p className="text-sm text-zinc-400">No recent events.</p>
                ) : (
                  <ul className="space-y-2">
                    {detail.events.map((event, index) => (
                      <li key={`${event.reason}-${index}`} className="rounded-lg bg-zinc-50 p-2 text-xs">
                        <span className="mono font-semibold">{event.reason}</span>
                        <span className="text-zinc-400"> · {event.age} ago</span>
                        <p className="mt-0.5 text-zinc-500">{event.message}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

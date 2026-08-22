import { Code2, Mail, Link2, GitBranch } from 'lucide-react';
import type { TopologyPod } from '../hooks/useTopology';
import { NAV_ITEMS } from '../config/portfolioRoutes';
import { cn } from '@/lib/utils';

interface SidebarProps {
  frontendPod: TopologyPod | undefined;
  open: boolean;
  onClose: () => void;
  pods: TopologyPod[];
}

export default function Sidebar({ frontendPod, open, onClose, pods }: SidebarProps) {
  const podByNs = Object.fromEntries(pods.map((p) => [p.namespace, p]));

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity xl:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r-2 border-zinc-200 bg-white p-4 transition-transform dark:border-zinc-700 dark:bg-zinc-900 xl:static xl:z-auto xl:translate-x-0 xl:border-r',
          open ? 'translate-x-0' : '-translate-x-full xl:translate-x-0',
        )}
      >
        <div className="mb-6 rounded-2xl border-2 border-zinc-900 bg-zinc-50 p-4 shadow-[4px_4px_0_0_#18181b] dark:border-zinc-600 dark:bg-zinc-800 dark:shadow-[4px_4px_0_0_#020617]">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
            FF
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Hi, I'm Faizan</h2>
          <p className="text-xs font-medium text-zinc-800">Cloud Engineer · Go Developer</p>
          <p className="mt-1 text-[11px] text-teal-700 font-medium dark:text-teal-400">Learning AI</p>
          <p className="mono mt-2 text-[10px] text-zinc-500 dark:text-zinc-400">› kubectl get pods -A</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Portfolio sections">
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Cluster / Routes
          </p>
          {NAV_ITEMS.map((item) => {
            const pod = podByNs[item.ns];
            const isRunning = pod?.status === 'Running';
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={onClose}
                className="group flex items-center justify-between rounded-xl border-2 border-transparent px-3 py-3 transition-all hover:border-zinc-900 hover:bg-zinc-50 hover:shadow-[3px_3px_0_0_#18181b] dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:shadow-[3px_3px_0_0_#020617]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                    style={{ background: `${item.color}22`, color: item.color }}
                  >
                    {item.emoji}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.label}</div>
                    <div className="mono text-[10px] text-zinc-500 dark:text-zinc-400">{item.desc}</div>
                  </div>
                </div>
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    pod ? (isRunning ? 'bg-green-500' : 'bg-amber-400') : 'bg-zinc-300',
                  )}
                  title={pod ? pod.status : 'No pod data'}
                />
              </a>
            );
          })}
        </nav>

        <div className="mt-4 rounded-xl border-2 border-zinc-200 bg-zinc-50 p-3 text-xs">
          <p className="mb-2 font-bold uppercase tracking-wide text-zinc-500">You Are Here</p>
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between"><span className="text-zinc-400">ns</span><span>frontend</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">pod</span><span className="text-indigo-600">{frontendPod?.name?.slice(0, 18) ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">status</span><span className={frontendPod?.status === 'Running' ? 'text-green-600' : 'text-amber-600'}>{frontendPod?.status ?? '—'}</span></div>
          </div>
        </div>

        <footer className="mt-4 flex flex-col items-center gap-2 border-t border-zinc-200 pt-4">
          <div className="flex flex-wrap justify-center gap-1.5">
            {[
              { href: 'https://github.com/faizanfirdousi', icon: GitBranch, label: 'GitHub' },
              { href: 'https://dev.to/faizanfirdousi', icon: Code2, label: 'DEV.to' },
              { href: 'https://twitter.com/codoyevskyy', icon: Link2, label: 'Twitter' },
              { href: 'https://linkedin.com/in/faizanfirdousi', icon: Link2, label: 'LinkedIn' },
              { href: '/contact', icon: Mail, label: 'Contact' },
            ].map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noreferrer' : undefined}
                title={label}
                aria-label={label}
                className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-900"
              >
                <Icon size={13} />
              </a>
            ))}
          </div>
          <p className="text-[10px] text-zinc-400">© 2026 Faizan Firdousi · Pune</p>
        </footer>
      </aside>
    </>
  );
}

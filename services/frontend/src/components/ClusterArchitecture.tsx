import type { TopologyPod } from '../hooks/useTopology';
import type { PodRef } from '../types/topology';
import { ROUTE_BY_NAMESPACE } from '../config/portfolioRoutes';
import { cn } from '@/lib/utils';
import { Server, Cpu, HardDrive, ArrowDown, ShieldCheck, Globe } from 'lucide-react';

interface ClusterArchitectureProps {
  pods: TopologyPod[];
  onPodClick: (ref: PodRef) => void;
}

interface PodItemProps {
  pod?: TopologyPod;
  fallbackNs: string;
  onPodClick: (ref: PodRef) => void;
}

function PodItem({ pod, fallbackNs, onPodClick }: PodItemProps) {
  const ns = pod?.namespace ?? fallbackNs;
  const route = ROUTE_BY_NAMESPACE[ns];
  const color = route?.color ?? '#6366f1';
  const isRunning = pod ? pod.status === 'Running' || pod.status === 'Succeeded' : true;
  const status = pod?.status ?? 'Running';

  return (
    <button
      type="button"
      onClick={() => onPodClick({ namespace: ns, name: pod?.name ?? `${ns}-pod` })}
      className={cn(
        'group flex flex-col justify-between rounded-xl border-2 p-3 text-left transition-all',
        'border-zinc-200 bg-white hover:border-zinc-900 hover:shadow-[3px_3px_0_0_#18181b]',
        'dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold"
            style={{ background: `${color}18`, color }}
          >
            {route ? (route.id === 'home' ? '⌂' : route.id === 'about' ? '◈' : route.id === 'projects' ? '◧' : route.id === 'skills' ? '◇' : route.id === 'blog' ? '◎' : '◉') : '●'}
          </span>
          <span className="mono text-[11px] font-bold text-zinc-900 dark:text-zinc-100">{ns}</span>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
            isRunning ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', isRunning ? 'bg-emerald-500' : 'bg-amber-500')} />
          {status}
        </span>
      </div>

      <div className="space-y-1">
        <p className="mono truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200" title={pod?.name ?? `${ns}-pod`}>
          {pod?.name ?? `${ns}-pod`}
        </p>
        <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
          <span>Ready: <strong className="text-zinc-700 dark:text-zinc-300">{pod?.ready ?? '1/1'}</strong></span>
          <span>Restarts: <strong className="text-zinc-700 dark:text-zinc-300">{pod?.restarts ?? 0}</strong></span>
          <span>Age: <strong className="text-zinc-700 dark:text-zinc-300">{pod?.age ?? 'live'}</strong></span>
        </div>
      </div>
    </button>
  );
}

export default function ClusterArchitecture({ pods, onPodClick }: ClusterArchitectureProps) {
  const podByNs = Object.fromEntries(pods.map((p) => [p.namespace, p]));

  const node1AssignedNs = ['frontend', 'about', 'projects'];
  const node2AssignedNs = ['skills', 'blog', 'contact', 'proxy'];

  const node1Pods: { ns: string; pod?: TopologyPod }[] = [];
  const node2Pods: { ns: string; pod?: TopologyPod }[] = [];

  if (pods.length > 0) {
    for (const pod of pods) {
      if (pod.node) {
        if (pod.node.includes('agent-1') || pod.node.includes('node-2')) {
          node2Pods.push({ ns: pod.namespace, pod });
        } else {
          node1Pods.push({ ns: pod.namespace, pod });
        }
      } else {
        if (node1AssignedNs.includes(pod.namespace)) {
          node1Pods.push({ ns: pod.namespace, pod });
        } else {
          node2Pods.push({ ns: pod.namespace, pod });
        }
      }
    }
  } else {
    for (const ns of node1AssignedNs) {
      node1Pods.push({ ns, pod: podByNs[ns] });
    }
    for (const ns of node2AssignedNs) {
      node2Pods.push({ ns, pod: podByNs[ns] });
    }
  }

  return (
    <div className="space-y-6">
      {/* ── TOP TIER: KUBERNETES CONTROL PLANE ─────────────────────────────── */}
      <div className="relative rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/50 p-5 text-zinc-900 shadow-[4px_4px_0_0_#6366f1] dark:border-indigo-900/60 dark:bg-gradient-to-br dark:from-zinc-950 dark:via-indigo-950/30 dark:to-zinc-900 dark:text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <Server size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  Control Plane (Master Node)
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ready · v1.29.2+k3s1
                </span>
              </div>
              <p className="mono text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                k3d-portfolio-server-0 · 172.20.0.2
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200/80 bg-white/90 px-2.5 py-1 font-mono text-[11px] font-medium text-indigo-950 shadow-2xs dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
              <ShieldCheck size={13} className="text-indigo-600 dark:text-indigo-400" />
              kube-apiserver :6443
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200/80 bg-white/90 px-2.5 py-1 font-mono text-[11px] font-medium text-indigo-950 shadow-2xs dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
              <Cpu size={13} className="text-indigo-600 dark:text-indigo-400" />
              kube-scheduler
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200/80 bg-white/90 px-2.5 py-1 font-mono text-[11px] font-medium text-indigo-950 shadow-2xs dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
              <Globe size={13} className="text-indigo-600 dark:text-indigo-400" />
              Traefik Ingress :8080
            </span>
          </div>
        </div>
      </div>

      {/* ── CONNECTOR FLOW ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border-2 border-zinc-200 bg-white px-4 py-1 font-mono text-[11px] font-semibold text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <ArrowDown size={13} className="text-indigo-600 dark:text-indigo-400 animate-bounce" />
          <span>Kubelet API Orchestration &amp; Node Scheduling</span>
          <ArrowDown size={13} className="text-indigo-600 dark:text-indigo-400 animate-bounce" />
        </div>
      </div>

      {/* ── BOTTOM TIER: TWO WORKER NODES ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* WORKER NODE 1 */}
        <div className="flex flex-col rounded-2xl border-2 border-sky-300 bg-gradient-to-b from-sky-50/60 via-white to-sky-50/30 p-4 shadow-[4px_4px_0_0_#0284c7] dark:border-sky-900/60 dark:bg-zinc-900/60">
          <div className="mb-4 flex items-center justify-between border-b border-sky-100 pb-3 dark:border-sky-900/40">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white shadow-xs">
                <HardDrive size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Worker Node 1</h4>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
                  </span>
                </div>
                <p className="mono text-[11px] text-sky-800 dark:text-sky-300 font-medium">k3d-portfolio-agent-0</p>
              </div>
            </div>
            <div className="text-right">
              <span className="rounded-md border border-sky-200 bg-white px-2 py-1 text-[10px] font-bold text-sky-800 shadow-2xs dark:border-sky-800 dark:bg-zinc-900 dark:text-sky-300">
                {node1Pods.length} Pods Hosted
              </span>
            </div>
          </div>

          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-sky-900 dark:text-sky-400">
            // Pods Running Inside Node 1
          </p>
          <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">
            {node1Pods.map(({ ns, pod }) => (
              <PodItem key={ns} fallbackNs={ns} pod={pod} onPodClick={onPodClick} />
            ))}
          </div>
        </div>

        {/* WORKER NODE 2 */}
        <div className="flex flex-col rounded-2xl border-2 border-teal-300 bg-gradient-to-b from-teal-50/60 via-white to-teal-50/30 p-4 shadow-[4px_4px_0_0_#0d9488] dark:border-teal-900/60 dark:bg-zinc-900/60">
          <div className="mb-4 flex items-center justify-between border-b border-teal-100 pb-3 dark:border-teal-900/40">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white shadow-xs">
                <HardDrive size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Worker Node 2</h4>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
                  </span>
                </div>
                <p className="mono text-[11px] text-teal-800 dark:text-teal-300 font-medium">k3d-portfolio-agent-1</p>
              </div>
            </div>
            <div className="text-right">
              <span className="rounded-md border border-teal-200 bg-white px-2 py-1 text-[10px] font-bold text-teal-800 shadow-2xs dark:border-teal-800 dark:bg-zinc-900 dark:text-teal-300">
                {node2Pods.length} Pods Hosted
              </span>
            </div>
          </div>

          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-teal-900 dark:text-teal-400">
            // Pods Running Inside Node 2
          </p>
          <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">
            {node2Pods.map(({ ns, pod }) => (
              <PodItem key={ns} fallbackNs={ns} pod={pod} onPodClick={onPodClick} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

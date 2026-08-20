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
            style={{ border: `1px solid ${color}`, color }}
          >
            {route ? (route.id === 'home' ? '⌂' : route.id === 'about' ? '◈' : route.id === 'projects' ? '◧' : route.id === 'skills' ? '◇' : route.id === 'blog' ? '◎' : '◉') : '●'}
          </span>
          <span className="mono text-[11px] font-bold text-zinc-900 dark:text-zinc-100">{ns}</span>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
            isRunning ? 'border border-emerald-700 text-emerald-800 dark:border-emerald-500 dark:text-emerald-400' : 'border border-amber-700 text-amber-800 dark:border-amber-500 dark:text-amber-400',
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
      <div className="relative rounded-2xl border border-zinc-300 bg-white p-5 text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-900 text-zinc-900 dark:border-zinc-300 dark:text-white">
              <Server size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  Control Plane (Master Node)
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-500 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ready · v1.29.2+k3s1
                </span>
              </div>
              <p className="mono text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                k3d-portfolio-server-0 · 172.20.0.2
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 font-mono text-[11px] font-medium text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
              <ShieldCheck size={13} />
              kube-apiserver :6443
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 font-mono text-[11px] font-medium text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
              <Cpu size={13} />
              kube-scheduler
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 font-mono text-[11px] font-medium text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
              <Globe size={13} />
              Traefik Ingress :8080
            </span>
          </div>
        </div>
      </div>

      {/* ── CONNECTOR FLOW ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-1 font-mono text-[11px] font-semibold text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
          <ArrowDown size={13} className="animate-bounce" />
          <span>Kubelet API Orchestration &amp; Node Scheduling</span>
          <ArrowDown size={13} className="animate-bounce" />
        </div>
      </div>

      {/* ── BOTTOM TIER: TWO WORKER NODES ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* WORKER NODE 1 */}
        <div className="flex flex-col rounded-2xl border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
          <div className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-700">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-900 text-zinc-900 dark:border-zinc-300 dark:text-white">
                <HardDrive size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Worker Node 1</h4>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-500 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
                  </span>
                </div>
                <p className="mono text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">k3d-portfolio-agent-0</p>
              </div>
            </div>
            <div className="text-right">
              <span className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[10px] font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                {node1Pods.length} Pods Hosted
              </span>
            </div>
          </div>

          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            // Pods Running Inside Node 1
          </p>
          <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">
            {node1Pods.map(({ ns, pod }) => (
              <PodItem key={ns} fallbackNs={ns} pod={pod} onPodClick={onPodClick} />
            ))}
          </div>
        </div>

        {/* WORKER NODE 2 */}
        <div className="flex flex-col rounded-2xl border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
          <div className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-700">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-900 text-zinc-900 dark:border-zinc-300 dark:text-white">
                <HardDrive size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Worker Node 2</h4>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-500 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
                  </span>
                </div>
                <p className="mono text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">k3d-portfolio-agent-1</p>
              </div>
            </div>
            <div className="text-right">
              <span className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[10px] font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                {node2Pods.length} Pods Hosted
              </span>
            </div>
          </div>

          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
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

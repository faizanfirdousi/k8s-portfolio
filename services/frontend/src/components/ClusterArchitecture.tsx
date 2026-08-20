import type { TopologyPod, TopologyNode } from '../hooks/useTopology';
import type { PodRef } from '../types/topology';
import { ROUTE_BY_NAMESPACE } from '../config/portfolioRoutes';
import { cn } from '@/lib/utils';
import { Server, HardDrive, ArrowDown, ShieldCheck, Cpu, Globe } from 'lucide-react';

interface ClusterArchitectureProps {
  pods: TopologyPod[];
  nodes: TopologyNode[];
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
            {route
              ? route.id === 'home'
                ? '⌂'
                : route.id === 'about'
                ? '◈'
                : route.id === 'projects'
                ? '◧'
                : route.id === 'skills'
                ? '◇'
                : route.id === 'blog'
                ? '◎'
                : '◉'
              : '●'}
          </span>
          <span className="mono text-[11px] font-bold text-zinc-900 dark:text-zinc-100">{ns}</span>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
            isRunning
              ? 'border border-emerald-700 text-emerald-800 dark:border-emerald-500 dark:text-emerald-400'
              : 'border border-amber-700 text-amber-800 dark:border-amber-500 dark:text-amber-400',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', isRunning ? 'bg-emerald-500' : 'bg-amber-500')} />
          {status}
        </span>
      </div>

      <div className="space-y-1">
        <p
          className="mono truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200"
          title={pod?.name ?? `${ns}-pod`}
        >
          {pod?.name ?? `${ns}-pod`}
        </p>
        <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
          <span>
            Ready: <strong className="text-zinc-700 dark:text-zinc-300">{pod?.ready ?? '1/1'}</strong>
          </span>
          <span>
            Restarts: <strong className="text-zinc-700 dark:text-zinc-300">{pod?.restarts ?? 0}</strong>
          </span>
          <span>
            Age: <strong className="text-zinc-700 dark:text-zinc-300">{pod?.age ?? 'live'}</strong>
          </span>
        </div>
      </div>
    </button>
  );
}

interface WorkerNodePanelProps {
  k8sNode: TopologyNode;
  nodePods: TopologyPod[];
  onPodClick: (ref: PodRef) => void;
}

/** One card per real K8s worker node */
function WorkerNodePanel({ k8sNode, nodePods, onPodClick }: WorkerNodePanelProps) {
  const isReady = k8sNode.status === 'Ready';

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
      <div className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-700">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-900 text-zinc-900 dark:border-zinc-300 dark:text-white">
            <HardDrive size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                {k8sNode.roles?.includes('control-plane') || k8sNode.roles?.includes('master')
                  ? 'Control + Worker'
                  : 'Worker Node'}
              </h4>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  isReady
                    ? 'border border-emerald-700 text-emerald-800 dark:border-emerald-500 dark:text-emerald-300'
                    : 'border border-amber-700 text-amber-800 dark:border-amber-500 dark:text-amber-300',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isReady ? 'bg-emerald-500' : 'bg-amber-500',
                  )}
                />
                {k8sNode.status}
              </span>
            </div>
            <p className="mono text-[11px] text-zinc-600 dark:text-zinc-300 font-medium truncate max-w-[220px]">
              {k8sNode.name}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[10px] font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
            {nodePods.length} Pods
          </span>
        </div>
      </div>

      {k8sNode.resources && (
        <div className="mb-3 flex flex-wrap gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
            CPU {k8sNode.resources.cpuAllocatable ?? k8sNode.resources.cpuCapacity ?? '?'}
          </span>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
            Mem {k8sNode.resources.memoryAllocatable ?? k8sNode.resources.memoryCapacity ?? '?'}
          </span>
          {k8sNode.kubeletVersion && (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
              {k8sNode.kubeletVersion}
            </span>
          )}
        </div>
      )}

      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
        // Pods Running Inside Node
      </p>
      <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">
        {nodePods.length > 0 ? (
          nodePods.map((pod) => (
            <PodItem key={pod.name} fallbackNs={pod.namespace} pod={pod} onPodClick={onPodClick} />
          ))
        ) : (
          <p className="col-span-2 text-center text-xs text-zinc-400 py-4">No portfolio pods on this node</p>
        )}
      </div>
    </div>
  );
}

export default function ClusterArchitecture({ pods, nodes, onPodClick }: ClusterArchitectureProps) {
  // Group pods by their actual node name
  const podsByNode = new Map<string, TopologyPod[]>();
  const unassigned: TopologyPod[] = [];

  for (const pod of pods) {
    if (pod.node) {
      const list = podsByNode.get(pod.node) ?? [];
      list.push(pod);
      podsByNode.set(pod.node, list);
    } else {
      unassigned.push(pod);
    }
  }

  // Use real nodes from topology; fall back to a single placeholder if no data yet
  const displayNodes: TopologyNode[] =
    nodes.length > 0
      ? nodes
      : [
          {
            name: 'Loading…',
            status: 'Ready',
            podCount: 0,
            roles: ['worker'],
          },
        ];

  // Detect which node is purely control-plane with no portfolio pods
  // (For k3d, server-0 hosts system pods but not portfolio ones)
  const nodesWithPods = displayNodes.filter(
    (n) => (podsByNode.get(n.name) ?? []).length > 0 || displayNodes.length === 1,
  );
  const renderNodes = nodesWithPods.length > 0 ? nodesWithPods : displayNodes;

  return (
    <div className="space-y-6">
      {/* ── CONTROL PLANE ─────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl border border-zinc-300 bg-white p-5 text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-900 text-zinc-900 dark:border-zinc-300 dark:text-white">
              <Server size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  Kubernetes Control Plane
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-500 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ready
                </span>
              </div>
              <p className="mono text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                API Server · etcd · Scheduler · Controller Manager
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
              Traefik Ingress :80
            </span>
          </div>
        </div>
      </div>

      {/* ── FLOW CONNECTOR ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-1 font-mono text-[11px] font-semibold text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
          <ArrowDown size={13} className="animate-bounce" />
          <span>Kubelet API Orchestration &amp; Node Scheduling</span>
          <ArrowDown size={13} className="animate-bounce" />
        </div>
      </div>

      {/* ── WORKER NODES (dynamic grid) ─────────────────────────────────────── */}
      <div
        className={cn(
          'grid gap-6',
          renderNodes.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2',
        )}
      >
        {renderNodes.map((node) => (
          <WorkerNodePanel
            key={node.name}
            k8sNode={node}
            nodePods={podsByNode.get(node.name) ?? []}
            onPodClick={onPodClick}
          />
        ))}
      </div>
    </div>
  );
}

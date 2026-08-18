import { ROUTE_BY_NAMESPACE } from './portfolioRoutes';

/** Stable kube-universe-style palette — never randomize on refresh */
export const GRAPH_COLORS = {
  namespace: '#5B8DEF',
  workerNode: '#64748b',
  workerNodeAlt: '#475569',
  runningPod: '#22c55e',
  pendingPod: '#eab308',
  unhealthyPod: '#ef4444',
  link: '#94a3b8',
  background: '#f1f5f9',
} as const;

const WORKER_NODE_PALETTE = ['#64748b', '#475569', '#334155', '#1e293b'] as const;

export function namespaceColor(namespace: string): string {
  return ROUTE_BY_NAMESPACE[namespace]?.color ?? '#6366f1';
}

export function workerNodeColor(nodeName: string): string {
  const hash = [...nodeName].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return WORKER_NODE_PALETTE[hash % WORKER_NODE_PALETTE.length];
}

export function podColor(namespace: string, status?: string): string {
  if (status === 'Pending') return GRAPH_COLORS.pendingPod;
  if (status && status !== 'Running' && status !== 'Succeeded') {
    return GRAPH_COLORS.unhealthyPod;
  }
  return namespaceColor(namespace);
}

export type GraphNodeKind = 'namespace' | 'pod' | 'node';

export function graphNodeColor(
  type: GraphNodeKind,
  name: string,
  namespace: string,
  status?: string,
): string {
  if (type === 'namespace') return namespaceColor(namespace);
  if (type === 'node') return workerNodeColor(name);
  return podColor(namespace, status);
}

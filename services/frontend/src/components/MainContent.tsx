import { useState } from 'react';
import { MapPin, Briefcase, BookOpen, ArrowRight, LayoutGrid, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ClusterArchitecture from './ClusterArchitecture';
import NodeInfoPanel from './NodeInfoPanel';
import ClusterScene3D from './ClusterScene3D';
import LiveMetrics from './LiveMetrics';
import type { PortfolioRoute } from '../config/portfolioRoutes';
import type { TopologyPod, TopologyNode } from '../hooks/useTopology';
import type { PodRef } from '../types/topology';
import type { PageMetrics } from '../hooks/usePageMetrics';

type View = 'cluster' | 'table';

interface MainContentProps {
  pods: TopologyPod[];
  nodes: TopologyNode[];
  clusterHealthy: boolean;
  onPodClick: (ref: PodRef) => void;
  view: View;
  onViewChange: (v: View) => void;
  darkMode: boolean;
  pageMetrics: PageMetrics;
  topologyResponseMs: number | null;
}

const formatMilliseconds = (value: number | null) => {
  if (value === null) return 'measuring…';
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${value}ms`;
};

export default function MainContent({ pods, nodes, clusterHealthy, onPodClick, view, onViewChange, darkMode, pageMetrics, topologyResponseMs }: MainContentProps) {
  const [selectedRoute, setSelectedRoute] = useState<PortfolioRoute | null>(null);
  const podByNs = Object.fromEntries(pods.map((p) => [p.namespace, p]));

  return (
    <main className="min-w-0 flex-1 xl:min-h-0 xl:overflow-y-auto">
      <section className="hero-surface border-b border-zinc-200 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <p className="mono mb-2 text-xs font-medium text-teal-600">$ kubectl get portfolio --live</p>
        <p className="mb-2 text-sm font-semibold text-zinc-700">Hi, I’m Faizan Firdousi.</p>
        <h1 className="max-w-3xl text-[clamp(1.75rem,5vw,2.25rem)] font-bold tracking-tight text-zinc-900 leading-[1.15]">
          A Kubernetes cluster, <span className="text-indigo-600">built as my portfolio.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">
          Every page is its own service and pod. Explore the live cluster below to see the infrastructure behind this website.
        </p>
        <a
          href="/about"
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-zinc-900 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
        >
          Know more about me <ArrowRight size={15} />
        </a>
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span><strong className="text-zinc-700">Page loaded:</strong> {formatMilliseconds(pageMetrics.loadMs)}</span>
          <span><strong className="text-zinc-700">Server response:</strong> {formatMilliseconds(pageMetrics.ttfbMs)}</span>
          <span><strong className="text-zinc-700">Cluster API:</strong> {formatMilliseconds(topologyResponseMs)}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[
            { icon: MapPin, text: 'Pune, India' },
            { icon: Briefcase, text: 'Cloud Engineer · Go Developer' },
            { icon: BookOpen, text: 'Learning AI' },
          ].map(({ icon: Icon, text }) => (
            <span
              key={text}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600"
            >
              <Icon size={12} />
              {text}
            </span>
          ))}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 font-mono text-xs font-semibold ${
              clusterHealthy
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${clusterHealthy ? 'bg-green-500' : 'bg-amber-500'}`} />
            {clusterHealthy ? 'All systems operational' : 'Connecting…'}
          </span>
        </div>
      </section>

      <div className="relative min-w-0 p-4 sm:p-6 lg:p-8">
        <LiveMetrics />

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Infrastructure map</p>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-zinc-900">Live cluster topology</h2>
              {nodes.length === 1 && (
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                  Single Node K3s (AWS EC2)
                </span>
              )}
            </div>
            {nodes.length === 1 && (
              <p className="mt-1 text-xs text-zinc-500 max-w-xl">
                <strong>Transparency Note:</strong> This is an honest representation of the cluster. Unlike local k3d setups where nodes are simulated via containers, this runs natively on a single AWS EC2 instance where the Control Plane and Worker are the exact same machine.
              </p>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="mono hidden rounded-full bg-zinc-100 px-3 py-1.5 text-[10px] text-zinc-500 sm:block">click a node to inspect</span>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white p-1">
              <Button
                variant={view === 'cluster' ? 'outline' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('cluster')}
                aria-pressed={view === 'cluster'}
                className="h-8"
              >
                <LayoutGrid size={14} className="mr-2" />
                Cluster
              </Button>
              <Button
                variant={view === 'table' ? 'outline' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('table')}
                aria-pressed={view === 'table'}
                className="h-8"
              >
                <Table2 size={14} className="mr-2" />
                Table
              </Button>
            </div>
          </div>
        </div>
        {view === 'cluster' ? (
          <ClusterScene3D
            pods={pods}
            nodes={nodes}
            clusterHealthy={clusterHealthy}
            onNodeSelect={setSelectedRoute}
            darkMode={darkMode}
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border-2 border-zinc-200 bg-white p-5 shadow-[4px_4px_0_0_#e2e8f0] transition-colors dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[4px_4px_0_0_#18181b]">
            <ClusterArchitecture pods={pods} nodes={nodes} onPodClick={onPodClick} />
          </div>
        )}

        {view === 'cluster' && selectedRoute && (
          <NodeInfoPanel
            route={selectedRoute}
            pod={podByNs[selectedRoute.namespace]}
            onClose={() => setSelectedRoute(null)}
          />
        )}
      </div>
    </main>
  );
}

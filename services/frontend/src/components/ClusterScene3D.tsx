import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';
import type { TopologyPod } from '../hooks/useTopology';
import { ROUTE_BY_NAMESPACE, type PortfolioRoute } from '../config/portfolioRoutes';
import {
  GRAPH_COLORS,
  graphNodeColor,
  namespaceColor,
} from '../config/clusterGraphColors';

export type { PortfolioRoute };

type NodeType = 'namespace' | 'pod' | 'node';

interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  namespace: string;
  status?: string;
  color: string;
  val: number;
  x?: number;
  y?: number;
  z?: number;
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
}

interface ClusterScene3DProps {
  pods: TopologyPod[];
  clusterHealthy: boolean;
  onNodeSelect: (route: PortfolioRoute | null) => void;
  darkMode: boolean;
}

const LINK_DISTANCE = 100;

function topologySignature(pods: TopologyPod[]): string {
  return pods
    .map((p) => `${p.namespace}|${p.name}|${p.status}|${p.node ?? ''}`)
    .sort()
    .join('\n');
}

function buildGraphFromPods(pods: TopologyPod[]): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const seenNs = new Set<string>();
  const seenNodes = new Set<string>();

  for (const pod of pods) {
    const nsKey = `namespace-${pod.namespace}`;
    if (!seenNs.has(pod.namespace)) {
      seenNs.add(pod.namespace);
      nodes.push({
        id: nsKey,
        name: pod.namespace,
        type: 'namespace',
        namespace: pod.namespace,
        color: namespaceColor(pod.namespace),
        val: 8,
      });
    }

    const podKey = `${pod.namespace}-${pod.name}`;
    nodes.push({
      id: podKey,
      name: pod.name,
      type: 'pod',
      namespace: pod.namespace,
      status: pod.status,
      color: graphNodeColor('pod', pod.name, pod.namespace, pod.status),
      val: 6,
    });
    links.push({ source: nsKey, target: podKey, value: 1 });

    if (pod.node) {
      const nodeKey = `node-${pod.node}`;
      if (!seenNodes.has(pod.node)) {
        seenNodes.add(pod.node);
        nodes.push({
          id: nodeKey,
          name: pod.node,
          type: 'node',
          namespace: '',
          color: graphNodeColor('node', pod.node, ''),
          val: 10,
        });
      }
      links.push({ source: podKey, target: nodeKey, value: 0 });
    }
  }

  return { nodes, links };
}

function buildPlaceholderGraph(): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  for (const route of Object.values(ROUTE_BY_NAMESPACE)) {
    const nsKey = `namespace-${route.namespace}`;
    nodes.push({
      id: nsKey,
      name: route.namespace,
      type: 'namespace',
      namespace: route.namespace,
      color: route.color,
      val: 8,
    });

    const podKey = `${route.namespace}-pod`;
    nodes.push({
      id: podKey,
      name: `${route.namespace}-pod`,
      type: 'pod',
      namespace: route.namespace,
      status: 'Pending',
      color: graphNodeColor('pod', podKey, route.namespace, 'Pending'),
      val: 6,
    });
    links.push({ source: nsKey, target: podKey, value: 1 });
  }

  return { nodes, links };
}

function routeForNode(node: GraphNode): PortfolioRoute | null {
  if (node.type === 'namespace' || node.type === 'pod') {
    return ROUTE_BY_NAMESPACE[node.namespace] ?? null;
  }
  return null;
}

export default function ClusterScene3D({ pods, onNodeSelect, darkMode }: ClusterScene3DProps) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const linkConfigured = useRef(false);
  // Keep the canvas height independent from its rendered contents. Measuring it here
  // creates a feedback loop in react-force-graph (canvas resize → parent resize → canvas resize).
  const [width, setWidth] = useState(800);
  const [graphHeight, setGraphHeight] = useState(540);

  const signature = useMemo(() => topologySignature(pods), [pods]);
  const graphData = useMemo(() => {
    if (pods.length === 0) return buildPlaceholderGraph();
    return buildGraphFromPods(pods);
  }, [signature]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let frame = 0;
    let debounce = 0;

    const applySize = () => {
      const nextWidth = Math.floor(el.getBoundingClientRect().width);
      if (nextWidth < 1) return;
      setWidth((previous) => (Math.abs(previous - nextWidth) < 2 ? previous : nextWidth));
      setGraphHeight(nextWidth < 640 ? 360 : nextWidth < 1024 ? 460 : 540);
    };

    applySize();

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        frame = requestAnimationFrame(applySize);
      }, 150);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(debounce);
    };
  }, []);

  const configureForces = useCallback(() => {
    const fg = fgRef.current;
    if (!fg || linkConfigured.current) return;
    const linkForce = fg.d3Force('link');
    if (linkForce) {
      linkForce.distance(() => LINK_DISTANCE);
      linkConfigured.current = true;
    }
  }, []);

  useEffect(() => {
    configureForces();
  }, [configureForces, graphData]);

  const nodeThreeObject = useCallback((node: GraphNode) => {
    const color = node.color;

    if (node.type === 'pod') {
      const unhealthy =
        node.status && node.status !== 'Running' && node.status !== 'Succeeded';
      if (unhealthy) {
        return new THREE.Mesh(
          new THREE.DodecahedronGeometry(20, 0),
          new THREE.MeshLambertMaterial({ color, transparent: false, opacity: 1 }),
        );
      }
      return undefined as unknown as THREE.Object3D;
    }

    if (node.type === 'node') {
      return new THREE.Mesh(
        new THREE.BoxGeometry(20, 20, 20),
        new THREE.MeshLambertMaterial({ color, transparent: false, opacity: 1 }),
      );
    }

    if (node.type === 'namespace') {
      const sprite = new SpriteText(node.name);
      sprite.color = color;
      sprite.textHeight = 5;
      return sprite;
    }

    return undefined as unknown as THREE.Object3D;
  }, []);

  const handleNodeClick = useCallback(
    (node: GraphNode | null) => {
      if (!node) {
        onNodeSelect(null);
        return;
      }

      const fg = fgRef.current;
      if (fg && node.x != null && node.y != null && node.z != null) {
        const distance = 40;
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
        fg.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
          { x: node.x, y: node.y, z: node.z },
          3000,
        );
      }

      onNodeSelect(routeForNode(node));
    },
    [onNodeSelect],
  );

  return (
    <div
      ref={containerRef}
      className="scene-canvas-wrapper relative h-[360px] w-full touch-none overflow-hidden rounded-2xl border-2 border-zinc-200 bg-slate-100 sm:h-[460px] lg:h-[540px]"
    >
      <ForceGraph3D
        ref={fgRef}
        width={width}
        height={graphHeight}
        graphData={graphData}
        backgroundColor={darkMode ? '#101728' : GRAPH_COLORS.background}
        showNavInfo={false}
        controlType="trackball"
        enableNodeDrag={false}
        enableNavigationControls
        numDimensions={3}
        nodeResolution={15}
        nodeOpacity={1}
        nodeColor={(node: GraphNode) => node.color}
        nodeLabel={(node: GraphNode) => {
          if (node.type === 'pod' && node.status && node.status !== 'Running') {
            return `${node.name}<br/>Status: ${node.status}`;
          }
          return node.name;
        }}
        nodeAutoColorBy={(node: GraphNode) => {
          if (node.type === 'namespace') return 'namespace';
          if (node.type === 'pod') return node.namespace;
          if (node.type === 'node') return 'node';
          return null;
        }}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        linkAutoColorBy="value"
        linkWidth={0.5}
        linkDirectionalParticles={10}
        linkDirectionalParticleSpeed={0.005}
        onNodeClick={handleNodeClick}
        onBackgroundClick={() => onNodeSelect(null)}
        onNodeHover={(node: GraphNode | null) => {
          if (containerRef.current) {
            containerRef.current.style.cursor = node ? 'pointer' : 'grab';
          }
        }}
        onEngineStop={configureForces}
      />

      <div className="pointer-events-none absolute bottom-4 right-4 flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white/90 p-3 text-xs text-zinc-600 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-indigo-500" />Namespace</div>
        <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500" />Pod (Running)</div>
        <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400" />Pod (Pending)</div>
        <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-500" />K8s Node</div>
      </div>

      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[11px] text-zinc-400">
        drag to orbit · scroll to zoom · click to navigate
      </p>
    </div>
  );
}

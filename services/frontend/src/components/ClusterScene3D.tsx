import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';
import type { TopologyPod, TopologyNode } from '../hooks/useTopology';
import { ROUTE_BY_NAMESPACE, type PortfolioRoute } from '../config/portfolioRoutes';

export type { PortfolioRoute };

type NodeType = 'control-plane' | 'worker-node' | 'pod';

interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  namespace?: string;
  status?: string;
  color: string;
  val: number;
  nodeName?: string;
  cpuPct?: number;   // 0-100 actual node CPU usage
  memPct?: number;   // 0-100 actual node mem usage
  x?: number;
  y?: number;
  z?: number;
}

interface GraphLink {
  source: string;
  target: string;
  linkType: 'control-link' | 'pod-link';
  value: number;
}

interface ClusterScene3DProps {
  pods: TopologyPod[];
  nodes: TopologyNode[];
  clusterHealthy: boolean;
  onNodeSelect: (route: PortfolioRoute | null) => void;
  darkMode: boolean;
}

const CONTROL_LINK_DIST = 90;
const POD_LINK_DIST = 45;

// Stable colors per node index so they don't flicker on re-render
const NODE_COLORS = ['#0284c7', '#0d9488', '#7c3aed', '#db2777', '#d97706', '#16a34a'];

function topologySignature(pods: TopologyPod[], nodes: TopologyNode[]): string {
  const podSig = pods
    .map((p) => `${p.namespace}|${p.name}|${p.status}|${p.node ?? ''}`)
    .sort()
    .join('\n');
  const nodeSig = nodes
    .map((n) => `${n.name}|${n.status}|${n.podCount}`)
    .sort()
    .join('\n');
  return `${nodeSig}::${podSig}`;
}

/**
 * Builds a hierarchical topology graph driven 100% by live API data.
 *
 * Topology:
 *   API Server (control-plane virtual node)
 *     └── k3s-node / k3d-agent-0 / k3d-agent-1 … (real K8s nodes)
 *           └── pod-about / pod-frontend … (real pods on that node)
 *
 * Handles single-node prod cluster and multi-node k3d equally.
 */
function buildGraph(
  pods: TopologyPod[],
  nodes: TopologyNode[],
): { nodes: GraphNode[]; links: GraphLink[] } {
  const graphNodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // ── 1. Virtual Control Plane node ──────────────────────────────────────────
  graphNodes.push({
    id: 'control-plane',
    name: 'API Server',
    type: 'control-plane',
    color: '#4f46e5',
    val: 14,
    y: 50,
  });

  // ── 2. Real worker nodes from topology ─────────────────────────────────────
  // Filter out nodes that have the control-plane role — those are API server roles
  // and we already represent the API server above.
  // On k3s single-node, the only node IS both control-plane + worker, so we show it.
  const workerNodes = nodes.length > 0 ? nodes : [];

  // Map from K8s node name → graph node id
  const nodeIdMap = new Map<string, string>();

  workerNodes.forEach((node, idx) => {
    const gid = `worker-${idx}`;
    nodeIdMap.set(node.name, gid);
    const color = NODE_COLORS[idx % NODE_COLORS.length];

    graphNodes.push({
      id: gid,
      name: node.name,
      type: 'worker-node',
      nodeName: node.name,
      color,
      val: 11,
      status: node.status,
    });

    // Link control-plane → worker node
    links.push({
      source: 'control-plane',
      target: gid,
      linkType: 'control-link',
      value: 3,
    });
  });

  // ── 3. Pods ─────────────────────────────────────────────────────────────────
  if (pods.length > 0) {
    for (const pod of pods) {
      const podKey = `pod-${pod.namespace}-${pod.name}`;
      const route = ROUTE_BY_NAMESPACE[pod.namespace];
      const podColor = route?.color ?? '#6366f1';

      graphNodes.push({
        id: podKey,
        name: pod.name,
        type: 'pod',
        namespace: pod.namespace,
        status: pod.status,
        color: podColor,
        val: 7,
      });

      // Determine which worker node this pod belongs to
      let targetWorker = 'worker-0'; // fallback to first node

      if (pod.node && nodeIdMap.has(pod.node)) {
        // Exact match on real node name — this is the correct path for prod
        targetWorker = nodeIdMap.get(pod.node)!;
      } else if (pod.node) {
        // Fuzzy fallback: match partial node name (handles k3d naming)
        for (const [nodeName, gid] of nodeIdMap.entries()) {
          if (pod.node.includes(nodeName) || nodeName.includes(pod.node)) {
            targetWorker = gid;
            break;
          }
        }
      }

      links.push({
        source: targetWorker,
        target: podKey,
        linkType: 'pod-link',
        value: 1,
      });
    }
  } else {
    // Fallback placeholder pods when waiting for cluster data
    const allRoutes = Object.values(ROUTE_BY_NAMESPACE);
    const fallbackWorker = workerNodes.length > 0 ? 'worker-0' : 'control-plane';

    for (const route of allRoutes) {
      const podKey = `pod-${route.namespace}`;
      graphNodes.push({
        id: podKey,
        name: `${route.namespace}-pod`,
        type: 'pod',
        namespace: route.namespace,
        status: 'Running',
        color: route.color,
        val: 7,
      });
      links.push({
        source: fallbackWorker,
        target: podKey,
        linkType: 'pod-link',
        value: 1,
      });
    }
  }

  return { nodes: graphNodes, links };
}

function routeForNode(node: GraphNode): PortfolioRoute | null {
  if (node.type === 'pod' && node.namespace) {
    return ROUTE_BY_NAMESPACE[node.namespace] ?? null;
  }
  return null;
}

export default function ClusterScene3D({
  pods,
  nodes,
  onNodeSelect,
  darkMode,
}: ClusterScene3DProps) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const linkConfigured = useRef(false);

  const [width, setWidth] = useState(800);
  const [graphHeight, setGraphHeight] = useState(540);

  const signature = useMemo(() => topologySignature(pods, nodes), [pods, nodes]);
  const graphData = useMemo(() => buildGraph(pods, nodes), [signature]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let frame = 0;
    let debounce = 0;

    const applySize = () => {
      const nextWidth = Math.floor(el.getBoundingClientRect().width);
      if (nextWidth < 1) return;
      setWidth((previous) => (Math.abs(previous - nextWidth) < 2 ? previous : nextWidth));
      setGraphHeight(nextWidth < 640 ? 380 : nextWidth < 1024 ? 480 : 540);
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
      linkForce.distance((link: any) =>
        link.linkType === 'control-link' ? CONTROL_LINK_DIST : POD_LINK_DIST,
      );
      linkConfigured.current = true;
    }
    const chargeForce = fg.d3Force('charge');
    if (chargeForce) {
      chargeForce.strength(-160);
    }
  }, []);

  useEffect(() => {
    linkConfigured.current = false;
    configureForces();
  }, [configureForces, graphData]);

  // ── 3D object rendering ────────────────────────────────────────────────────
  const nodeThreeObject = useCallback(
    (node: GraphNode) => {
      const group = new THREE.Group();

      if (node.type === 'control-plane') {
        // Octahedron core + torus wireframe
        const geom = new THREE.OctahedronGeometry(12, 0);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(darkMode ? '#818cf8' : '#4f46e5'),
          roughness: 0.2,
          metalness: 0.6,
          emissive: new THREE.Color(darkMode ? '#4338ca' : '#4f46e5'),
          emissiveIntensity: darkMode ? 0.5 : 0.2,
        });
        group.add(new THREE.Mesh(geom, mat));

        const wireGeom = new THREE.TorusGeometry(16, 0.35, 8, 24);
        const wireMat = new THREE.MeshBasicMaterial({
          color: darkMode ? '#a5b4fc' : '#6366f1',
          wireframe: true,
          transparent: true,
          opacity: darkMode ? 0.8 : 0.6,
        });
        const ring = new THREE.Mesh(wireGeom, wireMat);
        ring.rotation.x = Math.PI / 3;
        group.add(ring);

        const sprite = new SpriteText('⚡ API Server\n(Control Plane)');
        sprite.color = darkMode ? '#e0e7ff' : '#1e1b4b';
        sprite.textHeight = 4.2;
        sprite.fontFace = 'JetBrains Mono, monospace';
        sprite.fontWeight = 'bold';
        sprite.position.y = 20;
        group.add(sprite);
      } else if (node.type === 'worker-node') {
        // Box geometry for worker node
        const geom = new THREE.BoxGeometry(15, 12, 15);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(node.color),
          roughness: 0.3,
          metalness: 0.5,
          emissive: new THREE.Color(node.color),
          emissiveIntensity: darkMode ? 0.35 : 0.15,
        });
        group.add(new THREE.Mesh(geom, mat));

        // Shorten long node names for readability
        const displayName = node.name.length > 20
          ? node.name.slice(0, 8) + '…' + node.name.slice(-8)
          : node.name;

        const label = `🖥️ ${displayName}`;
        const sprite = new SpriteText(label);
        sprite.color = darkMode ? '#f1f5f9' : '#0f172a';
        sprite.textHeight = 3.8;
        sprite.fontFace = 'JetBrains Mono, monospace';
        sprite.fontWeight = 'bold';
        sprite.position.y = 15;
        group.add(sprite);
      } else {
        // Sphere for pod
        const isHealthy = node.status === 'Running' || node.status === 'Succeeded';
        const geom = new THREE.SphereGeometry(6, 20, 20);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(node.color),
          roughness: 0.2,
          metalness: 0.4,
          emissive: new THREE.Color(node.color),
          emissiveIntensity: isHealthy ? (darkMode ? 0.35 : 0.2) : 0.7,
        });
        group.add(new THREE.Mesh(geom, mat));

        const route = node.namespace ? ROUTE_BY_NAMESPACE[node.namespace] : null;
        const emoji = route
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
          : '●';
        const sprite = new SpriteText(`${emoji} ${node.namespace ?? 'pod'}`);
        sprite.color = darkMode ? '#e2e8f0' : '#1e293b';
        sprite.textHeight = 3.4;
        sprite.fontFace = 'JetBrains Mono, monospace';
        sprite.fontWeight = '600';
        sprite.position.y = 9.5;
        group.add(sprite);
      }

      return group;
    },
    [darkMode],
  );

  const handleNodeClick = useCallback(
    (node: GraphNode | null) => {
      if (!node) {
        onNodeSelect(null);
        return;
      }

      const fg = fgRef.current;
      if (fg && node.x != null && node.y != null && node.z != null) {
        const distance = 45;
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
        fg.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
          { x: node.x, y: node.y, z: node.z },
          2000,
        );
      }

      const route = routeForNode(node);
      onNodeSelect(route);
    },
    [onNodeSelect],
  );

  // Legend: show real node names
  const workerLegend = nodes.slice(0, 4).map((n, i) => ({
    color: NODE_COLORS[i % NODE_COLORS.length],
    label: n.name.length > 18 ? n.name.slice(0, 16) + '…' : n.name,
  }));

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-2xl border-2 transition-colors ${
        darkMode
          ? 'border-zinc-800 bg-zinc-950 shadow-[4px_4px_0_0_#18181b]'
          : 'border-zinc-200 bg-slate-50 shadow-[4px_4px_0_0_#e2e8f0]'
      }`}
      style={{ height: graphHeight }}
    >
      {/* Topology Legend Overlay */}
      <div
        className={`pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2 rounded-xl border p-2 text-[11px] font-medium backdrop-blur-md transition-colors ${
          darkMode
            ? 'border-zinc-800/80 bg-zinc-900/85 text-zinc-300'
            : 'border-zinc-200/90 bg-white/90 text-zinc-700 shadow-sm'
        }`}
      >
        <span className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
          <span className="h-2 w-2 rounded-sm bg-indigo-600 dark:bg-indigo-500" /> Control Plane
        </span>
        <span className="text-zinc-400">|</span>
        {workerLegend.map(({ color, label }) => (
          <span
            key={label}
            className="flex items-center gap-1.5"
            style={{ color: darkMode ? color : color }}
          >
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: color }}
            />{' '}
            {label}
          </span>
        ))}
        <span className="text-zinc-400">|</span>
        <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-500" /> Pods
        </span>
      </div>

      <ForceGraph3D
        ref={fgRef}
        width={width}
        height={graphHeight}
        graphData={graphData}
        nodeThreeObject={nodeThreeObject}
        onNodeClick={handleNodeClick}
        backgroundColor={darkMode ? '#090d16' : '#f8fafc'}
        linkColor={(link: any) =>
          link.linkType === 'control-link'
            ? darkMode ? '#6366f1' : '#4f46e5'
            : darkMode ? '#334155' : '#cbd5e1'
        }
        linkWidth={(link: any) => (link.linkType === 'control-link' ? 2.5 : 1.4)}
        linkDirectionalParticles={(link: any) => (link.linkType === 'control-link' ? 4 : 1)}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={(link: any) =>
          link.linkType === 'control-link' ? 0.007 : 0.003
        }
        linkDirectionalParticleColor={(link: any) =>
          link.linkType === 'control-link'
            ? darkMode ? '#a5b4fc' : '#4338ca'
            : darkMode ? '#38bdf8' : '#0284c7'
        }
        showNavInfo={false}
        enableNodeDrag={true}
      />
    </div>
  );
}

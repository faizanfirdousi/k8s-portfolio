import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';
import type { TopologyPod } from '../hooks/useTopology';
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
  clusterHealthy: boolean;
  onNodeSelect: (route: PortfolioRoute | null) => void;
  darkMode: boolean;
}

const CONTROL_LINK_DIST = 85;
const POD_LINK_DIST = 42;

function topologySignature(pods: TopologyPod[]): string {
  return pods
    .map((p) => `${p.namespace}|${p.name}|${p.status}|${p.node ?? ''}`)
    .sort()
    .join('\n');
}

/**
 * Builds a hierarchical topology graph:
 * Control Plane (server-0)
 *   ├── Worker Node 1 (agent-0) ──> [frontend, about, projects pods]
 *   └── Worker Node 2 (agent-1) ──> [skills, blog, contact, proxy pods]
 */
function buildGraph(pods: TopologyPod[]): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // 1. Control Plane Node
  nodes.push({
    id: 'control-plane',
    name: 'Control Plane (server-0)',
    type: 'control-plane',
    color: '#4f46e5',
    val: 14,
    y: 45,
  });

  // 2. Two Worker Nodes
  const worker1Id = 'worker-node-1';
  const worker2Id = 'worker-node-2';

  nodes.push({
    id: worker1Id,
    name: 'Worker Node 1 (agent-0)',
    type: 'worker-node',
    nodeName: 'k3d-portfolio-agent-0',
    color: '#0284c7',
    val: 11,
  });

  nodes.push({
    id: worker2Id,
    name: 'Worker Node 2 (agent-1)',
    type: 'worker-node',
    nodeName: 'k3d-portfolio-agent-1',
    color: '#0d9488',
    val: 11,
  });

  // Links from Control Plane to both Worker Nodes
  links.push({
    source: 'control-plane',
    target: worker1Id,
    linkType: 'control-link',
    value: 3,
  });

  links.push({
    source: 'control-plane',
    target: worker2Id,
    linkType: 'control-link',
    value: 3,
  });

  // 3. Pods: attached to respective worker node
  const node1AssignedNs = new Set(['frontend', 'about', 'projects']);

  if (pods.length > 0) {
    for (const pod of pods) {
      const podKey = `pod-${pod.namespace}-${pod.name}`;
      const route = ROUTE_BY_NAMESPACE[pod.namespace];
      const podColor = route?.color ?? '#6366f1';

      nodes.push({
        id: podKey,
        name: pod.name,
        type: 'pod',
        namespace: pod.namespace,
        status: pod.status,
        color: podColor,
        val: 7,
      });

      // Target worker node assignment
      let targetWorker = worker1Id;
      if (pod.node) {
        if (pod.node.includes('agent-1') || pod.node.includes('node-2')) {
          targetWorker = worker2Id;
        } else if (pod.node.includes('agent-0') || pod.node.includes('node-1')) {
          targetWorker = worker1Id;
        } else {
          targetWorker = node1AssignedNs.has(pod.namespace) ? worker1Id : worker2Id;
        }
      } else {
        targetWorker = node1AssignedNs.has(pod.namespace) ? worker1Id : worker2Id;
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
    for (const route of allRoutes) {
      const podKey = `pod-${route.namespace}`;
      nodes.push({
        id: podKey,
        name: `${route.namespace}-pod`,
        type: 'pod',
        namespace: route.namespace,
        status: 'Running',
        color: route.color,
        val: 7,
      });

      const targetWorker = node1AssignedNs.has(route.namespace) ? worker1Id : worker2Id;
      links.push({
        source: targetWorker,
        target: podKey,
        linkType: 'pod-link',
        value: 1,
      });
    }
  }

  return { nodes, links };
}

function routeForNode(node: GraphNode): PortfolioRoute | null {
  if (node.type === 'pod' && node.namespace) {
    return ROUTE_BY_NAMESPACE[node.namespace] ?? null;
  }
  return null;
}

export default function ClusterScene3D({ pods, onNodeSelect, darkMode }: ClusterScene3DProps) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const linkConfigured = useRef(false);

  const [width, setWidth] = useState(800);
  const [graphHeight, setGraphHeight] = useState(540);

  const signature = useMemo(() => topologySignature(pods), [pods]);
  const graphData = useMemo(() => buildGraph(pods), [signature]);

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
      chargeForce.strength(-150);
    }
  }, []);

  useEffect(() => {
    configureForces();
  }, [configureForces, graphData]);

  // 3D Object rendering for Control Plane, Worker Nodes, and Pods
  const nodeThreeObject = useCallback(
    (node: GraphNode) => {
      const group = new THREE.Group();

      if (node.type === 'control-plane') {
        // Control Plane: Octahedron core + Torus wireframe
        const geom = new THREE.OctahedronGeometry(12, 0);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(darkMode ? '#818cf8' : '#4f46e5'),
          roughness: 0.2,
          metalness: 0.6,
          emissive: new THREE.Color(darkMode ? '#4338ca' : '#4f46e5'),
          emissiveIntensity: darkMode ? 0.5 : 0.2,
        });
        const mesh = new THREE.Mesh(geom, mat);
        group.add(mesh);

        // Orbital wireframe
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

        const sprite = new SpriteText('⚡ Control Plane\n(API Server · k3d-server-0)');
        sprite.color = darkMode ? '#e0e7ff' : '#1e1b4b';
        sprite.textHeight = 4.2;
        sprite.fontFace = 'JetBrains Mono, monospace';
        sprite.fontWeight = 'bold';
        sprite.position.y = 20;
        group.add(sprite);
      } else if (node.type === 'worker-node') {
        // Worker Node: Box
        const geom = new THREE.BoxGeometry(15, 12, 15);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(node.color),
          roughness: 0.3,
          metalness: 0.5,
          emissive: new THREE.Color(node.color),
          emissiveIntensity: darkMode ? 0.35 : 0.15,
        });
        const mesh = new THREE.Mesh(geom, mat);
        group.add(mesh);

        const sprite = new SpriteText(`🖥️ ${node.name}`);
        sprite.color = darkMode ? '#f1f5f9' : '#0f172a';
        sprite.textHeight = 3.8;
        sprite.fontFace = 'JetBrains Mono, monospace';
        sprite.fontWeight = 'bold';
        sprite.position.y = 15;
        group.add(sprite);
      } else {
        // Pod: Colored Sphere
        const isHealthy = node.status === 'Running' || node.status === 'Succeeded';
        const geom = new THREE.SphereGeometry(6, 20, 20);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(node.color),
          roughness: 0.2,
          metalness: 0.4,
          emissive: new THREE.Color(node.color),
          emissiveIntensity: isHealthy ? (darkMode ? 0.35 : 0.2) : 0.7,
        });
        const mesh = new THREE.Mesh(geom, mat);
        group.add(mesh);

        const route = node.namespace ? ROUTE_BY_NAMESPACE[node.namespace] : null;
        const emoji = route ? (route.id === 'home' ? '⌂' : route.id === 'about' ? '◈' : route.id === 'projects' ? '◧' : route.id === 'skills' ? '◇' : route.id === 'blog' ? '◎' : '◉') : '●';
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
        <span className="text-zinc-300 dark:text-zinc-700">|</span>
        <span className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400">
          <span className="h-2 w-2 rounded-sm bg-sky-600 dark:bg-sky-500" /> Worker 01
        </span>
        <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
          <span className="h-2 w-2 rounded-sm bg-teal-600 dark:bg-teal-500" /> Worker 02
        </span>
        <span className="text-zinc-300 dark:text-zinc-700">|</span>
        <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-500" /> Hosted Pods
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

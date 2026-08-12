import { useEffect, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Server, Activity, AlertCircle } from 'lucide-react';

// Custom Pod Node Component
const PodNode = ({ data }: any) => {
  return (
    <div className={`node-pod ns-${data.namespace}`}>
      <div className="pod-name" title={data.name}>
        {data.name}
      </div>
      <div className="pod-namespace">
        ns/{data.namespace}
      </div>
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
};

// Custom Cluster/Node Group Component
const ClusterNode = ({ data }: any) => {
  return (
    <div className="node-cluster" style={{ width: data.width, height: data.height }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.8 }}>
        <Server size={14} />
        {data.label}
      </div>
    </div>
  );
};

const nodeTypes = {
  pod: PodNode,
  cluster: ClusterNode,
};

interface TopologyData {
  nodes: { name: string; status: string; podCount: number }[];
  pods: { name: string; namespace: string; node: string; status: string }[];
  fetchedAt: string;
}

export default function TopologyMap() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [data, setData] = useState<TopologyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchTopology = async () => {
    try {
      // In development, this might hit a proxy, but in prod it hits the ingress
      const res = await fetch('/api/topology');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: TopologyData = await res.json();
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("Failed to fetch topology:", err);
      setError(err.message || 'Failed to connect to cluster proxy');
    }
  };

  useEffect(() => {
    fetchTopology();
    const interval = setInterval(fetchTopology, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  // Transform K8s data into React Flow nodes
  useEffect(() => {
    if (!data) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    // Constants for layout
    const NODE_WIDTH = 350;
    const NODE_HEIGHT = 400;
    const POD_WIDTH = 200;
    const POD_HEIGHT = 60;
    const SPACING_X = 50;
    
    // We'll arrange k3d nodes horizontally
    data.nodes.forEach((k8sNode, nodeIdx) => {
      const startX = nodeIdx * (NODE_WIDTH + SPACING_X);
      
      // The parent box for the Node
      newNodes.push({
        id: `node-${k8sNode.name}`,
        type: 'cluster',
        position: { x: startX, y: 0 },
        data: { 
          label: k8sNode.name,
          width: NODE_WIDTH,
          height: NODE_HEIGHT
        },
        style: { 
          zIndex: -1,
          width: NODE_WIDTH,
          height: NODE_HEIGHT
        },
        draggable: false,
      });
      
      // Find pods running on this node
      const nodePods = data.pods.filter(p => p.node === k8sNode.name);
      
      // Arrange pods inside the node box
      nodePods.forEach((pod, podIdx) => {
        newNodes.push({
          id: `pod-${pod.name}`,
          type: 'pod',
          parentId: `node-${k8sNode.name}`,
          position: { 
            x: (NODE_WIDTH - POD_WIDTH) / 2, 
            y: 50 + (podIdx * (POD_HEIGHT + 15)) 
          },
          data: {
            name: pod.name,
            namespace: pod.namespace,
            status: pod.status
          },
        });
      });
    });

    setNodes(newNodes);
    setEdges(newEdges); // Edges can be added later if you want to show traffic flow
  }, [data, setNodes, setEdges]);

  return (
    <div className="topology-container">
      {/* Status Panel overlay */}
      <div className="status-panel glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
          <Activity size={16} className={error ? "text-red-400" : "text-teal-400"} />
          <h3 style={{ fontSize: '0.9rem', margin: 0 }}>Cluster Live View</h3>
        </div>
        
        {error ? (
          <div style={{ color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} />
            {error}
          </div>
        ) : data ? (
          <>
            <div className="status-row">
              <span className="status-label">Nodes</span>
              <span className="status-value">{data.nodes.length}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Pods</span>
              <span className="status-value">{data.pods.length}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Last sync</span>
              <span className="status-value">{lastUpdated.toLocaleTimeString()}</span>
            </div>
          </>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Connecting to cluster...</div>
        )}
      </div>

      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="rgba(255, 255, 255, 0.05)" gap={20} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}

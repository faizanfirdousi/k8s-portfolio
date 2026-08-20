export interface ResourceSummary {
  cpu?: string;
  memory?: string;
}

export interface ContainerInfo {
  name: string;
  ready: boolean;
  restarts: number;
  state: string;
  stateReason?: string;
  image?: string;
}

export interface NodeResources {
  cpuCapacity?: string;
  memoryCapacity?: string;
  cpuAllocatable?: string;
  memoryAllocatable?: string;
  maxPods?: string;
}

export interface TopologyNode {
  name: string;
  status: string;
  podCount: number;
  roles?: string[];
  kubeletVersion?: string;
  osImage?: string;
  architecture?: string;
  containerRuntime?: string;
  resources?: NodeResources;
}


export interface TopologyPod {
  name: string;
  namespace: string;
  node: string;
  status: string;
  labels: Record<string, string>;
  ready: string;
  restarts: number;
  age: string;
  startedAt?: string;
  containers: ContainerInfo[];
  resourceRequests?: ResourceSummary;
  resourceLimits?: ResourceSummary;
}

export interface TopologyData {
  clusterName: string;
  clusterVersion: string;
  nodes: TopologyNode[];
  pods: TopologyPod[];
  fetchedAt: string;
}

export interface ClusterEvent {
  type: string;
  reason: string;
  message: string;
  object: string;
  namespace: string;
  count: number;
  age: string;
  lastSeen: string;
}

export interface EventsData {
  events: ClusterEvent[];
  fetchedAt: string;
}

export interface PodDetailData extends TopologyPod {
  events: ClusterEvent[];
}

export type PodRef = Pick<TopologyPod, 'namespace' | 'name'>;

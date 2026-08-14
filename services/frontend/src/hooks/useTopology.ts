import { useEffect, useState } from 'react';

export interface TopologyNode {
  name: string;
  status: string;
  podCount: number;
}

export interface TopologyPod {
  name: string;
  namespace: string;
  node: string;
  status: string;
}

export interface TopologyData {
  nodes: TopologyNode[];
  pods: TopologyPod[];
  fetchedAt: string;
}

export function useTopology(pollMs = 5000) {
  const [data, setData] = useState<TopologyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchTopology = async () => {
      try {
        const res = await fetch('/api/topology');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: TopologyData = await res.json();
        if (!cancelled) {
          setData(json);
          setError(null);
          setLastUpdated(new Date());
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to connect');
        }
      }
    };

    fetchTopology();
    const interval = setInterval(fetchTopology, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs]);

  const frontendPod = data?.pods.find((p) => p.namespace === 'frontend');

  return { data, error, lastUpdated, frontendPod };
}

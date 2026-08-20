import { useEffect, useState } from 'react';
import type { TopologyData } from '../types/topology';

export type { TopologyData, TopologyNode, TopologyPod } from '../types/topology';

export function useTopology(pollMs = 5000) {
  const [data, setData] = useState<TopologyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchTopology = async () => {
      try {
        const startedAt = performance.now();
        const res = await fetch('/api/topology');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: TopologyData = await res.json();
        if (!cancelled) {
          setData(json);
          setError(null);
          setLastUpdated(new Date());
          setResponseTimeMs(Math.round(performance.now() - startedAt));
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

  return { data, error, lastUpdated, responseTimeMs, frontendPod };
}

import { useState, useEffect } from 'react';

export interface MetricsResponse {
  totalPods: string;
  totalCpuRequests: string;
  totalMemoryRequests: string;
  fetchedAt: string;
}

export function useMetrics(pollIntervalMs = 5000) {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/metrics');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted) {
          setMetrics(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchMetrics();
    const intervalId = setInterval(fetchMetrics, pollIntervalMs);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [pollIntervalMs]);

  return { metrics, loading, error };
}

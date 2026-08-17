import { useEffect, useState } from 'react';
import type { PodDetailData, PodRef } from '../types/topology';

export function usePodDetail(selected: PodRef | null) {
  const [detail, setDetail] = useState<PodDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/pods/${encodeURIComponent(selected.namespace)}/${encodeURIComponent(selected.name)}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: PodDetailData = await res.json();
        if (!cancelled) {
          setDetail(json);
          setError(null);
        }
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) {
          return;
        }
        setDetail(null);
        setError(err instanceof Error ? err.message : 'Failed to load pod details');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchDetail();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selected?.namespace, selected?.name]);

  return { detail, loading, error };
}

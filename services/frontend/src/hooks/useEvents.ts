import { useEffect, useState } from 'react';
import type { ClusterEvent } from '../types/topology';

export function useEvents(pollMs = 5000, namespace?: string) {
  const [events, setEvents] = useState<ClusterEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async () => {
      try {
        const query = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
        const res = await fetch(`/api/events${query}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setEvents(json.events ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch events');
        }
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs, namespace]);

  return { events, error };
}

import { useEffect, useState } from 'react';

export interface PageMetrics {
  loadMs: number | null;
  ttfbMs: number | null;
}

/** Browser-observed navigation timings for the document currently on screen. */
export function usePageMetrics(): PageMetrics {
  const [metrics, setMetrics] = useState<PageMetrics>({ loadMs: null, ttfbMs: null });

  useEffect(() => {
    const collect = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (!navigation) return;

      setMetrics({
        loadMs: Math.round(navigation.loadEventEnd || navigation.duration),
        ttfbMs: Math.round(navigation.responseStart - navigation.requestStart),
      });
    };

    const collectAfterLoad = () => window.setTimeout(collect, 0);

    if (document.readyState === 'complete') collect();
    else window.addEventListener('load', collectAfterLoad, { once: true });

    return () => window.removeEventListener('load', collectAfterLoad);
  }, []);

  return metrics;
}

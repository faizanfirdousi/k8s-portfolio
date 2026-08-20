import { useEffect, useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import MainContent from './components/MainContent';
import MetricsPanel from './components/MetricsPanel';
import PodDetailDrawer from './components/PodDetailDrawer';
import { useTopology } from './hooks/useTopology';
import { usePodDetail } from './hooks/usePodDetail';
import { useEvents } from './hooks/useEvents';
import { usePageMetrics } from './hooks/usePageMetrics';
import type { PodRef } from './types/topology';

type View = 'cluster' | 'table';

function App() {
  const { data, error, lastUpdated, responseTimeMs, frontendPod } = useTopology();
  const pageMetrics = usePageMetrics();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedPod, setSelectedPod] = useState<PodRef | null>(null);
  const [view, setView] = useState<View>('cluster');
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('portfolio-theme');
    return savedTheme ? savedTheme === 'dark' : false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('portfolio-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const { detail, loading: podLoading, error: podError } = usePodDetail(selectedPod);
  const { events } = useEvents();

  return (
    <div className="app-shell flex min-h-screen flex-col bg-zinc-50">
      <Header
        clusterOnline={!error && !!data}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((v) => !v)}
        view={view}
        onViewChange={setView}
        darkMode={darkMode}
        onThemeToggle={() => setDarkMode((value) => !value)}
      />
      <MobileNav />

      <div className="flex flex-1 flex-col xl:flex-row xl:overflow-hidden">
        <Sidebar
          frontendPod={frontendPod}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          pods={data?.pods ?? []}
        />
        <MainContent
          pods={data?.pods ?? []}
          clusterHealthy={!error && !!data}
          onPodClick={setSelectedPod}
          view={view}
          onViewChange={setView}
          darkMode={darkMode}
          pageMetrics={pageMetrics}
          topologyResponseMs={responseTimeMs}
        />
        <MetricsPanel
          data={data}
          error={error}
          lastUpdated={lastUpdated}
          events={events}
          onPodClick={setSelectedPod}
          pageMetrics={pageMetrics}
          topologyResponseMs={responseTimeMs}
        />
      </div>

      <PodDetailDrawer
        selected={selectedPod}
        detail={detail}
        loading={podLoading}
        error={podError}
        onClose={() => setSelectedPod(null)}
      />
    </div>
  );
}

export default App;

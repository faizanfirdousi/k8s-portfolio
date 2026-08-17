import { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import MainContent from './components/MainContent';
import MetricsPanel from './components/MetricsPanel';
import PodDetailDrawer from './components/PodDetailDrawer';
import { useTopology } from './hooks/useTopology';
import { usePodDetail } from './hooks/usePodDetail';
import { useEvents } from './hooks/useEvents';
import type { PodRef } from './types/topology';

function App() {
  const { data, error, lastUpdated, frontendPod } = useTopology();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedPod, setSelectedPod] = useState<PodRef | null>(null);

  const { detail, loading: podLoading, error: podError } = usePodDetail(selectedPod);
  const { events } = useEvents();

  const handlePodClick = (ref: PodRef) => setSelectedPod(ref);
  const handleDrawerClose = () => setSelectedPod(null);

  return (
    <div className="dash-shell">
      <div className="bg-glow" />
      <div className="bg-grid" />

      <Header
        clusterOnline={!error && !!data}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((v) => !v)}
      />
      <MobileNav />

      <div className="dash-body">
        <Sidebar
          frontendPod={frontendPod}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
        />
        <MainContent
          pods={data?.pods ?? []}
          clusterHealthy={!error && !!data}
          onPodClick={handlePodClick}
        />
        <MetricsPanel
          data={data}
          error={error}
          lastUpdated={lastUpdated}
          events={events}
          onPodClick={handlePodClick}
        />
      </div>

      <PodDetailDrawer
        selected={selectedPod}
        detail={detail}
        loading={podLoading}
        error={podError}
        onClose={handleDrawerClose}
      />
    </div>
  );
}

export default App;

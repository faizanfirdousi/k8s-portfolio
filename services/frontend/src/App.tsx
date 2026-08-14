import { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import MainContent from './components/MainContent';
import MetricsPanel from './components/MetricsPanel';
import { useTopology } from './hooks/useTopology';

function App() {
  const { data, error, lastUpdated, frontendPod } = useTopology();
  const [menuOpen, setMenuOpen] = useState(false);

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
        <MainContent pods={data?.pods ?? []} clusterHealthy={!error && !!data} />
        <MetricsPanel data={data} error={error} lastUpdated={lastUpdated} />
      </div>
    </div>
  );
}

export default App;

import { Terminal, Code, ExternalLink } from 'lucide-react';
import TopologyMap from './components/TopologyMap';

function App() {
  return (
    <div className="app-container">
      {/* Animated background glow */}
      <div className="bg-glow"></div>

      {/* Navigation Shell */}
      <nav className="navbar">
        <div className="nav-brand">
          <Terminal size={24} className="text-accent-primary" />
          <span>Faizan</span>Firdousi
        </div>
        
        <div className="nav-links">
          {/* Note: In a real SPA we'd use react-router, but since this portfolio 
              is built with microservices where each section is a separate K8s pod 
              served via ingress, we use standard anchor tags to force a hard navigation. */}
          <a href="/" className="nav-link active">Home (Topology)</a>
          <a href="/about" className="nav-link">About</a>
          <a href="/projects" className="nav-link">Projects</a>
          <a href="/blog" className="nav-link">Blog</a>
          <a href="/contact" className="nav-link">Contact</a>
        </div>
      </nav>

      <main className="main-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div className="badge badge-live">
              <div className="dot-pulse"></div>
              Live on Kubernetes (k3d)
            </div>
          </div>
          
          <h1 className="hero-title">
            DevOps & Platform Engineering
          </h1>
          
          <p className="hero-subtitle">
            This portfolio isn't just a static site — it's a microservices architecture 
            running on a real Kubernetes cluster. Each section you visit is served by a 
            dedicated pod, routed via Traefik, and the map below is generated live 
            from the K8s API.
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
            <a 
              href="https://github.com/faizanfirdousi" 
              target="_blank" 
              rel="noreferrer"
              className="glass-panel"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', textDecoration: 'none', color: 'var(--text-main)', fontWeight: 500, transition: 'all 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
            >
              <Code size={18} />
              GitHub
            </a>
            <a 
              href="/about" 
              className="glass-panel"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', textDecoration: 'none', color: 'var(--text-main)', fontWeight: 500, background: 'var(--accent-primary-glow)', borderColor: 'var(--border-glow)' }}
            >
              Enter Portfolio
              <ExternalLink size={18} />
            </a>
          </div>
        </section>

        {/* The Live Cluster Map */}
        <TopologyMap />
      </main>
    </div>
  );
}

export default App;

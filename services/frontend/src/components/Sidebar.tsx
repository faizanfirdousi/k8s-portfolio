import { Code, Mail, RotateCcw, Scale, FileCode2 } from 'lucide-react';
import type { TopologyPod } from '../hooks/useTopology';

interface SidebarProps {
  frontendPod: TopologyPod | undefined;
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { label: 'About', path: '/about', desc: '/about' },
  { label: 'Projects', path: '/projects', desc: '/projects' },
  { label: 'Blog', path: '/blog', desc: '/blog' },
  { label: 'Contact', path: '/contact', desc: '/contact' },
];

export default function Sidebar({ frontendPod, open, onClose }: SidebarProps) {
  return (
    <>
      <div
        className={`dash-sidebar-backdrop ${open ? 'dash-sidebar-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`dash-sidebar ${open ? 'dash-sidebar--open' : ''}`}>
        <div className="dash-sidebar__profile">
          <div className="dash-sidebar__avatar">FF</div>
          <h2 className="dash-sidebar__name">Hi, I'm Faizan</h2>
          <p className="dash-sidebar__role">SRE • DevOps Enthusiast • Builder</p>
          <p className="dash-sidebar__bio">
            "The best way to predict the future is to build it."
          </p>
        </div>

        <nav className="dash-sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className="dash-sidebar__nav-link"
              onClick={onClose}
            >
              <span className="dash-sidebar__nav-label">{item.label}</span>
              <span className="dash-sidebar__nav-path mono">{item.desc}</span>
            </a>
          ))}
        </nav>

        <div className="dash-sidebar__here glass-panel">
          <h3 className="dash-sidebar__section-title">You Are Here</h3>
          <div className="dash-sidebar__here-row">
            <span className="label">Namespace</span>
            <span className="value mono">frontend</span>
          </div>
          <div className="dash-sidebar__here-row">
            <span className="label">Pod</span>
            <span className="value mono accent">
              {frontendPod?.name ?? 'frontend-*'}
            </span>
          </div>
          <div className="dash-sidebar__here-row">
            <span className="label">Status</span>
            <span className={`value mono ${frontendPod?.status === 'Running' ? 'accent' : 'warn'}`}>
              {frontendPod?.status ?? '—'}
            </span>
          </div>
          <div className="dash-sidebar__here-row">
            <span className="label">Ready</span>
            <span className="value mono">{frontendPod?.ready ?? '—/—'}</span>
          </div>
          <div className="metric-slot-grid metric-slot-grid--compact">
            <div className="metric-slot">
              <span className="metric-slot__label">Restarts</span>
              <span className={`metric-slot__value mono ${(frontendPod?.restarts ?? 0) > 0 ? 'warn' : ''}`}>
                {frontendPod ? frontendPod.restarts : '—'}
              </span>
            </div>
            <div className="metric-slot">
              <span className="metric-slot__label">Age</span>
              <span className="metric-slot__value mono">{frontendPod?.age ?? '—'}</span>
            </div>
          </div>
        </div>

        <div className="dash-sidebar__controls glass-panel">
          <h3 className="dash-sidebar__section-title">Cluster Controls</h3>
          <button type="button" className="dash-sidebar__control-btn" disabled>
            <Scale size={14} />
            Scale a Deployment
          </button>
          <button type="button" className="dash-sidebar__control-btn" disabled>
            <RotateCcw size={14} />
            Restart a Pod
          </button>
          <button type="button" className="dash-sidebar__control-btn" disabled>
            <FileCode2 size={14} />
            View YAML
          </button>
          <p className="dash-sidebar__controls-hint">Interactive controls coming soon</p>
        </div>

        <footer className="dash-sidebar__footer">
          <div className="dash-sidebar__social">
            <a href="https://github.com/faizanfirdousi" target="_blank" rel="noreferrer" aria-label="GitHub">
              <Code size={16} />
            </a>
            <a href="/contact" aria-label="Email"><Mail size={16} /></a>
          </div>
          <p className="dash-sidebar__copyright">© 2026 Faizan Firdousi</p>
        </footer>
      </aside>
    </>
  );
}

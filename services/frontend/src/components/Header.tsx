import { Moon, Menu, Settings, Terminal, X } from 'lucide-react';

interface HeaderProps {
  clusterOnline: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
}

export default function Header({ clusterOnline, menuOpen, onMenuToggle }: HeaderProps) {
  return (
    <header className="dash-header">
      <div className="dash-header__left">
        <button
          type="button"
          className="dash-header__menu-btn"
          onClick={onMenuToggle}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="dash-header__logo">
          <span className="dash-header__logo-k8s">K8s.dev</span>
          <span className="dash-header__logo-sep">/</span>
          <span className="dash-header__logo-app">portfolio</span>
        </div>
        <div className={`dash-header__status ${clusterOnline ? 'online' : 'offline'}`}>
          <span className="dash-header__status-dot" />
          <span className="dash-header__status-text">
            {clusterOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="dash-header__right">
        <button type="button" className="dash-header__tab dash-header__tab--active">
          Cluster View
        </button>
        <button type="button" className="dash-header__tab dash-header__tab--kubectl">
          <Terminal size={14} />
          <span>kubectl</span>
        </button>
        <button type="button" className="dash-header__icon-btn" aria-label="Settings">
          <Settings size={16} />
        </button>
        <button type="button" className="dash-header__icon-btn dash-header__icon-btn--theme" aria-label="Toggle theme">
          <Moon size={16} />
        </button>
      </div>
    </header>
  );
}

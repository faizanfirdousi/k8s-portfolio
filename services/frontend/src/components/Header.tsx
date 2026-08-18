import { Menu, X, LayoutGrid, Table2, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type View = 'cluster' | 'table';

interface HeaderProps {
  clusterOnline: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
  view: View;
  onViewChange: (v: View) => void;
  darkMode: boolean;
  onThemeToggle: () => void;
}

export default function Header({
  clusterOnline,
  menuOpen,
  onMenuToggle,
  view,
  onViewChange,
  darkMode,
  onThemeToggle,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </Button>

        <div className="flex items-center gap-2 text-sm font-semibold sm:text-base">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/30">K</span>
          <span><span className="text-indigo-600">K8s</span><span className="text-zinc-400">.dev</span><span className="text-zinc-900">/portfolio</span></span>
        </div>

        <span
          className={cn(
            'hidden items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide sm:inline-flex',
            clusterOnline
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-600',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', clusterOnline ? 'bg-green-500' : 'bg-red-500')} />
          {clusterOnline ? 'Live' : 'Offline'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onThemeToggle} aria-label={darkMode ? 'Use light mode' : 'Use dark mode'}>
          {darkMode ? <Sun size={17} /> : <Moon size={17} />}
        </Button>
        <Button
          variant={view === 'cluster' ? 'accent' : 'secondary'}
          size="sm"
          onClick={() => onViewChange('cluster')}
          aria-pressed={view === 'cluster'}
          className="hidden sm:inline-flex"
        >
          <LayoutGrid size={14} />
          Cluster
        </Button>
        <Button
          variant={view === 'table' ? 'accent' : 'secondary'}
          size="sm"
          onClick={() => onViewChange('table')}
          aria-pressed={view === 'table'}
          className="hidden sm:inline-flex"
        >
          <Table2 size={14} />
          Table
        </Button>
        <Button
          variant={view === 'cluster' ? 'accent' : 'outline'}
          size="icon"
          onClick={() => onViewChange('cluster')}
          className="sm:hidden"
          aria-label="Cluster view"
        >
          <LayoutGrid size={16} />
        </Button>
        <Button
          variant={view === 'table' ? 'accent' : 'outline'}
          size="icon"
          onClick={() => onViewChange('table')}
          className="sm:hidden"
          aria-label="Table view"
        >
          <Table2 size={16} />
        </Button>
      </div>
    </header>
  );
}

import { NAV_ITEMS } from '../config/portfolioRoutes';

export default function MobileNav() {
  return (
    <nav
      className="mobile-nav flex gap-2 overflow-x-auto snap-x snap-mandatory border-b border-zinc-200 bg-white px-4 py-3 xl:hidden"
      aria-label="Section navigation"
      style={{ scrollbarWidth: 'none' }}
    >
      {NAV_ITEMS.map((item) => (
        <a
          key={item.path}
          href={item.path}
          className="shrink-0 snap-start rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

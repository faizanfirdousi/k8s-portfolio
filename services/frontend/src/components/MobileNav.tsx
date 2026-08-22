import { NAV_ITEMS } from '../config/portfolioRoutes';

export default function MobileNav() {
  return (
    <nav
      className="mobile-nav flex gap-2 overflow-x-auto snap-x snap-mandatory border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900 xl:hidden"
      aria-label="Section navigation"
      style={{ scrollbarWidth: 'none' }}
    >
      {NAV_ITEMS.map((item) => (
        <a
          key={item.path}
          href={item.path}
          className="shrink-0 snap-start rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-900 transition-colors hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-indigo-400 dark:hover:bg-indigo-950 dark:hover:text-indigo-200"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export interface PortfolioRoute {
  id: string;
  namespace: string;
  route: string;
  label: string;
  color: string;
  href: string;
  description: string;
}

/** Portfolio sections mapped by Kubernetes namespace */
export const PORTFOLIO_ROUTES: PortfolioRoute[] = [
  {
    id: 'home',
    namespace: 'frontend',
    route: '/',
    label: 'home',
    color: '#6366f1',
    href: '/',
    description: 'Portfolio homepage. This is where you are now.',
  },
  {
    id: 'about',
    namespace: 'about',
    route: '/about',
    label: 'about',
    color: '#a855f7',
    href: '/about',
    description: 'Background, experience, and who I am as an engineer.',
  },
  {
    id: 'projects',
    namespace: 'projects',
    route: '/projects',
    label: 'projects',
    color: '#3b82f6',
    href: '/projects',
    description: 'Featured projects and code repositories.',
  },
  {
    id: 'skills',
    namespace: 'skills',
    route: '/skills',
    label: 'skills',
    color: '#14b8a6',
    href: '/skills',
    description: 'Technical skills, tools, and areas of expertise.',
  },
  {
    id: 'blog',
    namespace: 'blog',
    route: '/blog',
    label: 'blog',
    color: '#f97316',
    href: '/blog',
    description: 'Writing on cloud, Go, systems, and Kubernetes.',
  },
  {
    id: 'contact',
    namespace: 'contact',
    route: '/contact',
    label: 'contact',
    color: '#22c55e',
    href: '/contact',
    description: "Get in touch — I'm open to new opportunities.",
  },
];

export const ROUTE_BY_NAMESPACE: Record<string, PortfolioRoute> = Object.fromEntries(
  PORTFOLIO_ROUTES.map((r) => [r.namespace, r]),
);

export const ROUTE_BY_ID: Record<string, PortfolioRoute> = Object.fromEntries(
  PORTFOLIO_ROUTES.map((r) => [r.id, r]),
);

export const NAV_ITEMS = PORTFOLIO_ROUTES.map((r) => ({
  id: r.id,
  label: r.label.charAt(0).toUpperCase() + r.label.slice(1),
  path: r.route,
  desc: r.route,
  emoji: r.id === 'home' ? '⌂' : r.id === 'about' ? '◈' : r.id === 'projects' ? '◧' : r.id === 'skills' ? '◇' : r.id === 'blog' ? '◎' : '◉',
  ns: r.namespace,
  color: r.color,
}));

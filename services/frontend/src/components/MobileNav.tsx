const NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Projects', path: '/projects' },
  { label: 'Blog', path: '/blog' },
  { label: 'Contact', path: '/contact' },
];

export default function MobileNav() {
  return (
    <nav className="dash-mobile-nav" aria-label="Section navigation">
      {NAV_ITEMS.map((item) => (
        <a key={item.path} href={item.path} className="dash-mobile-nav__link">
          {item.label}
        </a>
      ))}
    </nav>
  );
}

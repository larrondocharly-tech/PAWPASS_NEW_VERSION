'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface TopNavProps {
  title?: string;
  onSignOut?: () => void;
}

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/scan', label: 'Scanner' },
  { href: '/transactions', label: 'Historique' },
  { href: '/how-it-works', label: 'Comment ça marche ?' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
  { href: '/settings', label: 'Paramètres' }
];

export default function TopNav({ title = 'PawPass', onSignOut }: TopNavProps) {
  const pathname = usePathname();

  return (
    <div className="nav">
      <strong>{title}</strong>
      <div className="nav-links" style={{ flexWrap: 'wrap' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#0f172a' : 'inherit',
                background: isActive ? '#e2e8f0' : 'transparent',
                padding: '6px 10px',
                borderRadius: 8
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
        {onSignOut && (
          <button className="button secondary" type="button" onClick={onSignOut}>
            Déconnexion
          </button>
        )}
      </div>
    </div>
  );
}

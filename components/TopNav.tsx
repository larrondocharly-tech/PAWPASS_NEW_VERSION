'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import AccountMenuOverlay from '@/components/AccountMenuOverlay';

interface TopNavProps {
  title?: string;
  onSignOut?: () => void;
}

const clientNavItems = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/scan', label: 'Scanner' }
];

const merchantNavItems = [{ href: '/merchant', label: 'Tableau de bord' }];

export default function TopNav({ title = 'PawPass', onSignOut }: TopNavProps) {
  const pathname = usePathname();
  const supabase = createClient();
  const [role, setRole] = useState<'client' | 'merchant'>('client');
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const loadRole = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setRole('client');
        setIsAuthenticated(false);
        return;
      }
      setIsAuthenticated(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        setRole('client');
        setIsAuthenticated(true);
        return;
      }

      setRole(data?.role?.toLowerCase() === 'merchant' ? 'merchant' : 'client');
    };

    void loadRole();
  }, [supabase]);

  const navItems = role === 'merchant' ? merchantNavItems : clientNavItems;
  const handleSignOut = onSignOut
    ? onSignOut
    : async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
      };

  return (
    <div className="nav">
      <strong>{title}</strong>
      <div className="nav-links" style={{ flexWrap: 'wrap' }}>
        {navItems.map((item) => {
          const isActive =
            role === 'merchant'
              ? pathname.startsWith('/merchant')
              : item.href === '/dashboard'
              ? pathname.startsWith('/dashboard')
              : pathname.startsWith('/scan');
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
        {isAuthenticated && (
          <>
            <button
              className="button secondary"
              type="button"
              onClick={() => setIsAccountMenuOpen(true)}
            >
              Menu
            </button>
          </>
        )}
      </div>
      {isAuthenticated && (
        <AccountMenuOverlay
          isOpen={isAccountMenuOpen}
          onClose={() => setIsAccountMenuOpen(false)}
          role={role}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  );
}

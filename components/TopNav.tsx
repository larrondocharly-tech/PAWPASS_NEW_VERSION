'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import AccountMenuOverlay from '@/components/AccountMenuOverlay';

interface TopNavProps {
  title?: string;
  onSignOut?: () => void;
}

const baseNavItems = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'scan', label: 'Scanner' },
  { key: 'history', label: 'Historique' }
] as const;

export default function TopNav({ title = 'PawPass', onSignOut }: TopNavProps) {
  const pathname = usePathname();
  const supabase = createClient();
  const [role, setRole] = useState<'user' | 'merchant' | 'admin'>('user');
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const loadRole = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setRole('user');
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
        setRole('user');
        setIsAuthenticated(true);
        return;
      }

      const normalizedRole = data?.role?.toLowerCase();
      if (normalizedRole === 'admin' || normalizedRole === 'merchant' || normalizedRole === 'user') {
        setRole(normalizedRole);
      } else {
        setRole('user');
      }
    };

    void loadRole();
  }, [supabase]);

  const navItems = baseNavItems.map((item) => {
    if (item.key === 'dashboard') {
      return {
        href: role === 'merchant' ? '/merchant' : '/dashboard',
        label: item.label
      };
    }
    if (item.key === 'scan') {
      return { href: '/scan', label: item.label };
    }
    return { href: '/transactions', label: item.label };
  });
  const adminNavItems =
    role === 'admin'
      ? [
          { href: '/admin/spas', label: 'Gérer les SPA' },
          { href: '/admin/merchants', label: 'Gérer les commerces' }
        ]
      : [];
  const handleSignOut = onSignOut
    ? onSignOut
    : async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
      };

  return (
    <div className="nav">
      <Image src="/pawpass-logo.jpg" alt="PawPass" width={140} height={70} priority />
      <div className="nav-links" style={{ flexWrap: 'wrap' }}>
        {[...navItems, ...adminNavItems].map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#0e3a4a' : 'inherit',
                background: isActive ? '#f3d9a4' : 'transparent',
                padding: '6px 12px',
                borderRadius: 10
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
              style={{
                color: '#f9f9f4',
                fontWeight: 700,
                borderColor: '#5fd3b3',
                background: 'rgba(95, 211, 179, 0.15)'
              }}
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
          role={role === 'merchant' ? 'merchant' : 'client'}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  );
}

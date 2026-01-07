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
        {navItems.map((item) => {
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
          role={role}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  );
}

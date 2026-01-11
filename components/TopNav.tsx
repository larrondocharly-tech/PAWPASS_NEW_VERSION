// components/TopNav.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import AccountMenuOverlay from '@/components/AccountMenuOverlay';

interface TopNavProps {
  title?: string;
}

export default function TopNav({ title }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  // ==========================
  //   Pages "privées" = user connecté
  // ==========================
const isPrivatePage =
  pathname.startsWith('/dashboard') ||
  pathname.startsWith('/scan') ||
  pathname.startsWith('/transactions') ||
  pathname.startsWith('/admin') ||
  pathname.startsWith('/merchant');


  // ==========================
  //   Déconnexion
  // ==========================
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setIsAccountMenuOpen(false);
      router.push('/'); // retour page d'accueil
    } catch (e) {
      console.error('Erreur déconnexion :', e);
    }
  };

  // ==========================
  //   Navigation principale
  // ==========================
  const navItems = [
    { href: '/dashboard', label: 'Tableau de bord' },
    { href: '/scan', label: 'Scanner' },
    { href: '/transactions', label: 'Historique' },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard' && pathname === '/') return true;
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Ton overlay est actuellement en mode "client"
  const overlayRole: 'client' | 'merchant' = 'client';

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
          }}
        >
          {/* Logo + titre */}
          <Link
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                height: 32,
                width: 32,
                borderRadius: 999,
                backgroundColor: '#DCFCE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              🐾
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                lineHeight: 1.2,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#0F172A',
                }}
              >
                PawPass
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: '#64748B',
                }}
              >
                Cashback solidaire
              </span>
            </div>
          </Link>

          {/* Nav + (éventuellement) bouton Menu */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <nav
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    textDecoration: 'none',
                    color: isActive(item.href) ? '#047857' : '#4B5563',
                    padding: '4px 0',
                    borderBottom: isActive(item.href)
                      ? '2px solid #10B981'
                      : '2px solid transparent',
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* BOUTON MENU :
                - affiché UNIQUEMENT sur les pages privées
                - donc uniquement quand, dans ta logique, le user est "connecté" */}
            {isPrivatePage && (
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen(true)}
                style={{
                  borderRadius: 999,
                  border: '1px solid #E5E7EB',
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#374151',
                  backgroundColor: '#F9FAFB',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
                  cursor: 'pointer',
                }}
              >
                Menu
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Overlay compte :
          - rendu uniquement sur les pages privées
          - contient le bouton Déconnexion -> retour à "/" */}
      {isPrivatePage && (
        <AccountMenuOverlay
          isOpen={isAccountMenuOpen}
          onClose={() => setIsAccountMenuOpen(false)}
          role={overlayRole}
          onSignOut={handleSignOut}
        />
      )}
    </>
  );
}

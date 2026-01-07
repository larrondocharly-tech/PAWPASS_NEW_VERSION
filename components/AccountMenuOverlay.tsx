'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MenuItem {
  label: string;
  href?: string;
  icon?: string;
  action?: () => void;
}

interface AccountMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'client' | 'merchant';
  onSignOut: () => Promise<void> | void;
}

const buildClientItems = (onSignOut: () => Promise<void> | void, onClose: () => void) =>
  [
    { label: 'Ma cagnotte & mes dons', href: '/dashboard', icon: '💰' },
    { label: 'Scanner un commerçant', href: '/scan', icon: '📷' },
    { label: 'Mes transactions', href: '/transactions', icon: '🧾' },
    { label: 'Mon profil', href: '/settings', icon: '👤' },
    { label: 'Centre d’aide / FAQ', href: '/faq', icon: '❓' },
    { label: 'Comment ça marche ?', href: '/how-it-works', icon: '🧭' },
    { label: 'Nous contacter', href: '/contact', icon: '✉️' },
    { label: 'Mentions légales', href: '/mentions-legales', icon: '⚖️' },
    {
      label: 'Déconnexion',
      icon: '🚪',
      action: async () => {
        await onSignOut();
        onClose();
      }
    }
  ] satisfies MenuItem[];

const buildMerchantItems = (onSignOut: () => Promise<void> | void, onClose: () => void) =>
  [
    { label: 'Mon tableau de bord commerçant', href: '/merchant', icon: '🏪' },
    { label: 'Mes transactions', href: '/transactions', icon: '🧾' },
    { label: 'Mon profil', href: '/settings', icon: '👤' },
    { label: 'Centre d’aide / FAQ', href: '/faq', icon: '❓' },
    { label: 'Nous contacter', href: '/contact', icon: '✉️' },
    { label: 'Mentions légales', href: '/mentions-legales', icon: '⚖️' },
    {
      label: 'Déconnexion',
      icon: '🚪',
      action: async () => {
        await onSignOut();
        onClose();
      }
    }
  ] satisfies MenuItem[];

export default function AccountMenuOverlay({
  isOpen,
  onClose,
  role,
  onSignOut
}: AccountMenuOverlayProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items =
    role === 'merchant' ? buildMerchantItems(onSignOut, onClose) : buildClientItems(onSignOut, onClose);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(15, 23, 42, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        className="card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-menu-title"
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative'
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le menu"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'transparent',
            border: 'none',
            fontSize: '1.2rem',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
        <h2 id="account-menu-title" style={{ textAlign: 'center', marginBottom: 24 }}>
          Mon compte
        </h2>
        <div style={{ borderTop: '1px solid #e2e8f0' }}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={async () => {
                if (item.action) {
                  await item.action();
                  return;
                }
                if (item.href) {
                  router.push(item.href);
                  onClose();
                }
              }}
              style={{
                width: '100%',
                padding: '14px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: 'none',
                borderBottom: '1px solid #e2e8f0',
                background: 'transparent',
                cursor: 'pointer'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span aria-hidden="true">{item.icon ?? '•'}</span>
                <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{item.label}</span>
              </span>
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

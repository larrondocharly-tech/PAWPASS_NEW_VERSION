'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/utils';

interface DiscountCouponProps {
  coupon: {
    token?: string | null;
    amount: number;
    merchantName: string;
    createdAt: string;
    expiresAt: string;
  };
  onClose: () => void;
  onReset: () => void;
}

const formatTimeLeft = (seconds: number) => {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export default function DiscountCoupon({ coupon, onClose, onReset }: DiscountCouponProps) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const expiresAt = new Date(coupon.expiresAt).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [coupon.expiresAt]);

  const formattedDate = useMemo(
    () => new Date(coupon.createdAt).toLocaleString('fr-FR'),
    [coupon.createdAt]
  );
  const expired = timeLeft <= 0;

  return (
    <div
      className="card"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        margin: 0,
        borderRadius: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        background: 'rgba(15, 23, 42, 0.95)',
        color: '#f8fafc'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          background: '#0f172a',
          borderRadius: 24,
          padding: 32,
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.4)'
        }}
      >
        <p style={{ margin: 0, fontSize: '1rem', color: '#94a3b8' }}>
          Coupon PawPass
        </p>
        <h2 style={{ margin: '12px 0 8px', fontSize: '1.7rem' }}>
          Vous bénéficiez de {formatCurrency(coupon.amount)} de réduction
        </h2>
        <p style={{ margin: 0, color: '#cbd5f5' }}>
          chez <strong style={{ color: '#f8fafc' }}>{coupon.merchantName}</strong>
        </p>

        <div style={{ margin: '24px 0' }}>
          <div style={{ fontSize: '3.4rem', fontWeight: 700 }}>
            {formatCurrency(coupon.amount)}
          </div>
          <p style={{ marginTop: 8, color: '#e2e8f0' }}>
            Montrez cet écran au commerçant avant la fin du timer.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 8,
            background: '#111827',
            borderRadius: 16,
            padding: 16,
            textAlign: 'left'
          }}
        >
          <div>
            <strong>Date :</strong> {formattedDate}
          </div>
          <div>
            <strong>Commerçant :</strong> {coupon.merchantName}
          </div>
          {coupon.token && (
            <div>
              <strong>Code :</strong>{' '}
              <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{coupon.token}</span>
            </div>
          )}
          <div>
            <strong>Timer :</strong>{' '}
            <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              {formatTimeLeft(timeLeft)}
            </span>
          </div>
        </div>

        {expired ? (
          <p style={{ marginTop: 16, color: '#fca5a5' }}>
            Coupon expiré. Veuillez générer un nouveau coupon.
          </p>
        ) : (
          <p style={{ marginTop: 16, color: '#93c5fd' }}>
            Montrez cet écran au commerçant avant la fin du timer.
          </p>
        )}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
            marginTop: 24
          }}
        >
          {!expired && (
            <button className="button" type="button" onClick={onClose}>
              J’ai terminé
            </button>
          )}
          <button className="button secondary" type="button" onClick={onClose}>
            Fermer
          </button>
          {expired && (
            <button className="button" type="button" onClick={onReset}>
              Générer un nouveau coupon
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import QRCodeCard from '@/components/QRCodeCard';
import type { MerchantProfile } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface TransactionLite {
  amount: number;
  cashback_total: number | null;
}

export default function MerchantPage() {
  const supabase = createClient();
  const router = useRouter();
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [transactions, setTransactions] = useState<TransactionLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState('');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [discountToken, setDiscountToken] = useState('');
  const [discountStatus, setDiscountStatus] = useState<string | null>(null);

  useEffect(() => {
    const loadMerchant = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Session expirée.');
        return;
      }

      const { data: merchantData, error: merchantError } = await supabase
        .from('profiles')
        .select('id,role,merchant_code')
        .eq('id', user.id)
        .single();

      if (merchantError) {
        setError(merchantError.message);
        return;
      }

      if (!merchantData) {
        setError('Profil introuvable.');
        return;
      }

      if (merchantData.role?.toUpperCase() !== 'MERCHANT') {
        router.replace('/dashboard');
        return;
      }

      let updatedMerchant = merchantData;

      if (!merchantData.merchant_code) {
        const generatedToken = `PP_${user.id.slice(0, 8)}_${Math.random()
          .toString(36)
          .slice(2, 8)}`.toUpperCase();
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ merchant_code: generatedToken })
          .eq('id', user.id)
          .select();

        if (updateError) {
          setError(updateError.message);
          return;
        }
      }

      const { data: refreshed, error: refreshError } = await supabase
        .from('profiles')
        .select('id,role,merchant_code')
        .eq('id', user.id)
        .single();

      if (refreshError) {
        setError(refreshError.message);
        return;
      }

      updatedMerchant = refreshed;
      setMerchant(updatedMerchant);

      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('amount,cashback_total')
        .eq('merchant_id', merchantData.id);

      if (transactionError) {
        setError(transactionError.message);
        return;
      }

      setTransactions(transactionData ?? []);
    };

    void loadMerchant();
  }, [supabase]);

  useEffect(() => {
    if (!merchant?.merchant_code) {
      setQrValue('');
      return;
    }

    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL;

    setQrValue(baseUrl ? `${baseUrl}/scan?m=${merchant.merchant_code}` : merchant.merchant_code);
  }, [merchant]);

  useEffect(() => {
    setCopyStatus(null);
  }, [qrValue]);

  const stats = useMemo(() => {
    const totalVolume = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalCashback = transactions.reduce(
      (sum, transaction) => sum + (transaction.cashback_total ?? 0),
      0
    );
    return { totalVolume, totalCashback, count: transactions.length };
  }, [transactions]);

  const handleCopy = async () => {
    if (!qrValue) return;
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopyStatus('Copié ✅');
    } catch (copyError) {
      try {
        const input = document.createElement('input');
        input.value = qrValue;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        setCopyStatus('Copié ✅');
      } catch {
        setCopyStatus('Copie impossible.');
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleApproveDiscount = async () => {
    setDiscountStatus(null);
    const { error: approveError } = await supabase.rpc('approve_discount_session', {
      token: discountToken
    });
    if (approveError) {
      setDiscountStatus(approveError.message);
      return;
    }
    setDiscountStatus('Réduction approuvée ✅');
  };

  const handleConsumeDiscount = async () => {
    setDiscountStatus(null);
    const { error: consumeError } = await supabase.rpc('consume_discount_session', {
      token: discountToken
    });
    if (consumeError) {
      setDiscountStatus(consumeError.message);
      return;
    }
    setDiscountStatus('Réduction consommée ✅');
  };

  return (
    <div className="container">
      <div className="nav">
        <strong>Mon QR commerçant</strong>
        <div className="nav-links">
          <Link href="/merchant">Mon QR</Link>
          <Link href="/settings">Paramètres</Link>
          <button className="button secondary" type="button" onClick={handleSignOut}>
            Déconnexion
          </button>
        </div>
      </div>

      {merchant ? (
        <div className="grid grid-2">
          <QRCodeCard value={qrValue} title="QR PawPass · Commerçant" />
          <div className="card">
            <h2>Statistiques</h2>
            <p>
              <strong>Nombre de transactions :</strong> {stats.count}
            </p>
            <p>
              <strong>Volume total :</strong> {formatCurrency(stats.totalVolume)}
            </p>
            <p>
              <strong>Cashback distribué :</strong> {formatCurrency(stats.totalCashback)}
            </p>
            <button className="button" type="button" onClick={handleCopy} style={{ marginTop: 12 }}>
              Copier le lien QR
            </button>
            {copyStatus && <p className="helper">{copyStatus}</p>}
            <div style={{ marginTop: 16 }}>
              <p>
                <strong>Code commerçant :</strong> {merchant.merchant_code}
              </p>
              <label className="label" htmlFor="qrLink">
                Lien QR complet
                <input id="qrLink" className="input" value={qrValue} readOnly />
              </label>
              <p className="helper">Les clients scannent ce QR à la caisse.</p>
            </div>
          </div>
          <div className="card">
            <h2>Valider réduction</h2>
            <label className="label" htmlFor="discountToken">
              Code de réduction
              <input
                id="discountToken"
                className="input"
                value={discountToken}
                onChange={(event) => setDiscountToken(event.target.value)}
                placeholder="Token de session"
              />
            </label>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button className="button" type="button" onClick={handleApproveDiscount}>
                Approuver
              </button>
              <button className="button secondary" type="button" onClick={handleConsumeDiscount}>
                Consommer
              </button>
            </div>
            {discountStatus && <p className="helper">{discountStatus}</p>}
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="helper">Chargement des informations commerçant…</p>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}

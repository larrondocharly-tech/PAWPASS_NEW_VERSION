'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [transactions, setTransactions] = useState<TransactionLite[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        .eq('role', 'merchant')
        .single();

      if (merchantError) {
        setError(merchantError.message);
        return;
      }

      setMerchant(merchantData);

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

  const qrLink = merchant?.merchant_code
    ? `${window.location.origin}/scan?m=${merchant.merchant_code}`
    : '';

  const stats = useMemo(() => {
    const totalVolume = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalCashback = transactions.reduce(
      (sum, transaction) => sum + (transaction.cashback_total ?? 0),
      0
    );
    return { totalVolume, totalCashback, count: transactions.length };
  }, [transactions]);

  const handleCopy = async () => {
    if (!qrLink) return;
    await navigator.clipboard.writeText(qrLink);
  };

  return (
    <div className="container">
      <div className="nav">
        <strong>Commerçant</strong>
        <div className="nav-links">
          <Link href="/settings">Paramètres</Link>
          <Link href="/merchant">Mon QR</Link>
        </div>
      </div>

      {merchant ? (
        <div className="grid grid-2">
          <QRCodeCard value={qrLink} title="QR PawPass · Commerçant" />
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

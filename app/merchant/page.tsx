'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import QRCodeCard from '@/components/QRCodeCard';
import type { Merchant } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface TransactionLite {
  amount: number;
  cashback_amount: number;
}

export default function MerchantPage() {
  const supabase = createClient();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
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
        .from('merchants')
        .select('id,name,qr_token,cashback_percent,threshold_ticket')
        .eq('user_id', user.id)
        .single();

      if (merchantError) {
        setError(merchantError.message);
        return;
      }

      setMerchant(merchantData);

      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('amount,cashback_amount')
        .eq('merchant_id', merchantData.id);

      if (transactionError) {
        setError(transactionError.message);
        return;
      }

      setTransactions(transactionData ?? []);
    };

    void loadMerchant();
  }, [supabase]);

  const qrLink = merchant ? `${window.location.origin}/scan?m=${merchant.qr_token}` : '';

  const stats = useMemo(() => {
    const totalVolume = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalCashback = transactions.reduce(
      (sum, transaction) => sum + transaction.cashback_amount,
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
          <QRCodeCard value={qrLink} title={`QR PawPass · ${merchant.name}`} />
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

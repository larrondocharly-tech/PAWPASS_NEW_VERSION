'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import type { Profile } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import TopNav from '@/components/TopNav';

interface TransactionSummary {
  id: string;
  merchant_id: string | null;
  amount: number;
  cashback_total: number | null;
  donation_amount: number | null;
  wallet_spent: number | null;
  created_at: string;
}

interface TransactionSummary {
  id: string;
  merchant_id: string | null;
  amount: number;
  cashback_total: number | null;
  donation_amount: number | null;
  wallet_spent: number | null;
  created_at: string;
}

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<TransactionSummary[]>([]);
  const [merchantMap, setMerchantMap] = useState<Record<string, string>>({});
  const [thanksMessage, setThanksMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Session expirée.');
        return;
      }

      setEmail(user.email ?? null);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id,role,spa_id,merchant_code')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setError(profileError.message);
        return;
      }

      setProfile(profileData);

      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) {
        setWalletBalance(0);
      } else {
        setWalletBalance(Number(walletData?.balance ?? 0));
      }

      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('id,merchant_id,amount,cashback_total,donation_amount,wallet_spent,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (transactionError) {
        setError(transactionError.message);
        return;
      }

      const rows = transactionData ?? [];
      setTransactions(rows);

      const merchantIds = Array.from(
        new Set(rows.map((transaction) => transaction.merchant_id).filter(Boolean))
      ) as string[];

      if (merchantIds.length > 0) {
        const { data: merchantData, error: merchantError } = await supabase
          .from('profiles')
          .select('id,merchant_code')
          .in('id', merchantIds);

        if (!merchantError) {
          const map = (merchantData ?? []).reduce<Record<string, string>>((acc, merchant) => {
            acc[merchant.id] = merchant.merchant_code ?? merchant.id;
            return acc;
          }, {});
          setMerchantMap(map);
        }
      }
    };

    void loadData();
  }, [supabase]);

  useEffect(() => {
    const thanks = searchParams.get('thanks');
    if (!thanks) return;

    const amount = searchParams.get('amount');
    const spa = searchParams.get('spa');
    if (amount && spa) {
      setThanksMessage(`Merci ! ❤️ Votre don de ${amount} € a été reversé à ${spa}.`);
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete('thanks');
    params.delete('amount');
    params.delete('spa');
    const next = params.toString();
    router.replace(next ? `/dashboard?${next}` : '/dashboard');
  }, [router, searchParams]);

  const totals = useMemo(() => {
    const donation = transactions.reduce(
      (sum, transaction) => sum + (transaction.donation_amount ?? 0),
      0
    );
    const cashbackTotal = transactions.reduce(
      (sum, transaction) => sum + (transaction.cashback_total ?? 0),
      0
    );
    return {
      donation,
      cashbackTotal,
      cashbackToUser: walletBalance,
      count: transactions.length
    };
  }, [transactions, walletBalance]);
  const progress = Math.min((walletBalance / 5) * 100, 100);
  const missing = Math.max(5 - walletBalance, 0);

  const recentTransactions = useMemo(() => transactions.slice(0, 6), [transactions]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="container">
      <TopNav title="PawPass" onSignOut={handleSignOut} />

      {thanksMessage && (
        <div className="card" style={{ marginBottom: 24, borderColor: '#86efac' }}>
          <p style={{ margin: 0 }}>{thanksMessage}</p>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card">
          <h2>Bienvenue {email ?? 'client'} 👋</h2>
          <p className="helper">Scannez un QR commerçant pour enregistrer vos achats.</p>
        </div>
        <div className="card">
          <h3>Ma cagnotte PawPass</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, margin: '8px 0' }}>
            {formatCurrency(totals.cashbackToUser)}
          </p>
          <p className="helper">Solde disponible pour vos réductions.</p>
          <div className="grid" style={{ gap: 8, marginTop: 16 }}>
            <p>
              <strong>Total cashback gagné :</strong> {formatCurrency(totals.cashbackTotal)}
            </p>
            <p>
              <strong>Total donné aux SPA :</strong> {formatCurrency(totals.donation)}
            </p>
            <p>
              <strong>Transactions réalisées :</strong> {totals.count}
            </p>
          </div>
        </div>
        <div className="card">
          <h3>Réductions disponibles</h3>
          <p>
            <strong>Solde cashback :</strong> {formatCurrency(walletBalance)}
          </p>
          <button
            className="button"
            type="button"
            onClick={() => router.push('/scan')}
            style={{ marginTop: 12 }}
          >
            Scanner et gagner{' '}
            {walletBalance >= 5 && (
              <span className="badge" style={{ marginLeft: 8 }}>
                Réduction disponible
              </span>
            )}
          </button>
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                height: 10,
                background: '#e2e8f0',
                borderRadius: 999,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: progress >= 100 ? '#16a34a' : '#1f6feb'
                }}
              />
            </div>
            <p className="helper" style={{ marginTop: 8 }}>
              {walletBalance >= 5
                ? 'Vous pouvez utiliser vos réductions chez un commerçant.'
                : `Encore ${formatCurrency(missing)} pour pouvoir utiliser vos réductions.`}
            </p>
          </div>
        </div>
        <div className="card">
          <h3>Actions rapides</h3>
          <ul>
            <li>
              <Link href="/scan">Scanner un QR commerçant</Link>
            </li>
            <li>
              <Link href="/transactions">Voir l’historique</Link>
            </li>
            <li>
              <Link href="/settings">Mettre à jour mon profil</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Dernières transactions</h3>
        {recentTransactions.length === 0 ? (
          <p className="helper">Aucune transaction pour le moment.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Commerce</th>
                <th>Type</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((transaction) => {
                const isReduction = (transaction.wallet_spent ?? 0) > 0;
                const isDonation = !isReduction && (transaction.donation_amount ?? 0) > 0;
                const typeLabel = isReduction
                  ? 'Réduction'
                  : isDonation
                  ? 'Don SPA'
                  : 'Cashback';
                const amountValue = isReduction
                  ? transaction.wallet_spent ?? 0
                  : isDonation
                  ? transaction.donation_amount ?? 0
                  : transaction.cashback_total ?? 0;
                return (
                  <tr key={transaction.id}>
                    <td>{new Date(transaction.created_at).toLocaleDateString('fr-FR')}</td>
                    <td>
                      {transaction.merchant_id
                        ? merchantMap[transaction.merchant_id] ?? transaction.merchant_id
                        : '—'}
                    </td>
                    <td>
                      <span className="badge">{typeLabel}</span>
                    </td>
                    <td>{formatCurrency(amountValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}

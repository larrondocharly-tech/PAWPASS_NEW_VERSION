'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import type { Profile } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<
    { donation_amount: number | null; cashback_total: number | null; cashback_to_user: number | null }[]
  >([]);
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

      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('donation_amount,cashback_total,cashback_to_user')
        .eq('user_id', user.id);

      if (transactionError) {
        setError(transactionError.message);
        return;
      }

      setTransactions(transactionData ?? []);
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
    return transactions.reduce(
      (acc, transaction) => {
        acc.donation += transaction.donation_amount ?? 0;
        acc.cashbackTotal += transaction.cashback_total ?? 0;
        acc.cashbackToUser += transaction.cashback_to_user ?? 0;
        return acc;
      },
      { donation: 0, cashbackTotal: 0, cashbackToUser: 0 }
    );
  }, [transactions]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="container">
      <div className="nav">
        <strong>PawPass</strong>
        <div className="nav-links">
          <Link href="/scan">Scanner</Link>
          <Link href="/transactions">Transactions</Link>
          <Link href="/settings">Paramètres</Link>
          <button className="button secondary" type="button" onClick={handleSignOut}>
            Déconnexion
          </button>
        </div>
      </div>

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
          <h3>Ma cagnotte solidaire</h3>
          <p>
            <strong>Cagnotte versée :</strong> {formatCurrency(totals.donation)}
          </p>
          <p>
            <strong>Total cashback gagné :</strong> {formatCurrency(totals.cashbackTotal)}
          </p>
          <p>
            <strong>Solde disponible :</strong> {formatCurrency(totals.cashbackToUser)}
          </p>
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

      {error && <p className="error">{error}</p>}
    </div>
  );
}

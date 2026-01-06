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
  const [walletBalance, setWalletBalance] = useState(0);
  const [donationTransactions, setDonationTransactions] = useState<
    { donation_amount: number | null }[]
  >([]);
  const [walletEarns, setWalletEarns] = useState<{ amount: number }[]>([]);
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

      const { data: donationData, error: donationError } = await supabase
        .from('transactions')
        .select('donation_amount')
        .eq('user_id', user.id);

      if (donationError) {
        setError(donationError.message);
        return;
      }

      setDonationTransactions(donationData ?? []);

      const { data: earnData, error: earnError } = await supabase
        .from('wallet_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'EARN');

      if (earnError) {
        setError(earnError.message);
        return;
      }

      setWalletEarns(earnData ?? []);
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
    const donation = donationTransactions.reduce(
      (sum, transaction) => sum + (transaction.donation_amount ?? 0),
      0
    );
    const cashbackTotal = walletEarns.reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
    return {
      donation,
      cashbackTotal,
      cashbackToUser: walletBalance
    };
  }, [donationTransactions, walletBalance, walletEarns]);
  const progress = Math.min((walletBalance / 5) * 100, 100);
  const missing = Math.max(5 - walletBalance, 0);

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
          <Link href="/transactions">Historique</Link>
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

      {error && <p className="error">{error}</p>}
    </div>
  );
}

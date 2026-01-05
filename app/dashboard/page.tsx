'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import type { Profile } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface Wallet {
  balance: number;
  earned: number;
  donated: number;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
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
        .select('balance,earned,donated')
        .eq('user_id', user.id)
        .single();

      if (walletError) {
        setWallet({ balance: 0, earned: 0, donated: 0 });
        return;
      }

      setWallet(walletData ?? { balance: 0, earned: 0, donated: 0 });
    };

    void loadData();
  }, [supabase]);

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

      <div className="grid grid-2">
        <div className="card">
          <h2>Bienvenue {email ?? 'client'} 👋</h2>
          <p className="helper">Votre cashback disponible à utiliser ou reverser.</p>
          {wallet && (
            <div style={{ marginTop: 20 }}>
              <p>
                <strong>Solde disponible :</strong> {formatCurrency(wallet.balance)}
              </p>
              <p>
                <strong>Total gagné :</strong> {formatCurrency(wallet.earned)}
              </p>
              <p>
                <strong>Total donné :</strong> {formatCurrency(wallet.donated)}
              </p>
            </div>
          )}
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

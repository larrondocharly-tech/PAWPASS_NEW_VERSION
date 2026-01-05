'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import type { Profile } from '@/lib/types';

export default function DashboardPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
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
          <p className="helper">Scannez un QR commerçant pour enregistrer vos achats.</p>
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

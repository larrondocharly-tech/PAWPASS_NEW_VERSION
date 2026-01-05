'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import type { Profile } from '@/lib/types';

export default function SettingsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Session expirée.');
        return;
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id,email,role,full_name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setError(profileError.message);
        return;
      }

      setProfile(data);
      setFullName(data.full_name ?? '');
    };

    void loadProfile();
  }, [supabase]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (!profile) return;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setStatus('Profil mis à jour ✅');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="container">
      <div className="nav">
        <strong>Paramètres</strong>
        <div className="nav-links">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/scan">Scanner</Link>
          <Link href="/transactions">Transactions</Link>
        </div>
      </div>

      <div className="card">
        <h2>Mon profil</h2>
        {profile ? (
          <form onSubmit={handleSave}>
            <label className="label" htmlFor="email">
              Email
              <input id="email" className="input" value={profile.email ?? ''} readOnly />
            </label>
            <label className="label" htmlFor="role">
              Rôle
              <input id="role" className="input" value={profile.role} readOnly />
            </label>
            <label className="label" htmlFor="fullName">
              Nom complet
              <input
                id="fullName"
                className="input"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>
            {error && <p className="error">{error}</p>}
            {status && <p>{status}</p>}
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <button className="button" type="submit">
                Enregistrer
              </button>
              <button className="button secondary" type="button" onClick={handleSignOut}>
                Déconnexion
              </button>
            </div>
          </form>
        ) : (
          <p className="helper">Chargement du profil…</p>
        )}
      </div>
    </div>
  );
}

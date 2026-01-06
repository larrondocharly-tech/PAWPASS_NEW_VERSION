'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import type { Profile, Spa } from '@/lib/types';

export default function SettingsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [spas, setSpas] = useState<Spa[]>([]);
  const [spaId, setSpaId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const role = profile?.role?.toLowerCase();

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Session expirée.');
        return;
      }

      setEmail(user.email ?? null);

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id,role,spa_id,merchant_code')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        return;
      }

      setProfile(data);
      setSpaId(data?.spa_id ?? '');
    };

    const loadSpas = async () => {
      const { data, error: spaError } = await supabase
        .from('spas')
        .select('id,name,city,region')
        .order('name');

      if (spaError) {
        setError(spaError.message);
        return;
      }

      setSpas(data ?? []);
    };

    void loadProfile();
    void loadSpas();
  }, [supabase]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (!profile) return;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ spa_id: spaId || null })
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

  const handleCreateProfile = async () => {
    setError(null);
    setStatus(null);
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Session expirée.');
      return;
    }

    const rawRole = String(user.user_metadata?.role ?? '').toLowerCase();
    const normalizedRole =
      rawRole === 'merchant' || rawRole === 'commercant' || rawRole === 'commerçant'
        ? 'merchant'
        : 'user';

    const { data, error: createError } = await supabase
      .from('profiles')
      .insert({ id: user.id, role: normalizedRole })
      .select('id,role,spa_id,merchant_code')
      .single();

    if (createError) {
      setError(createError.message);
      return;
    }

    setProfile(data);
    setStatus('Profil créé ✅');
  };

  return (
    <div className="container">
      <div className="nav">
        <strong>Paramètres</strong>
        <div className="nav-links">
          {role === 'merchant' ? (
            <>
              <Link href="/merchant">Mon QR</Link>
              <Link href="/settings">Paramètres</Link>
            </>
          ) : (
            <>
              <Link href="/dashboard">Tableau de bord</Link>
              <Link href="/scan">Scanner</Link>
              <Link href="/transactions">Historique</Link>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Mon profil</h2>
        {profile ? (
          <form onSubmit={handleSave}>
            <label className="label" htmlFor="email">
              Email
              <input id="email" className="input" value={email ?? ''} readOnly />
            </label>
            <label className="label" htmlFor="role">
              Rôle
              <input id="role" className="input" value={profile.role} readOnly />
            </label>
            {profile.role === 'merchant' && (
              <label className="label" htmlFor="merchantCode">
                Code commerçant
                <input
                  id="merchantCode"
                  className="input"
                  value={profile.merchant_code ?? ''}
                  readOnly
                />
              </label>
            )}
            <label className="label" htmlFor="spa">
              SPA associée
              <select
                id="spa"
                className="select"
                value={spaId}
                onChange={(event) => setSpaId(event.target.value)}
              >
                <option value="">Aucune</option>
                {spas.map((spa) => (
                  <option key={spa.id} value={spa.id}>
                    {spa.name} {spa.city ? `· ${spa.city}` : ''}
                  </option>
                ))}
              </select>
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
          <div>
            <p className="helper">Aucun profil trouvé.</p>
            <button className="button" type="button" onClick={handleCreateProfile}>
              Créer mon profil
            </button>
            {error && <p className="error">{error}</p>}
            {status && <p>{status}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

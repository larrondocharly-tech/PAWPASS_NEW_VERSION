'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import TopNav from '@/components/TopNav';

interface SpaRow {
  id: string;
  name: string;
  city: string | null;
  created_at: string;
}

export default function AdminSpasPage() {
  const supabase = createClient();
  const router = useRouter();
  const [spas, setSpas] = useState<SpaRow[]>([]);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [hasCheckedAccess, setHasCheckedAccess] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSpas = async () => {
    setIsLoading(true);
    const { data, error: spaError } = await supabase
      .from('spas')
      .select('id,name,city,created_at')
      .order('created_at', { ascending: false });

    if (spaError) {
      setError(spaError.message);
      setIsLoading(false);
      return;
    }

    setSpas(data ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    const ensureAdmin = async () => {
      setError(null);
      setHasCheckedAccess(false);
      setIsAuthorized(false);

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setHasCheckedAccess(true);
        router.replace('/login');
        return;
      }

      const metadataRole = String(user.user_metadata?.role ?? '').toLowerCase();
      if (metadataRole && metadataRole !== 'admin') {
        setHasCheckedAccess(true);
        router.replace('/dashboard');
        return;
      }

      if (!metadataRole) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id,role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          setError(profileError.message);
          setHasCheckedAccess(true);
          return;
        }

        if (profile?.role?.toLowerCase() !== 'admin') {
          setHasCheckedAccess(true);
          router.replace('/dashboard');
          return;
        }
      }

      setHasCheckedAccess(true);
      setIsAuthorized(true);
      void loadSpas();
    };

    void ensureAdmin();
  }, [router, supabase]);

  const handleAddSpa = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedCity = city.trim();

    if (!trimmedName) {
      setError('Le nom est requis.');
      return;
    }

    setIsSaving(true);
    const { error: insertError } = await supabase
      .from('spas')
      .insert({ name: trimmedName, city: trimmedCity || null });

    if (insertError) {
      setError(insertError.message);
      setIsSaving(false);
      return;
    }

    setName('');
    setCity('');
    setIsSaving(false);
    await loadSpas();
  };

  const handleDeleteSpa = async (spaId: string) => {
    setError(null);
    setDeletingId(spaId);

    const { error: deleteError } = await supabase.from('spas').delete().eq('id', spaId);

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId(null);
      return;
    }

    setDeletingId(null);
    await loadSpas();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="container">
      <TopNav title="Admin PawPass" onSignOut={handleSignOut} />

      {!hasCheckedAccess ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <p className="helper">Chargement...</p>
        </div>
      ) : !isAuthorized ? (
        error ? (
          <div className="card" style={{ marginBottom: 24 }}>
            <p className="error">{error}</p>
          </div>
        ) : null
      ) : (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <h2>Gérer les SPA</h2>
            <p className="helper">Ajoutez, modifiez ou supprimez les associations affichées.</p>
            <div style={{ marginTop: 12 }}>
              <Link className="button secondary" href="/admin">
                Retour au tableau de bord
              </Link>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <h3>Ajouter une SPA</h3>
            <form onSubmit={handleAddSpa}>
              <label className="label" htmlFor="spa-name">
                Nom
                <input
                  id="spa-name"
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
              <label className="label" htmlFor="spa-city">
                Ville
                <input
                  id="spa-city"
                  className="input"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />
              </label>
              <button className="button" type="submit" disabled={isSaving}>
                {isSaving ? 'Ajout en cours...' : 'Ajouter'}
              </button>
              {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
            </form>
          </div>

          <div className="card">
            <h3>Liste des SPA</h3>
            {isLoading ? (
              <p className="helper">Chargement...</p>
            ) : spas.length === 0 ? (
              <p className="helper">Aucune SPA enregistrée.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Ville</th>
                    <th>Date de création</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {spas.map((spa) => (
                    <tr key={spa.id}>
                      <td>{spa.name}</td>
                      <td>{spa.city ?? '—'}</td>
                      <td>{new Date(spa.created_at).toLocaleString('fr-FR')}</td>
                      <td>
                        <button
                          className="button secondary"
                          type="button"
                          onClick={() => handleDeleteSpa(spa.id)}
                          disabled={deletingId === spa.id}
                        >
                          {deletingId === spa.id ? 'Suppression...' : 'Supprimer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {error && !isSaving && !deletingId && <p className="error">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}

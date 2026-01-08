'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import TopNav from '@/components/TopNav';

interface SpaRow {
  id: string;
  name: string | null;
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

  const fetchSpas = async () => {
    const { data, error: spaError } = await supabase
      .from('spas')
      .select('id,name,city,created_at')
      .order('created_at', { ascending: false });

    if (spaError) {
      setError(spaError.message);
      return;
    }

    setSpas(data ?? []);
  };

  useEffect(() => {
    const loadAdminData = async () => {
      setIsLoading(true);
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
          setIsLoading(false);
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

      await fetchSpas();
      setIsLoading(false);
    };

    void loadAdminData();
  }, [router, supabase]);

  const handleAddSpa = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedCity = city.trim();

    if (!trimmedName || !trimmedCity) {
      setError('Veuillez renseigner un nom et une ville.');
      return;
    }

    setIsSaving(true);
    const { error: insertError } = await supabase
      .from('spas')
      .insert({ name: trimmedName, city: trimmedCity });

    if (insertError) {
      setError(insertError.message);
      setIsSaving(false);
      return;
    }

    setName('');
    setCity('');
    await fetchSpas();
    setIsSaving(false);
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

    await fetchSpas();
    setDeletingId(null);
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
            <h2>Gestion des SPA</h2>
            <p className="helper">Ajoutez, mettez à jour ou supprimez les SPA partenaires.</p>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <h3>Ajouter une SPA</h3>
            <form onSubmit={handleAddSpa}>
              <label className="label" htmlFor="spaName">
                Nom
                <input
                  id="spaName"
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
              <label className="label" htmlFor="spaCity">
                Ville
                <input
                  id="spaCity"
                  className="input"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  required
                />
              </label>
              {error && <p className="error">{error}</p>}
              <button className="button" type="submit" disabled={isSaving} style={{ marginTop: 12 }}>
                {isSaving ? 'Ajout en cours...' : 'Ajouter la SPA'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3>Liste des SPA</h3>
            {isLoading ? (
              <p className="helper">Chargement...</p>
            ) : error ? (
              <p className="error">{error}</p>
            ) : spas.length === 0 ? (
              <p className="helper">Aucune SPA trouvée.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Ville</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {spas.map((spa) => (
                    <tr key={spa.id}>
                      <td>{spa.name ?? '—'}</td>
                      <td>{spa.city ?? '—'}</td>
                      <td>{new Date(spa.created_at).toLocaleString('fr-FR')}</td>
                      <td>
                        <button
                          className="button secondary"
                          type="button"
                          onClick={() => void handleDeleteSpa(spa.id)}
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
          </div>
        </>
      )}
    </div>
  );
}

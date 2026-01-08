import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabaseServer';
import TopNav from '@/components/TopNav';

interface SpaRow {
  id: string;
  name: string | null;
  city: string | null;
  created_at: string;
}

const requireAdmin = async () => {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role?.toLowerCase() !== 'admin') {
    redirect('/dashboard');
  }

  return supabase;
};

const fetchSpas = async (supabase: ReturnType<typeof createClient>) => {
  const { data, error } = await supabase
    .from('spas')
    .select('id,name,city,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
};

export default async function AdminSpasPage() {
  const supabase = await requireAdmin();
  const { data: spas, error } = await fetchSpas(supabase);

  const addSpa = async (formData: FormData) => {
    'use server';
    const serverSupabase = await requireAdmin();
    const name = String(formData.get('name') ?? '').trim();
    const city = String(formData.get('city') ?? '').trim();

    if (!name || !city) {
      return;
    }

    await serverSupabase.from('spas').insert({ name, city });
    revalidatePath('/admin/spas');
  };

  const deleteSpa = async (formData: FormData) => {
    'use server';
    const serverSupabase = await requireAdmin();
    const id = String(formData.get('id') ?? '');

    if (!id) {
      return;
    }

    await serverSupabase.from('spas').delete().eq('id', id);
    revalidatePath('/admin/spas');
  };

  return (
    <div className="container">
      <TopNav title="Admin PawPass" />

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>Gestion des SPA</h2>
        <p className="helper">Ajoutez, mettez à jour ou supprimez les SPA partenaires.</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3>Ajouter une SPA</h3>
        <form action={addSpa}>
          <label className="label" htmlFor="spaName">
            Nom
            <input id="spaName" className="input" name="name" required />
          </label>
          <label className="label" htmlFor="spaCity">
            Ville
            <input id="spaCity" className="input" name="city" required />
          </label>
          <button className="button" type="submit" style={{ marginTop: 12 }}>
            Ajouter la SPA
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Liste des SPA</h3>
        {error ? (
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
                    <form action={deleteSpa}>
                      <input type="hidden" name="id" value={spa.id} />
                      <button className="button secondary" type="submit">
                        Supprimer
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

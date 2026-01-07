import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabaseServer';

const getRoleFromUser = (user: { user_metadata?: Record<string, unknown> } | null) =>
  (user?.user_metadata?.role as string | undefined)?.toLowerCase() ?? 'user';

const fetchCount = async (
  supabase: ReturnType<typeof createClient>,
  table: string,
  column: string,
  filter?: { column: string; value: string }
) => {
  let query = supabase.from(table).select(column, { count: 'exact', head: true });
  if (filter) {
    query = query.eq(filter.column, filter.value);
  }
  const { count, error } = await query;
  return { count: count ?? 0, error };
};

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const role = getRoleFromUser(userData.user ?? null);

  if (!userData.user) {
    redirect('/login');
  }

  if (role !== 'admin') {
    redirect('/dashboard');
  }

  const [merchantCount, refugeCount, transactionCount] = await Promise.all([
    fetchCount(supabase, 'profiles', 'id', { column: 'role', value: 'merchant' }),
    fetchCount(supabase, 'profiles', 'id', { column: 'role', value: 'refuge' }),
    fetchCount(supabase, 'transactions', 'id')
  ]);

  const hasError = merchantCount.error || refugeCount.error || transactionCount.error;

  return (
    <main className="container" style={{ maxWidth: 960 }}>
      <header style={{ marginBottom: 24 }}>
        <h1>Dashboard Admin PawPass</h1>
        <p className="helper">
          Accédez rapidement aux statistiques principales et aux sections dédiées aux commerçants et refuges.
        </p>
      </header>

      <section
        className="grid"
        style={{ gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
      >
        <Link className="card" href="/admin/merchants">
          <h3>Commerçants</h3>
          <p className="helper">Voir les statistiques détaillées des commerçants.</p>
        </Link>
        <Link className="card" href="/admin/refuges">
          <h3>Refuges</h3>
          <p className="helper">Voir les statistiques détaillées des refuges partenaires.</p>
        </Link>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Statistiques globales</h2>
        {hasError ? (
          <p className="error" style={{ marginTop: 12 }}>
            Erreur de chargement des statistiques.
          </p>
        ) : (
          <div
            className="grid"
            style={{ gap: 12, marginTop: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
          >
            <div className="card">
              <p className="helper">Total commerçants</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{merchantCount.count}</p>
            </div>
            <div className="card">
              <p className="helper">Total refuges</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{refugeCount.count}</p>
            </div>
            <div className="card">
              <p className="helper">Total transactions</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{transactionCount.count}</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

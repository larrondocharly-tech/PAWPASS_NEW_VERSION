import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabaseServer';

type RefugeStat = {
  refuge_id: string;
  refuge_email: string | null;
  total_transactions: number | null;
  total_turnover_linked: number | null;
  total_cashback_generated: number | null;
};

const getRoleFromUser = (user: { user_metadata?: Record<string, unknown> } | null) =>
  (user?.user_metadata?.role as string | undefined)?.toLowerCase() ?? 'user';

const formatAmount = (value: number | null) => `${(value ?? 0).toFixed(2)} €`;

export default async function AdminRefugesPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const role = getRoleFromUser(userData.user ?? null);

  if (!userData.user) {
    redirect('/login');
  }

  if (role !== 'admin') {
    redirect('/dashboard');
  }

  const { data, error } = await supabase
    .from('refuge_stats')
    .select('*')
    .order('total_turnover_linked', { ascending: false });

  if (error) {
    return (
      <main className="container" style={{ maxWidth: 1100 }}>
        <h1>Refuges - Stats</h1>
        <p className="error" style={{ marginTop: 12 }}>
          Erreur de chargement des statistiques.
        </p>
      </main>
    );
  }

  const rows = (data ?? []) as RefugeStat[];

  return (
    <main className="container" style={{ maxWidth: 1100 }}>
      <header style={{ marginBottom: 20 }}>
        <h1>Refuges - Stats</h1>
        <p className="helper">Classement par chiffre d’affaires total lié.</p>
      </header>

      {rows.length === 0 ? (
        <p className="helper">Aucun refuge trouvé pour l’instant.</p>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table-auto" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>Email refuge</th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>Transactions liées</th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>CA total lié</th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>Cashback généré</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.refuge_id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 12px' }}>{row.refuge_email ?? '—'}</td>
                  <td style={{ padding: '8px 12px' }}>{row.total_transactions ?? 0}</td>
                  <td style={{ padding: '8px 12px' }}>{formatAmount(row.total_turnover_linked)}</td>
                  <td style={{ padding: '8px 12px' }}>{formatAmount(row.total_cashback_generated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

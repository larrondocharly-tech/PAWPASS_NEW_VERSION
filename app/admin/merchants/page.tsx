import { createClient } from '@/lib/supabaseServer';

type MerchantStat = {
  merchant_id: string;
  merchant_email: string | null;
  total_transactions: number | null;
  total_turnover: number | null;
  total_cashback_generated: number | null;
};

const formatAmount = (value: number | null) => `${(value ?? 0).toFixed(2)} €`;

export default async function AdminMerchantsPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('merchant_stats')
    .select('*')
    .order('total_turnover', { ascending: false });

  if (error) {
    return (
      <main className="container mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-semibold">Commerçants - Stats</h1>
        <p className="mt-3 text-sm text-red-600">Erreur de chargement des statistiques.</p>
      </main>
    );
  }

  const rows = (data ?? []) as MerchantStat[];

  return (
    <main className="container mx-auto max-w-5xl p-6">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold">Commerçants - Stats</h1>
        <p className="mt-2 text-sm text-slate-600">Classement par chiffre d’affaires total généré.</p>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-600">Aucun commerçant trouvé pour l’instant.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Email commerçant</th>
                <th className="px-4 py-3 font-medium">Transactions</th>
                <th className="px-4 py-3 font-medium">CA total généré</th>
                <th className="px-4 py-3 font-medium">Cashback généré</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {rows.map((row) => (
                <tr key={row.merchant_id}>
                  <td className="px-4 py-3">{row.merchant_email ?? '—'}</td>
                  <td className="px-4 py-3">{row.total_transactions ?? 0}</td>
                  <td className="px-4 py-3">{formatAmount(row.total_turnover)}</td>
                  <td className="px-4 py-3">{formatAmount(row.total_cashback_generated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

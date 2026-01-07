import Link from 'next/link';
import { createClient } from '@/lib/supabaseServer';

type MerchantStatAgg = {
  total_cashback_generated: number | null;
};

type RefugeStatAgg = {
  total_donations: number | null;
};

const formatAmount = (value: number) => `${value.toFixed(2)} €`;

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const { data: merchants, error: merchantsError } = await supabase
    .from('merchant_stats')
    .select('total_cashback_generated');
  const { data: refuges, error: refugesError } = await supabase
    .from('refuge_stats')
    .select('total_donations');

  if (merchantsError || refugesError) {
    return (
      <main className="container mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Dashboard Admin PawPass</h1>
        <p className="mt-3 text-sm text-red-600">Erreur de chargement des statistiques admin.</p>
      </main>
    );
  }

  const totalCashback = (merchants as MerchantStatAgg[] | null)?.reduce(
    (sum, merchant) => sum + (merchant.total_cashback_generated ?? 0),
    0
  );
  const totalDonations = (refuges as RefugeStatAgg[] | null)?.reduce(
    (sum, refuge) => sum + (refuge.total_donations ?? 0),
    0
  );

  return (
    <main className="container mx-auto max-w-4xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard Admin PawPass</h1>
        <p className="mt-2 text-sm text-slate-600">
          Accédez rapidement aux statistiques principales et aux sections dédiées aux commerçants et refuges.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">Cashback généré par les commerçants</p>
          <p className="mt-2 text-2xl font-semibold">{formatAmount(totalCashback ?? 0)}</p>
          <Link className="mt-3 inline-flex text-sm font-medium text-emerald-700" href="/admin/merchants">
            Voir le détail
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">Dons à verser aux refuges</p>
          <p className="mt-2 text-2xl font-semibold">{formatAmount(totalDonations ?? 0)}</p>
          <Link className="mt-3 inline-flex text-sm font-medium text-emerald-700" href="/admin/refuges">
            Voir les refuges
          </Link>
        </div>
      </section>
    </main>
  );
}

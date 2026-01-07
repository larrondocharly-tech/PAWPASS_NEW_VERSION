import { createClient } from '@/lib/supabaseServer';
import TransactionsTable from './TransactionsTable';

type AdminTransaction = {
  transaction_id: string;
  created_at: string | null;
  user_email: string | null;
  merchant_email: string | null;
  refuge_email: string | null;
  amount: number | null;
  cashback_total: number | null;
  donation_amount: number | null;
};

export default async function AdminTransactionsPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('admin_transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <main className="container mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-semibold">Toutes les transactions</h1>
        <p className="mt-3 text-sm text-red-600">Erreur de chargement des transactions.</p>
      </main>
    );
  }

  const rows = (data ?? []) as AdminTransaction[];

  return (
    <main className="container mx-auto max-w-6xl p-6">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold">Toutes les transactions</h1>
        <p className="mt-2 text-sm text-slate-600">
          Vue détaillée des transactions récentes avec montants et dons associés.
        </p>
      </header>
      <TransactionsTable rows={rows} />
    </main>
  );
}

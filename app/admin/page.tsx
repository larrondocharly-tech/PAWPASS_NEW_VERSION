'use client';
export const dynamic = "force-dynamic";
import { Fragment } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { formatCurrency } from '@/lib/utils';
import TopNav from '@/components/TopNav';

interface TransactionRow {
  id: string;
  amount: number;
  cashback_amount: number | null;
  donation_amount: number | null;
  created_at: string;
  spa_id: string | null;
  // IMPORTANT : Supabase renvoie un TABLEAU d'associations
  spa?: {
    name: string | null;
  }[] | null;
}

interface SpaSummary {
  spaId: string;
  spaName: string;
  transactions: TransactionRow[];
  transactionCount: number;
  totalAmount: number;
  totalDonation: number;
  totalCashback: number;
}

const getCashbackValue = (transaction: TransactionRow) =>
  Number(transaction.cashback_amount ?? 0);

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

export default async function AdminPage() {
  const supabase = await requireAdmin();

  const {
    data: transactionData,
    error: transactionError
  } = await supabase
    .from('transactions')
    .select(
      'id,amount,cashback_amount,donation_amount,created_at,spa_id,spa:associations(name)'
    )
    .order('created_at', { ascending: false });

  // On force ici le type attendu pour que Typescript arrête de gueuler
  const transactions: TransactionRow[] = (transactionData ?? []) as TransactionRow[];
  const summariesMap = new Map<string, SpaSummary>();

  transactions.forEach((transaction) => {
    const spaKey = transaction.spa_id ?? 'sans-spa';
    const spaName =
      transaction.spa?.[0]?.name ??
      (transaction.spa_id ? 'Association inconnue' : 'Sans SPA');

    if (!summariesMap.has(spaKey)) {
      summariesMap.set(spaKey, {
        spaId: spaKey,
        spaName,
        transactions: [],
        transactionCount: 0,
        totalAmount: 0,
        totalDonation: 0,
        totalCashback: 0
      });
    }

    const summary = summariesMap.get(spaKey);
    if (!summary) return;

    summary.transactions.push(transaction);
    summary.transactionCount += 1;
    summary.totalAmount += Number(transaction.amount ?? 0);
    summary.totalDonation += Number(transaction.donation_amount ?? 0);
    summary.totalCashback += getCashbackValue(transaction);
  });

  const summaries = Array.from(summariesMap.values()).sort((a, b) =>
    a.spaName.localeCompare(b.spaName)
  );

  const grandTotalDonation = transactions.reduce(
    (sum, transaction) => sum + Number(transaction.donation_amount ?? 0),
    0
  );

  return (
    <div className="container">
      <TopNav title="Admin PawPass" />

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>Tableau de bord admin – Transactions par SPA</h2>
        <p className="helper">Vision globale des dons et cashbacks enregistrés.</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3>Total des dons (toutes SPA)</h3>
        <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          {formatCurrency(grandTotalDonation)}
        </p>
      </div>

      <div className="card">
        <h3>Résumé par SPA</h3>
        {transactionError ? (
          <p className="error">{transactionError.message}</p>
        ) : summaries.length === 0 ? (
          <p className="helper">Aucune transaction trouvée.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>SPA</th>
                <th>Transactions</th>
                <th>Total achats</th>
                <th>Total dons</th>
                <th>Total cashback</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => (
                <Fragment key={summary.spaId}>
                  <tr>
                    <td>
                      <strong>{summary.spaName}</strong>
                    </td>
                    <td>{summary.transactionCount}</td>
                    <td>{formatCurrency(summary.totalAmount)}</td>
                    <td>{formatCurrency(summary.totalDonation)}</td>
                    <td>{formatCurrency(summary.totalCashback)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5}>
                      <details style={{ padding: '12px 0' }}>
                        <summary
                          style={{ cursor: 'pointer', fontWeight: 600 }}
                        >
                          Voir les transactions
                        </summary>
                        {summary.transactions.length === 0 ? (
                          <p
                            className="helper"
                            style={{ marginTop: 12 }}
                          >
                            Aucune transaction pour cette SPA.
                          </p>
                        ) : (
                          <table
                            className="table"
                            style={{ marginTop: 12 }}
                          >
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Montant</th>
                                <th>Cashback</th>
                                <th>Don</th>
                              </tr>
                            </thead>
                            <tbody>
                              {summary.transactions.map((transaction) => (
                                <tr key={transaction.id}>
                                  <td>
                                    {new Date(
                                      transaction.created_at
                                    ).toLocaleString('fr-FR')}
                                  </td>
                                  <td>
                                    {formatCurrency(transaction.amount)}
                                  </td>
                                  <td>
                                    {formatCurrency(
                                      getCashbackValue(transaction)
                                    )}
                                  </td>
                                  <td>
                                    {formatCurrency(
                                      transaction.donation_amount ?? 0
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </details>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

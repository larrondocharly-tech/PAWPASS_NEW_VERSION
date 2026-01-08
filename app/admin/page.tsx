'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  spa?: {
    name: string | null;
  } | null;
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

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [selectedSpaId, setSelectedSpaId] = useState<string | null>(null);
  const [hasCheckedAccess, setHasCheckedAccess] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select(
          'id,amount,cashback_amount,donation_amount,created_at,spa_id,spa:associations(name)'
        )
        .order('created_at', { ascending: false });

      if (transactionError) {
        setError(transactionError.message);
        setIsLoading(false);
        return;
      }

      setTransactions(transactionData ?? []);
      setIsLoading(false);
    };

    void loadAdminData();
  }, [router, supabase]);

  const summaries = useMemo(() => {
    const map = new Map<string, SpaSummary>();

    // Groupement par SPA + calculs des totaux par SPA.
    transactions.forEach((transaction) => {
      const spaKey = transaction.spa_id ?? 'sans-spa';
      const spaName = transaction.spa?.name ?? (transaction.spa_id ? 'Association inconnue' : 'Sans SPA');

      if (!map.has(spaKey)) {
        map.set(spaKey, {
          spaId: spaKey,
          spaName,
          transactions: [],
          transactionCount: 0,
          totalAmount: 0,
          totalDonation: 0,
          totalCashback: 0
        });
      }

      const summary = map.get(spaKey);
      if (!summary) return;

      summary.transactions.push(transaction);
      summary.transactionCount += 1;
      summary.totalAmount += Number(transaction.amount ?? 0);
      summary.totalDonation += Number(transaction.donation_amount ?? 0);
      summary.totalCashback += getCashbackValue(transaction);
    });

    return Array.from(map.values()).sort((a, b) => a.spaName.localeCompare(b.spaName));
  }, [transactions]);

  // Total global des dons (toutes SPA confondues).
  const grandTotalDonation = useMemo(
    () => transactions.reduce((sum, transaction) => sum + Number(transaction.donation_amount ?? 0), 0),
    [transactions]
  );

  const handleToggleSpa = (spaId: string) => {
    setSelectedSpaId((current) => (current === spaId ? null : spaId));
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
        <h2>Tableau de bord admin – Transactions par SPA</h2>
        <p className="helper">Vision globale des dons et cashbacks enregistrés.</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3>Total des dons (toutes SPA)</h3>
        {isLoading ? (
          <p className="helper">Chargement...</p>
        ) : (
          <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {formatCurrency(grandTotalDonation)}
          </p>
        )}
      </div>

      <div className="card">
        <h3>Résumé par SPA</h3>
        {isLoading ? (
          <p className="helper">Chargement...</p>
        ) : error ? (
          <p className="error">{error}</p>
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
              {summaries.map((summary) => {
                const isExpanded = selectedSpaId === summary.spaId;
                return (
                  <Fragment key={summary.spaId}>
                    <tr
                      onClick={() => handleToggleSpa(summary.spaId)}
                      style={{ cursor: 'pointer' }}
                      aria-expanded={isExpanded}
                    >
                      <td>
                        <strong>{summary.spaName}</strong>
                      </td>
                      <td>{summary.transactionCount}</td>
                      <td>{formatCurrency(summary.totalAmount)}</td>
                      <td>{formatCurrency(summary.totalDonation)}</td>
                      <td>{formatCurrency(summary.totalCashback)}</td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={5}>
                          <div style={{ padding: '12px 0' }}>
                            <h4 style={{ marginBottom: 8 }}>Détails des transactions</h4>
                            {summary.transactions.length === 0 ? (
                              <p className="helper">Aucune transaction pour cette SPA.</p>
                            ) : (
                              <table className="table">
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
                                      <td>{new Date(transaction.created_at).toLocaleString('fr-FR')}</td>
                                      <td>{formatCurrency(transaction.amount)}</td>
                                      <td>{formatCurrency(getCashbackValue(transaction))}</td>
                                      <td>{formatCurrency(transaction.donation_amount ?? 0)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      </>
      )}
    </div>
  );
}

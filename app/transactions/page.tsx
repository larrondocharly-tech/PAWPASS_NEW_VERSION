export const dynamic = "force-dynamic";
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import type { Spa, TransactionRecord } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import TopNav from '@/components/TopNav';

interface TransactionsBySpa {
  spaId: string | null;
  spaName: string;
  transactionCount: number;
  totalDonation: number;
  totalAmount: number;
  transactions: TransactionRecord[];
}

export default function TransactionsPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [spas, setSpas] = useState<Spa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  useEffect(() => {
    const loadTransactions = async () => {
      setIsLoading(true);
      const { data, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (transactionError) {
        setError(transactionError.message);
        setIsLoading(false);
        return;
      }

      setTransactions(data ?? []);
      setIsLoading(false);
    };

    const loadSpas = async () => {
      const { data, error: spaError } = await supabase
        .from('spas')
        .select('id,name,city,region')
        .order('name');

      if (spaError) {
        setError(spaError.message);
        return;
      }

      setSpas(data ?? []);
    };

    void loadTransactions();
    void loadSpas();
  }, [supabase]);

  const spaMap = spas.reduce<Record<string, Spa>>((acc, spa) => {
    acc[spa.id] = spa;
    return acc;
  }, {});

  const groupedBySpa = useMemo(() => {
    const map = new Map<string, TransactionsBySpa>();

    transactions.forEach((transaction) => {
      const spaId = transaction.spa_id ?? null;
      const spaName = spaId ? spaMap[spaId]?.name ?? spaId : 'Sans SPA / Pas de don';

      if (!map.has(spaId ?? 'no-spa')) {
        map.set(spaId ?? 'no-spa', {
          spaId,
          spaName,
          transactionCount: 0,
          totalDonation: 0,
          totalAmount: 0,
          transactions: []
        });
      }

      const group = map.get(spaId ?? 'no-spa');
      if (!group) return;

      group.transactions.push(transaction);
      group.transactionCount += 1;
      group.totalDonation += Number(transaction.donation_amount ?? 0);
      group.totalAmount += Number(transaction.amount ?? 0);
    });

    return Array.from(map.values()).sort((a, b) => a.spaName.localeCompare(b.spaName));
  }, [spaMap, transactions]);

  const grandTotalDonation = useMemo(
    () => transactions.reduce((sum, transaction) => sum + Number(transaction.donation_amount ?? 0), 0),
    [transactions]
  );

  return (
    <div className="container">
      <TopNav title="Historique" onSignOut={handleSignOut} />

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>Mes transactions</h2>
        {isLoading ? (
          <p className="helper">Chargement...</p>
        ) : (
          <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            Total des dons vers les SPA : {formatCurrency(grandTotalDonation)}
          </p>
        )}
      </div>

      <div className="card">
        <h3>Historique par SPA</h3>
        {isLoading ? (
          <p className="helper">Chargement...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : groupedBySpa.length === 0 ? (
          <p className="helper">Aucune transaction pour le moment.</p>
        ) : (
          groupedBySpa.map((group) => (
            <div key={group.spaId ?? 'no-spa'} style={{ marginBottom: 24 }}>
              <div className="card" style={{ background: '#f9f9f4' }}>
                <h4 style={{ marginBottom: 8 }}>{group.spaName}</h4>
                <p className="helper" style={{ marginBottom: 4 }}>
                  Transactions : {group.transactionCount}
                </p>
                <p style={{ fontWeight: 700 }}>
                  Dons totaux : {formatCurrency(group.totalDonation)}
                </p>
              </div>
              <table className="table" style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Commerçant</th>
                    <th>Montant</th>
                    <th>Cashback</th>
                    <th>Don</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {group.transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{new Date(transaction.created_at).toLocaleString('fr-FR')}</td>
                      <td>{transaction.merchant_id ?? '—'}</td>
                      <td>{formatCurrency(transaction.amount)}</td>
                      <td>{formatCurrency(transaction.cashback_total ?? 0)}</td>
                      <td>{formatCurrency(transaction.donation_amount ?? 0)}</td>
                      <td>
                        <span className="badge">{transaction.status ?? '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import type { Spa, TransactionRecord } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import TopNav from '@/components/TopNav';

export default function TransactionsPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [spas, setSpas] = useState<Spa[]>([]);
  const [error, setError] = useState<string | null>(null);
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  useEffect(() => {
    const loadTransactions = async () => {
      const { data, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (transactionError) {
        setError(transactionError.message);
        return;
      }

      setTransactions(data ?? []);
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

  return (
    <div className="container">
      <TopNav title="Historique" onSignOut={handleSignOut} />

      <div className="card">
        <h2>Mes transactions</h2>
        {transactions.length === 0 ? (
          <p className="helper">Aucune transaction pour le moment.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Commerçant</th>
                <th>Montant</th>
                <th>Cashback</th>
                <th>Don</th>
                <th>SPA</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{new Date(transaction.created_at).toLocaleString('fr-FR')}</td>
                  <td>{transaction.merchant_id ?? '—'}</td>
                  <td>{formatCurrency(transaction.amount)}</td>
                  <td>{formatCurrency(transaction.cashback_total ?? 0)}</td>
                  <td>{formatCurrency(transaction.donation_amount ?? 0)}</td>
                  <td>{transaction.spa_id ? spaMap[transaction.spa_id]?.name ?? transaction.spa_id : '—'}</td>
                  <td>
                    <span className="badge">{transaction.status ?? '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}

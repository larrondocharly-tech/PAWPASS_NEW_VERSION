'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import type { TransactionRecord } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export default function TransactionsPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTransactions = async () => {
      const { data, error: transactionError } = await supabase
        .from('transactions')
        .select('id,amount,cashback_amount,status,created_at,merchant:merchant_id(name)')
        .order('created_at', { ascending: false });

      if (transactionError) {
        setError(transactionError.message);
        return;
      }

      setTransactions(data ?? []);
    };

    void loadTransactions();
  }, [supabase]);

  return (
    <div className="container">
      <div className="nav">
        <strong>Historique</strong>
        <div className="nav-links">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/scan">Scanner</Link>
          <Link href="/settings">Paramètres</Link>
        </div>
      </div>

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
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{new Date(transaction.created_at).toLocaleString('fr-FR')}</td>
                  <td>{transaction.merchant?.name ?? '—'}</td>
                  <td>{formatCurrency(transaction.amount)}</td>
                  <td>{formatCurrency(transaction.cashback_amount)}</td>
                  <td>
                    <span className="badge">{transaction.status}</span>
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

'use client';

import { useMemo, useState } from 'react';

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

type TransactionsTableProps = {
  rows: AdminTransaction[];
};

const formatAmount = (value: number | null) => `${(value ?? 0).toFixed(2)} €`;

const formatDate = (value: string | null) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('fr-FR');
};

export default function TransactionsTable({ rows }: TransactionsTableProps) {
  const [query, setQuery] = useState('');

  const filteredRows = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return rows;
    }
    return rows.filter((row) => {
      const userEmail = row.user_email?.toLowerCase() ?? '';
      const merchantEmail = row.merchant_email?.toLowerCase() ?? '';
      return userEmail.includes(trimmed) || merchantEmail.includes(trimmed);
    });
  }, [query, rows]);

  if (rows.length === 0) {
    return <p className="text-sm text-slate-600">Aucune transaction pour le moment.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700" htmlFor="transaction-search">
          Rechercher par email (client ou commerçant)
        </label>
        <input
          id="transaction-search"
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="ex: client@exemple.com"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {filteredRows.length === 0 ? (
        <p className="text-sm text-slate-600">Aucune transaction ne correspond à cette recherche.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Commerçant</th>
                <th className="px-4 py-3 font-medium">Refuge</th>
                <th className="px-4 py-3 font-medium">Montant payé</th>
                <th className="px-4 py-3 font-medium">Cashback</th>
                <th className="px-4 py-3 font-medium">Don</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredRows.map((row) => (
                <tr key={row.transaction_id}>
                  <td className="px-4 py-3">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3">{row.user_email ?? '—'}</td>
                  <td className="px-4 py-3">{row.merchant_email ?? '—'}</td>
                  <td className="px-4 py-3">{row.refuge_email ?? '—'}</td>
                  <td className="px-4 py-3">{formatAmount(row.amount)}</td>
                  <td className="px-4 py-3">{formatAmount(row.cashback_total)}</td>
                  <td className="px-4 py-3">{formatAmount(row.donation_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

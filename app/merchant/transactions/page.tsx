'use client';
export const dynamic = "force-dynamic";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { formatCurrency } from '@/lib/utils';
import TopNav from '@/components/TopNav';

interface MerchantProfile {
  id: string;
  role: string | null;
  merchant_id: string | null;
}

interface MerchantTransaction {
  id: string;
  amount: number;
  cashback_total: number | null;
  created_at: string;
}

export default function MerchantTransactionsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id,role,merchant_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      if (!profileData || profileData.role?.toLowerCase() !== 'merchant' || !profileData.merchant_id) {
        router.replace('/dashboard');
        return;
      }

      setProfile(profileData);

      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('id,amount,cashback_total,created_at')
        .eq('merchant_id', profileData.merchant_id)
        .order('created_at', { ascending: false });

      if (transactionError) {
        setError(transactionError.message);
        setLoading(false);
        return;
      }

      setTransactions(transactionData ?? []);
      setLoading(false);
    };

    void loadData();
  }, [router, supabase]);


  return (
    <div className="container">
      <TopNav title="Transactions commerçant" />

      <div className="card">
        <h2>Historique des transactions</h2>
        {loading ? (
          <p className="helper">Chargement des transactions…</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : transactions.length === 0 ? (
          <p className="helper">Aucune transaction pour le moment.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Montant achat</th>
                <th>Cashback distribué</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{new Date(transaction.created_at).toLocaleString()}</td>
                  <td>{formatCurrency(transaction.amount)}</td>
                  <td>{formatCurrency(transaction.cashback_total ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

'use client';
export const dynamic = "force-dynamic";
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import TopNav from '@/components/TopNav';

interface Wallet {
  balance: number;
  total_cashback?: number | null;
  total_donations?: number | null;
}

interface Transaction {
  id: string;
  amount: number;
  cashback_amount: number;
  donation_amount: number;
  created_at: string;
  merchant_name?: string | null;
  spa_name?: string | null;
}

type LoadStatus = 'loading' | 'ok' | 'error';

interface State {
  status: LoadStatus;
  userEmail: string | null;
  wallet: Wallet | null;
  transactions: Transaction[];
  errorMessage?: string;
}

export default function DashboardPage() {
  const [state, setState] = useState<State>({
    status: 'loading',
    userEmail: null,
    wallet: null,
    transactions: [],
  });

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error('Erreur getUser:', userError);
          setState((prev) => ({
            ...prev,
            status: 'error',
            errorMessage: userError.message,
          }));
          return;
        }

        if (!user) {
          setState((prev) => ({
            ...prev,
            status: 'error',
            errorMessage:
              "Utilisateur non connecté. Merci de vous reconnecter pour accéder à votre tableau de bord.",
          }));
          return;
        }

        const [walletRes, txRes] = await Promise.all([
          supabase
            .from('wallets')
            .select('balance,total_cashback,total_donations')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('transactions')
            .select(
              'id, amount, cashback_amount, donation_amount, created_at, merchant_name, spa_name'
            )
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        if (walletRes.error) {
          console.warn('Erreur wallet (non bloquant) :', walletRes.error.message);
        }
        if (txRes.error) {
          console.warn('Erreur transactions (non bloquant) :', txRes.error.message);
        }

        setState({
          status: 'ok',
          userEmail: user.email ?? null,
          wallet: walletRes.data
            ? {
                balance: Number(walletRes.data.balance ?? 0),
                total_cashback: walletRes.data.total_cashback ?? null,
                total_donations: walletRes.data.total_donations ?? null,
              }
            : null,
          transactions: txRes.data
            ? txRes.data.map((t: any) => ({
                id: t.id,
                amount: Number(t.amount ?? 0),
                cashback_amount: Number(t.cashback_amount ?? 0),
                donation_amount: Number(t.donation_amount ?? 0),
                created_at: t.created_at,
                merchant_name: t.merchant_name ?? null,
                spa_name: t.spa_name ?? null,
              }))
            : [],
        });
      } catch (err: any) {
        console.error('Erreur Dashboard:', err);
        setState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: err?.message ?? String(err),
        }));
      }
    };

    run();
  }, []);

  const { status, userEmail, wallet, transactions, errorMessage } = state;

  return (
    <div className="min-h-screen bg-[#F8FAF5]">
      {/* Header PawPass */}
      <TopNav />

      {/* Contenu principal */}
      <main className="max-w-5xl mx-auto px-4 pb-16 pt-10 space-y-8">
        <section>
          <h1 className="text-3xl font-semibold text-slate-900 mb-1">
            Tableau de bord
          </h1>
          {userEmail && (
            <p className="text-sm text-slate-600">
              Connecté en tant que <span className="font-medium">{userEmail}</span>
            </p>
          )}
        </section>

        {status === 'loading' && (
          <p className="text-sm text-slate-600">Chargement de vos données…</p>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 text-sm text-red-700 rounded-2xl p-4">
            <p className="font-medium mb-1">
              Une erreur est survenue lors du chargement de votre tableau de bord.
            </p>
            <p>{errorMessage}</p>
          </div>
        )}

        {status === 'ok' && (
          <>
            {/* Carte cagnotte */}
            <section className="grid md:grid-cols-3 gap-5">
              <div className="md:col-span-2 bg-white rounded-2xl shadow-lg shadow-slate-200/60 p-6 space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">
                  Votre cagnotte PawPass
                </h2>
                <p className="text-sm text-slate-600">
                  Utilisez vos crédits en réduction immédiate chez les commerçants
                  partenaires, ou reversez-les à une SPA locale.
                </p>
                <div className="mt-2">
                  <p className="text-xs uppercase text-slate-500">
                    Solde disponible
                  </p>
                  <p className="text-3xl font-bold text-emerald-500 mt-1">
                    {wallet ? wallet.balance.toFixed(2) : '0.00'} €
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-slate-600 mt-3">
                  <span>
                    Cashback cumulé :{' '}
                    <strong>
                      {wallet?.total_cashback != null
                        ? wallet.total_cashback.toFixed(2)
                        : '—'}{' '}
                      €
                    </strong>
                  </span>
                  <span>
                    Dons vers les refuges :{' '}
                    <strong>
                      {wallet?.total_donations != null
                        ? wallet.total_donations.toFixed(2)
                        : '—'}{' '}
                      €
                    </strong>
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/60 p-6 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Prochaines actions
                </h3>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li>• Scanner un reçu chez un commerçant partenaire</li>
                  <li>• Utiliser vos crédits en caisse</li>
                  <li>• Faire un don à un refuge local</li>
                </ul>
              </div>
            </section>

            {/* Dernières transactions */}
            <section className="bg-white rounded-2xl shadow-lg shadow-slate-200/60 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  Dernières transactions
                </h2>
              </div>

              {transactions.length === 0 ? (
                <p className="text-sm text-slate-600">
                  Aucune transaction pour le moment. Scannez un premier reçu pour
                  commencer à générer du cashback solidaire.
                </p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {tx.merchant_name || 'Commerçant partenaire'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(tx.created_at).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {tx.spa_name && (
                          <p className="text-xs text-emerald-600">
                            Don pour : {tx.spa_name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          Montant : {tx.amount.toFixed(2)} €
                        </p>
                        <p className="text-xs text-emerald-600">
                          Cashback : +{tx.cashback_amount.toFixed(2)} €
                        </p>
                        {tx.donation_amount > 0 && (
                          <p className="text-xs text-orange-500">
                            Don : {tx.donation_amount.toFixed(2)} €
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

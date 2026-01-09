'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

type Step = 'form' | 'success';

export default function ScanPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [merchantCode, setMerchantCode] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('form');

  // On récupère le code commerçant UNIQUEMENT côté client
  useEffect(() => {
    const code =
      searchParams.get('m') ||
      searchParams.get('merchant') ||
      searchParams.get('merchant_code');

    if (code) {
      setMerchantCode(code);
    } else {
      setError(
        "QR code invalide ou lien incomplet. Le code commerçant n'a pas été trouvé dans l'URL."
      );
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!merchantCode) {
      setError("Code commerçant manquant. Le lien de scan est incomplet.");
      return;
    }

    const normalized = amount.replace(',', '.');
    const parsed = Number(normalized);

    if (!parsed || parsed <= 0) {
      setError('Merci de saisir un montant valide supérieur à 0.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Vérifier que l'utilisateur est connecté
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error('getUser error:', userError);
        setError(
          "Erreur d'authentification. Merci de vous reconnecter puis de rescanner le QR code."
        );
        setIsSubmitting(false);
        return;
      }

      if (!user) {
        setError(
          "Vous devez être connecté pour enregistrer une transaction. Merci de vous connecter puis de rescanner le QR code."
        );
        setIsSubmitting(false);
        return;
      }

      // Appel de ta fonction SQL
      const { data, error: rpcError } = await supabase.rpc(
        'apply_cashback_transaction',
        {
          p_merchant_code: merchantCode,
          p_amount: parsed,
          p_spa_id: null,
          p_use_wallet: false,
          p_wallet_spent: 0,
          p_donation_percent: 0,
        }
      );

      if (rpcError) {
        console.error('apply_cashback_transaction error:', rpcError);
        setError(
          `Erreur côté serveur lors de la création de la transaction : ${rpcError.message}`
        );
        setIsSubmitting(false);
        return;
      }

      console.log('Transaction créée :', data);
      setStep('success');
      setIsSubmitting(false);
    } catch (err: any) {
      console.error('Scan page error:', err);
      setError(err?.message ?? 'Erreur technique inattendue.');
      setIsSubmitting(false);
    }
  };

  const handleGoDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <main className="min-h-[70vh] px-4 pt-8 pb-12 bg-slate-50">
      <div className="max-w-xl mx-auto space-y-6 bg-white rounded-2xl shadow-sm p-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Validation de l&apos;achat
        </h1>

        {merchantCode ? (
          <p className="text-sm text-slate-600">
            Vous validez un achat chez le commerçant partenaire :{' '}
            <span className="font-mono text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
              {merchantCode}
            </span>
          </p>
        ) : (
          <p className="text-sm text-red-600">
            Aucun code commerçant détecté dans le lien. Merci de rescanner le QR
            code sur le comptoir du commerçant.
          </p>
        )}

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Montant de l&apos;achat (en €)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex : 23,50"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !merchantCode}
              className="w-full rounded-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? 'Enregistrement en cours...'
                : 'Valider mon achat et créditer ma cagnotte'}
            </button>

            <p className="text-xs text-slate-500">
              Le montant sert uniquement à calculer le cashback PawPass. Aucun
              prélèvement bancaire n&apos;est effectué.
            </p>
          </form>
        )}

        {step === 'success' && (
          <div className="space-y-3">
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              Votre achat a été validé et le cashback a été ajouté à votre
              cagnotte PawPass (ainsi qu&apos;éventuellement un don pour un
              refuge).
            </p>
            <button
              onClick={handleGoDashboard}
              className="w-full rounded-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition"
            >
              Voir ma cagnotte
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

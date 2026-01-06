'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import type { MerchantProfile, Spa } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import QrScanner from '@/components/QrScanner';

const MAX_AMOUNT = 200;
const RANDOM_RECEIPT_RATE = 0.1;
const DEFAULT_CASHBACK_PERCENT = 5;
const DEFAULT_TICKET_THRESHOLD = 50;
const CARD_STORAGE_KEY = 'pawpass:card';

const normalizeMerchantInput = (input: string) => {
  if (!input) return '';
  const sanitized = input.trim();
  if (!sanitized) return '';
  if (sanitized.includes('m=')) {
    try {
      const url = new URL(sanitized);
      return (url.searchParams.get('m') ?? '').trim();
    } catch {
      const [, queryString] = sanitized.split('?');
      const params = new URLSearchParams(queryString);
      return (params.get('m') ?? '').trim();
    }
  }
  return sanitized;
};

const formatTimeLeft = (seconds: number) => {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const COOLDOWN_SECONDS = 7200;
const COOLDOWN_MS = COOLDOWN_SECONDS * 1000;
const cooldownKey = (code: string) => `pawpass:cooldown:${code}`;

const readCooldownSeconds = (code: string) => {
  try {
    const raw = localStorage.getItem(cooldownKey(code));
    if (!raw) return null;
    const last = Number(raw);
    if (Number.isNaN(last)) return null;
    const remainingMs = COOLDOWN_MS - (Date.now() - last);
    if (remainingMs <= 0) return null;
    return Math.ceil(remainingMs / 1000);
  } catch {
    return null;
  }
};

const formatCooldown = (seconds: number) => {
  const clamped = Math.max(0, seconds);
  const hours = Math.floor(clamped / 3600);
  const mins = Math.ceil((clamped % 3600) / 60);
  if (hours >= 1) {
    return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
  }
  return `${Math.max(1, mins)} min`;
};

const readStoredCard = () => {
  try {
    const raw = localStorage.getItem(CARD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { name?: string; email?: string };
    if (!parsed?.name || !parsed?.email) return null;
    return { name: parsed.name, email: parsed.email };
  } catch {
    return null;
  }
};

const storeCard = (card: { name: string; email: string }) => {
  try {
    localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(card));
  } catch {
    // ignore storage errors
  }
};

export default function ScanPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const merchantToken = searchParams.get('m');
  const mode = searchParams.get('mode');
  const [scanMode, setScanMode] = useState<'after' | 'before'>('after');
  const [merchantCode, setMerchantCode] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [merchantValidated, setMerchantValidated] = useState(false);
  const [validatedAt, setValidatedAt] = useState<number | null>(null);
  const [expiryAt, setExpiryAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [amount, setAmount] = useState('');
  const [spas, setSpas] = useState<Spa[]>([]);
  const [spaId, setSpaId] = useState<string>('');
  const [donateCashback, setDonateCashback] = useState(false);
  const [donationPercent, setDonationPercent] = useState<50 | 100>(50);
  const [walletBalance, setWalletBalance] = useState(0);
  const [reductionActive, setReductionActive] = useState(false);
  const [reductionAmount, setReductionAmount] = useState('5');
  const [reductionRemaining, setReductionRemaining] = useState<number | null>(null);
  const [reductionExpired, setReductionExpired] = useState(false);
  const [cardInfo, setCardInfo] = useState<{ name: string; email: string } | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardEmail, setCardEmail] = useState('');
  const [cardError, setCardError] = useState<string | null>(null);
  const [receiptRequired, setReceiptRequired] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    dashboardUrl: string;
  } | null>(null);
  const [discountCoupon, setDiscountCoupon] = useState<{
    token: string;
    amount: number;
    merchant_name: string;
    created_at: string;
    expires_at: string;
  } | null>(null);
  const [discountTimeLeft, setDiscountTimeLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [transactionSucceeded, setTransactionSucceeded] = useState(false);
  const amountInputRef = useRef<HTMLInputElement | null>(null);

  const amountValue = useMemo(() => Number(amount.replace(',', '.')), [amount]);
  const reductionValue = useMemo(
    () => Number(reductionAmount.replace(',', '.')),
    [reductionAmount]
  );
  const amountAfterReduction = useMemo(() => {
    if (!amountValue || Number.isNaN(amountValue)) return null;
    if (Number.isNaN(reductionValue)) return amountValue;
    return Math.max(amountValue - Math.max(0, reductionValue), 0);
  }, [amountValue, reductionValue]);

  const validateMerchant = async (code: string) => {
    setError(null);
    setMerchant(null);
    setMerchantValidated(false);
    setValidatedAt(null);
    setExpiryAt(null);
    setTimeLeft(0);
    setSuccessInfo(null);
    setTransactionSucceeded(false);

    if (!code) {
      setError('Commerçant introuvable.');
      return;
    }

    const { data, error: merchantError } = await supabase
      .from('profiles')
      .select('id,role,merchant_code')
      .eq('merchant_code', code)
      .limit(1)
      .maybeSingle();

    console.debug('[Scan] merchant lookup', code, { data, error: merchantError });

    if (merchantError) {
      console.error('[Scan] merchant lookup error', merchantError);
      setError(merchantError.message);
      return;
    }

    if (!data) {
      setError('Commerçant introuvable.');
      return;
    }

    if (data.role?.toLowerCase() !== 'merchant') {
      setError("Ce QR n'appartient pas à un commerçant.");
      return;
    }

    setMerchant(data);
    setMerchantValidated(true);
    const now = Date.now();
    setValidatedAt(now);
    setExpiryAt(now + 120_000);
    setTimeLeft(120);
  };

  const handleStartDiscount = async () => {
    setError(null);
    setStatus(null);
    setCardError(null);

    if (!cardInfo) {
      setShowCardModal(true);
      setCardError('Veuillez créer votre carte PawPass pour continuer.');
      return;
    }

    if (!merchantValidated || !merchantCode) {
      setError('Veuillez scanner/valider un commerçant.');
      return;
    }

    if (Number.isNaN(reductionValue) || reductionValue <= 0) {
      setError('Montant de réduction invalide.');
      return;
    }
    if (reductionValue > walletBalance) {
      setError('Le montant dépasse votre solde disponible.');
      return;
    }

    const { data, error: startError } = await supabase.rpc('create_discount_coupon', {
      p_merchant_code: merchantCode,
      p_amount: reductionValue
    });

    if (startError) {
      setError(startError.message);
      return;
    }

    const session = Array.isArray(data) ? data[0] : data;
    if (!session) {
      setError('Impossible de démarrer la session.');
      return;
    }
    if (session.ok === false) {
      setError(session.error ?? 'Impossible de démarrer la session.');
      return;
    }
    setDiscountCoupon({
      token: session.token,
      amount: session.amount,
      merchant_name: session.merchant?.name ?? merchantCode,
      created_at: session.created_at,
      expires_at: session.expires_at
    });
  };

  useEffect(() => {
    const guardRole = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        return;
      }

      if (profile.role?.toUpperCase() === 'MERCHANT') {
        router.replace('/merchant');
      }
    };

    void guardRole();

    if (mode === 'use_wallet') {
      setReductionActive(true);
    }
    if (mode === 'before_payment_discount') {
      setScanMode('before');
    }

    if (merchantToken) {
      const parsedToken = normalizeMerchantInput(merchantToken);
      if (parsedToken) {
        setMerchantCode(parsedToken);
        setTokenInput(parsedToken);
        void validateMerchant(parsedToken);
      }
    }
  }, [merchantToken, mode, router, supabase]);

  useEffect(() => {
    setCardInfo(readStoredCard());
  }, []);

  useEffect(() => {
    if (!merchantValidated || !merchantCode) {
      return;
    }
    if (!cardInfo) {
      setShowCardModal(true);
    }
  }, [cardInfo, merchantCode, merchantValidated]);

  useEffect(() => {
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

    const loadWallet = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) {
        setWalletBalance(0);
        return;
      }

      setWalletBalance(data?.balance ?? 0);
    };

    setError(null);
    void loadSpas();
    void loadWallet();
  }, [supabase]);

  useEffect(() => {
    if (!merchant) {
      return;
    }

    if (!amountValue || Number.isNaN(amountValue)) {
      setReceiptRequired(false);
      return;
    }

    const needsReceipt =
      amountValue >= DEFAULT_TICKET_THRESHOLD || Math.random() < RANDOM_RECEIPT_RATE;
    setReceiptRequired(needsReceipt);
  }, [amountValue, merchant]);

  useEffect(() => {
    if (!reductionActive || !merchantValidated || !merchant) {
      setReductionRemaining(null);
      setReductionExpired(false);
      return;
    }

    setReductionRemaining(60);
    setReductionExpired(false);
    const timer = window.setInterval(() => {
      setReductionRemaining((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          window.clearInterval(timer);
          setReductionExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [merchant, reductionActive]);

  useEffect(() => {
    if (!reductionActive) {
      return;
    }
    const maxReduction = Math.min(walletBalance, amountValue || walletBalance, 5);
    const nextDefault = maxReduction > 0 ? maxReduction : 5;
    setReductionAmount(String(nextDefault));
  }, [amountValue, reductionActive, walletBalance]);

  useEffect(() => {
    if (!merchantValidated || !expiryAt) {
      setTimeLeft(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((expiryAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiryAt, merchantValidated]);

  useEffect(() => {
    if (!discountCoupon?.expires_at) {
      setDiscountTimeLeft(0);
      return;
    }
    const expiresAt = new Date(discountCoupon.expires_at).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setDiscountTimeLeft(remaining);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [discountCoupon]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setCardError(null);

    if (loading) {
      return;
    }

    if (!cardInfo) {
      setShowCardModal(true);
      setCardError('Veuillez créer votre carte PawPass pour continuer.');
      return;
    }

    if (!merchantCode) {
      setError('Veuillez saisir un code commerçant.');
      return;
    }

    if (!merchantValidated || !merchant || !merchantCode) {
      setError('Veuillez scanner/valider un commerçant.');
      return;
    }

    if (timeLeft <= 0) {
      setError('Le délai est expiré. Veuillez rescanner un commerçant.');
      return;
    }

    const cooldownSeconds = readCooldownSeconds(merchantCode);
    if (cooldownSeconds !== null) {
      setError(
        `Anti-triche : vous pourrez refaire un achat dans ${formatCooldown(cooldownSeconds)}.`
      );
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Session expirée.');
      return;
    }

    if (!amountValue || Number.isNaN(amountValue) || amountValue <= 0) {
      setError('Montant invalide.');
      return;
    }

    if (amountValue > MAX_AMOUNT) {
      setError(`Montant maximum autorisé : ${MAX_AMOUNT} €.`);
      return;
    }

    if (donateCashback && !spaId) {
      setError('Veuillez sélectionner une SPA.');
      return;
    }

    const walletReduction = reductionActive ? reductionValue : 0;
    if (reductionActive) {
      if (Number.isNaN(walletReduction) || walletReduction < 0) {
        setError('Montant de réduction invalide.');
        return;
      }
      if (walletBalance < 5) {
        setError('Votre solde cashback doit atteindre 5€ pour utiliser une réduction.');
        return;
      }
      if (walletReduction > walletBalance) {
        setError('La réduction dépasse votre solde disponible.');
        return;
      }
      if (walletReduction > amountValue) {
        setError('La réduction dépasse le montant du ticket.');
        return;
      }
      if (reductionExpired) {
        setError('Le délai de réduction est expiré. Veuillez rescanner un commerçant.');
        return;
      }
    }

    if (scanMode === 'after' && receiptRequired && !receiptFile) {
      setError('Le ticket est requis pour cette transaction.');
      return;
    }

    let receiptPath: string | null = null;
    let receiptUrl: string | null = null;

    if (scanMode === 'after' && receiptRequired && receiptFile) {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      receiptPath = uploadData.path;
      const { data: publicData } = supabase.storage.from('receipts').getPublicUrl(receiptPath);
      receiptUrl = publicData.publicUrl ?? null;
    }

    const amountNet = amountValue - (reductionActive ? walletReduction : 0);
    const cashbackTotal = Number(((amountNet * DEFAULT_CASHBACK_PERCENT) / 100).toFixed(2));
    const donationAmount = donateCashback ? (cashbackTotal * donationPercent) / 100 : 0;
    const cashbackToUser = donateCashback ? 0 : cashbackTotal;

    const walletSpent = reductionActive ? walletReduction : 0;

    setLoading(true);
    const { error: rpcError } = await supabase.rpc(
      'apply_cashback_transaction',
      {
        p_merchant_code: merchantCode,
        p_amount: amountValue,
        p_spa_id: donateCashback ? spaId || null : null,
        p_use_wallet: reductionActive,
        p_wallet_spent: walletSpent,
        p_donation_percent: donateCashback ? donationPercent : 0,
        p_receipt_image_url: receiptUrl
      }
    );
    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    try {
      localStorage.setItem(cooldownKey(merchantCode), String(Date.now()));
    } catch {
      // ignore storage errors
    }

    setStatus('Transaction enregistrée ✅');
    setAmount('');
    setReceiptFile(null);
    setDonateCashback(false);
    setSpaId('');
    setDonationPercent(50);
    setReductionActive(false);
    setReductionAmount('5');
    setReductionRemaining(null);
    setReductionExpired(false);
    setTransactionSucceeded(true);

    if (donationAmount > 0) {
      const spaName = spas.find((spa) => spa.id === spaId)?.name ?? 'une SPA';
      const formattedAmount = formatCurrency(donationAmount);
      const params = new URLSearchParams({
        thanks: '1',
        amount: formattedAmount.replace('€', '').trim(),
        spa: spaName
      });
      setSuccessInfo({
        message: `Cashback ajouté. Merci pour votre don à ${spaName} ❤️`,
        dashboardUrl: `/dashboard?${params.toString()}`
      });
      return;
    }

    setSuccessInfo({
      message: 'Cashback ajouté ✅',
      dashboardUrl: '/dashboard'
    });
  };

  return (
    <div className="container">
      <div className="nav">
        <strong>Scanner PawPass</strong>
        <div className="nav-links">
          <Link href="/dashboard">Tableau de bord</Link>
          <Link href="/transactions">Historique</Link>
          <Link href="/settings">Paramètres</Link>
        </div>
      </div>

      {showCardModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(15, 23, 42, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 420 }}>
            <h2>Créer votre carte PawPass</h2>
            <p className="helper">
              Renseignez vos informations pour continuer vers le paiement.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setCardError(null);
                const trimmedName = cardName.trim();
                const trimmedEmail = cardEmail.trim();
                if (!trimmedName) {
                  setCardError('Veuillez saisir votre nom.');
                  return;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
                  setCardError('Veuillez saisir un email valide.');
                  return;
                }
                const nextCard = { name: trimmedName, email: trimmedEmail };
                storeCard(nextCard);
                setCardInfo(nextCard);
                setShowCardModal(false);
                setCardName('');
                setCardEmail('');
                setStatus('Carte PawPass créée ✅ Vous pouvez passer au paiement.');
                window.setTimeout(() => {
                  amountInputRef.current?.focus();
                  amountInputRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                  });
                }, 0);
              }}
            >
              <label className="label" htmlFor="cardName">
                Nom et prénom
                <input
                  id="cardName"
                  className="input"
                  value={cardName}
                  onChange={(event) => setCardName(event.target.value)}
                  required
                />
              </label>
              <label className="label" htmlFor="cardEmail">
                Email
                <input
                  id="cardEmail"
                  className="input"
                  type="email"
                  value={cardEmail}
                  onChange={(event) => setCardEmail(event.target.value)}
                  required
                />
              </label>
              {cardError && <p className="error">{cardError}</p>}
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="button" type="submit">
                  Continuer
                </button>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setShowCardModal(false)}
                >
                  Plus tard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Parcours en 3 étapes</h2>
          <Link href="/help">Comment ça marche ?</Link>
        </div>
        <div className="grid" style={{ gap: 8, marginTop: 12 }}>
          <div className="badge">1 · Scanner</div>
          <div className="badge">2 · Montant</div>
          <div className="badge">3 · Choix</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <label className="label">Mode de scan</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className={`button${scanMode === 'after' ? '' : ' secondary'}`}
              type="button"
              aria-pressed={scanMode === 'after'}
              onClick={() => setScanMode('after')}
            >
              Après paiement
            </button>
            <button
              className={`button${scanMode === 'before' ? '' : ' secondary'}`}
              type="button"
              aria-pressed={scanMode === 'before'}
              onClick={() => setScanMode('before')}
            >
              Avant paiement
            </button>
          </div>
        </div>

        <h3 style={{ marginTop: 20 }}>Étape 1 · Scanner</h3>
        {merchantValidated && merchant ? (
          <div className="card" style={{ marginTop: 12 }}>
            <p>
              <strong>Commerçant :</strong> {merchant.merchant_code ?? merchant.id}
            </p>
            {transactionSucceeded && (
              <>
                <p>
                  <strong>Validé le :</strong>{' '}
                  {validatedAt ? new Date(validatedAt).toLocaleString('fr-FR') : '—'}
                </p>
                <p>
                  <strong>Temps restant :</strong> {formatTimeLeft(timeLeft)}
                </p>
              </>
            )}
          </div>
        ) : (
          <p className="helper">Aucun commerçant chargé.</p>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <div className="grid grid-2" style={{ marginTop: 16 }}>
            <QrScanner
              onResult={(value) => {
                const parsed = normalizeMerchantInput(value);
                if (!parsed) {
                  setError('Commerçant introuvable.');
                  return;
                }
                setMerchantCode(parsed);
                setTokenInput(parsed);
                void validateMerchant(parsed);
              }}
            />
            <div className="card">
              <h3>Entrer le code commerçant</h3>
              <label className="label" htmlFor="token">
                Code commerçant
                <input
                  id="token"
                  className="input"
                  value={tokenInput}
                  onChange={(event) => {
                    const value = event.target.value;
                    const normalized = normalizeMerchantInput(value);
                    setTokenInput(normalized || value.trim());
                    if (value.includes('m=')) {
                      if (normalized) {
                        setMerchantCode(normalized);
                        void validateMerchant(normalized);
                      }
                    }
                  }}
                  placeholder="Ex: PP_XXXX"
                />
              </label>
              <button
                className="button"
                type="button"
                onClick={() => {
                  const parsed = normalizeMerchantInput(tokenInput);
                  setMerchantCode(parsed);
                  void validateMerchant(parsed);
                }}
                style={{ marginTop: 12 }}
              >
                Continuer
              </button>
              {merchantCode && (
                <p className="helper" style={{ marginTop: 8 }}>
                  Code commerçant détecté : <strong>{merchantCode}</strong>
                </p>
              )}
            </div>
          </div>

          <h3 style={{ marginTop: 16 }}>Étape 2 · Montant</h3>
          <label className="label" htmlFor="amount">
            Montant du ticket
            <input
              id="amount"
              className="input"
              type="number"
              step="0.01"
              min="0"
              max={MAX_AMOUNT}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              ref={amountInputRef}
              required
            />
            <p className="helper">Plafond de {MAX_AMOUNT} € par transaction.</p>
          </label>

          {amountValue > 0 && !Number.isNaN(amountValue) && (
            <p className="helper">
              Cashback estimé :{' '}
              <strong>
                {formatCurrency((amountValue * DEFAULT_CASHBACK_PERCENT) / 100)}
              </strong>
            </p>
          )}

          {scanMode === 'after' && receiptRequired && (
            <label className="label" htmlFor="receipt">
              Ticket requis
              <input
                id="receipt"
                className="input"
                type="file"
                accept="image/*"
                onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
              />
            </label>
          )}

          {scanMode === 'after' && (
            <div style={{ marginTop: 16 }}>
              <label className="label">
                Souhaitez-vous reverser votre cashback ?
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={donateCashback}
                  onChange={(event) => setDonateCashback(event.target.checked)}
                />
                Oui, je souhaite donner
              </label>
            </div>
          )}

          {donateCashback && scanMode === 'after' && (
            <label className="label" htmlFor="association">
              SPA / Association
              <select
                id="association"
                className="select"
                value={spaId}
                onChange={(event) => setSpaId(event.target.value)}
                required
              >
                <option value="">Sélectionner une SPA</option>
                {spas.map((spa) => (
                  <option key={spa.id} value={spa.id}>
                    {spa.name} {spa.city ? `· ${spa.city}` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          {donateCashback && scanMode === 'after' && (
            <label className="label" htmlFor="donationPercent">
              Pourcentage reversé
              <select
                id="donationPercent"
                className="select"
                value={donationPercent}
                onChange={(event) => setDonationPercent(Number(event.target.value) as 50 | 100)}
              >
                <option value={50}>50% (recommandé)</option>
                <option value={100}>100%</option>
              </select>
            </label>
          )}

          {scanMode === 'after' && (
            <div style={{ marginTop: 16 }}>
              <h3>Étape 3 · Choix</h3>
              <label className="label">Utiliser ma cagnotte</label>
              <p className="helper">Solde disponible : {formatCurrency(walletBalance)}</p>
              {walletBalance < 5 ? (
                <p className="helper">
                  Encore {formatCurrency(5 - walletBalance)} pour pouvoir utiliser vos réductions.
                </p>
              ) : (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setReductionActive((prev) => !prev)}
                >
                  {reductionActive ? 'Désactiver la réduction' : 'Utiliser ma cagnotte'}
                </button>
              )}

              {reductionActive && walletBalance >= 5 && (
                <div style={{ marginTop: 12 }}>
                  <label className="label" htmlFor="reduction">
                    Montant à utiliser (€)
                    <input
                      id="reduction"
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      max={Math.min(walletBalance, amountValue || walletBalance)}
                      value={reductionAmount}
                      onChange={(event) => setReductionAmount(event.target.value)}
                    />
                  </label>
                  {reductionRemaining !== null && (
                    <p className="helper">
                      Délai restant : {reductionRemaining}s
                      {reductionExpired ? ' (expiré)' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {scanMode === 'before' && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3>Utiliser mes crédits (avant paiement)</h3>
              <label className="label" htmlFor="discountAmount">
                Montant de réduction à utiliser
                <input
                  id="discountAmount"
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={reductionAmount}
                  onChange={(event) => setReductionAmount(event.target.value)}
                />
              </label>
              {amountAfterReduction !== null && (
                <p className="helper">
                  Total après réduction : <strong>{formatCurrency(amountAfterReduction)}</strong>
                </p>
              )}
              <button className="button" type="button" onClick={handleStartDiscount}>
                Générer le code
              </button>
              {discountCoupon && (
                <div
                  className="card"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 50,
                    margin: 0,
                    borderRadius: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center'
                  }}
                >
                  <h3>Montrez au commerçant</h3>
                  <p style={{ fontSize: '1.8rem', fontWeight: 700 }}>
                    Réduction : {formatCurrency(discountCoupon.amount)}
                  </p>
                  <p>
                    <strong>Commerçant :</strong> {discountCoupon.merchant_name}
                  </p>
                  <p>
                    <strong>Créé le :</strong>{' '}
                    {new Date(discountCoupon.created_at).toLocaleString('fr-FR')}
                  </p>
                  <p style={{ fontSize: '1.6rem', fontWeight: 700 }}>
                    {discountCoupon.token}
                  </p>
                  <p>
                    <strong>Temps restant :</strong> {formatTimeLeft(discountTimeLeft)}
                  </p>
                  <p className="helper">
                    Montrez cet écran au commerçant avant la fin du timer.
                  </p>
                  {discountTimeLeft <= 0 && <p className="error">Coupon expiré.</p>}
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => setDiscountCoupon(null)}
                    >
                      Fermer
                    </button>
                    <button
                      className="button"
                      type="button"
                      onClick={() => {
                        setDiscountCoupon(null);
                        setReductionAmount('5');
                      }}
                    >
                      Générer un nouveau coupon
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="error">{error}</p>}
          {status && <p>{status}</p>}

          {scanMode === 'after' && (
            <button
              className="button"
              type="submit"
              style={{ marginTop: 16 }}
              disabled={!merchantValidated || timeLeft <= 0 || loading}
            >
              {loading ? 'Validation...' : 'Valider la transaction'}
            </button>
          )}
        </form>

        {successInfo && (
          <div className="card" style={{ marginTop: 16, textAlign: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                margin: '0 auto 12px',
                background: '#22c55e',
                animation: 'pulse 1.2s ease-in-out infinite'
              }}
            />
            <h3>{successInfo.message}</h3>
            <p className="helper">Merci ! Votre cashback est à jour.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
              <button
                className="button"
                type="button"
                onClick={() => router.push(successInfo.dashboardUrl)}
              >
                Retour au tableau de bord
              </button>
              <button
                className="button secondary"
                type="button"
                onClick={() => router.push('/transactions')}
              >
                Voir mes transactions
              </button>
            </div>
            <style jsx>{`
              @keyframes pulse {
                0% {
                  transform: scale(0.9);
                  opacity: 0.7;
                }
                50% {
                  transform: scale(1.05);
                  opacity: 1;
                }
                100% {
                  transform: scale(0.9);
                  opacity: 0.7;
                }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}

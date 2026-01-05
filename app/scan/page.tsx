'use client';

import { useEffect, useMemo, useState } from 'react';
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

const extractToken = (rawValue: string) => {
  if (!rawValue) return '';
  try {
    const url = new URL(rawValue);
    const token = url.searchParams.get('m');
    return token ?? rawValue;
  } catch {
    if (rawValue.includes('?')) {
      const [, queryString] = rawValue.split('?');
      const params = new URLSearchParams(queryString);
      return params.get('m') ?? rawValue;
    }
    return rawValue;
  }
};

export default function ScanPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const merchantToken = searchParams.get('m');
  const [token, setToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [amount, setAmount] = useState('');
  const [spas, setSpas] = useState<Spa[]>([]);
  const [spaId, setSpaId] = useState<string>('');
  const [donateCashback, setDonateCashback] = useState(false);
  const [receiptRequired, setReceiptRequired] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amountValue = useMemo(() => Number(amount.replace(',', '.')), [amount]);

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

    if (merchantToken) {
      const parsedToken = extractToken(merchantToken);
      setToken(parsedToken);
      setTokenInput(parsedToken);
    }
  }, [merchantToken, router, supabase]);

  useEffect(() => {
    const loadMerchant = async () => {
      if (!token) {
        setMerchant(null);
        return;
      }

      const { data, error: merchantError } = await supabase
        .from('profiles')
        .select('id,role,merchant_code')
        .eq('merchant_code', token)
        .eq('role', 'merchant')
        .single();

      if (merchantError) {
        setError(merchantError.message);
        return;
      }

      setMerchant(data);
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

    setError(null);
    void loadMerchant();
    void loadSpas();
  }, [token, supabase]);

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (!token) {
      setError('Veuillez saisir un token commerçant.');
      return;
    }

    if (!merchant) {
      setError('Commerçant introuvable.');
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
      setError(`Montant maximum autorisé : ${MAX_AMOUNT}€.`);
      return;
    }

    if (donateCashback && !spaId) {
      setError('Veuillez sélectionner une SPA.');
      return;
    }

    if (receiptRequired && !receiptFile) {
      setError('Le ticket est requis pour cette transaction.');
      return;
    }

    let receiptPath: string | null = null;

    if (receiptRequired && receiptFile) {
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
    }

    const { error: rpcError } = await supabase.rpc('create_transaction', {
      p_merchant_id: merchant.id,
      p_amount: amountValue,
      p_receipt_path: receiptPath,
      p_donate_cashback: donateCashback,
      p_spa_id: donateCashback ? spaId || null : null
    });

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setStatus('Transaction enregistrée ✅');
    setAmount('');
    setReceiptFile(null);
    setDonateCashback(false);
    setSpaId('');
  };

  return (
    <div className="container">
      <div className="nav">
        <strong>Scan PawPass</strong>
        <div className="nav-links">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/transactions">Transactions</Link>
          <Link href="/settings">Paramètres</Link>
        </div>
      </div>

      <div className="card">
        <h2>Scanner le QR commerçant</h2>
        {merchant ? (
          <p>
            Token détecté : <strong>{merchant.merchant_code}</strong>
          </p>
        ) : (
          <p className="helper">Aucun commerçant chargé.</p>
        )}

        <div className="grid grid-2" style={{ marginTop: 16 }}>
          <QrScanner
            onResult={(value) => {
              const parsed = extractToken(value);
              setToken(parsed);
              setTokenInput(parsed);
            }}
          />
          <div className="card">
            <h3>Entrer le token manuellement</h3>
            <label className="label" htmlFor="token">
              Code commerçant / Token QR
              <input
                id="token"
                className="input"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="Ex: TEST_QR_TOKEN_123"
              />
            </label>
            <button
              className="button"
              type="button"
              onClick={() => setToken(extractToken(tokenInput.trim()))}
              style={{ marginTop: 12 }}
            >
              Valider le token
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
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
              required
            />
            <p className="helper">Plafond de {MAX_AMOUNT}€ par transaction.</p>
          </label>

          {amountValue > 0 && !Number.isNaN(amountValue) && (
            <p className="helper">
              Cashback estimé :{' '}
              <strong>
                {formatCurrency((amountValue * DEFAULT_CASHBACK_PERCENT) / 100)}
              </strong>
            </p>
          )}

          {receiptRequired && (
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

          {donateCashback && (
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

          {error && <p className="error">{error}</p>}
          {status && <p>{status}</p>}

          <button className="button" type="submit" style={{ marginTop: 16 }}>
            Valider la transaction
          </button>
        </form>
      </div>
    </div>
  );
}

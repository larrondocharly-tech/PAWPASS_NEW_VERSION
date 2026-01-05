'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import type { Association, Merchant } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

const MAX_AMOUNT = 200;
const RANDOM_RECEIPT_RATE = 0.1;

export default function ScanPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const merchantToken = searchParams.get('m');
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [amount, setAmount] = useState('');
  const [associations, setAssociations] = useState<Association[]>([]);
  const [associationId, setAssociationId] = useState<string>('');
  const [donateCashback, setDonateCashback] = useState(false);
  const [receiptRequired, setReceiptRequired] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amountValue = useMemo(() => Number(amount.replace(',', '.')), [amount]);

  useEffect(() => {
    const loadMerchant = async () => {
      if (!merchantToken) {
        setError('QR code invalide.');
        return;
      }

      const { data, error: merchantError } = await supabase
        .from('merchants')
        .select('id,name,qr_token,cashback_percent,threshold_ticket')
        .eq('qr_token', merchantToken)
        .single();

      if (merchantError) {
        setError(merchantError.message);
        return;
      }

      setMerchant(data);
    };

    const loadAssociations = async () => {
      const { data, error: associationsError } = await supabase
        .from('associations')
        .select('id,name,active')
        .eq('active', true)
        .order('name');

      if (associationsError) {
        setError(associationsError.message);
        return;
      }

      setAssociations(data ?? []);
    };

    void loadMerchant();
    void loadAssociations();
  }, [merchantToken, supabase]);

  useEffect(() => {
    if (!merchant) {
      return;
    }

    if (!amountValue || Number.isNaN(amountValue)) {
      setReceiptRequired(false);
      return;
    }

    const needsReceipt =
      amountValue >= merchant.threshold_ticket || Math.random() < RANDOM_RECEIPT_RATE;
    setReceiptRequired(needsReceipt);
  }, [amountValue, merchant]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

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

    if (donateCashback && !associationId) {
      setError('Veuillez sélectionner une association.');
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
      p_association_id: donateCashback ? associationId || null : null
    });

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setStatus('Transaction enregistrée ✅');
    setAmount('');
    setReceiptFile(null);
    setDonateCashback(false);
    setAssociationId('');
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
            Vous êtes chez <strong>{merchant.name}</strong> · Cashback{' '}
            <strong>{merchant.cashback_percent}%</strong>
          </p>
        ) : (
          <p className="helper">Chargement du commerçant…</p>
        )}

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

          {merchant && amountValue > 0 && !Number.isNaN(amountValue) && (
            <p className="helper">
              Cashback estimé :{' '}
              <strong>
                {formatCurrency((amountValue * merchant.cashback_percent) / 100)}
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
              Association
              <select
                id="association"
                className="select"
                value={associationId}
                onChange={(event) => setAssociationId(event.target.value)}
                required
              >
                <option value="">Sélectionner une association</option>
                {associations.map((association) => (
                  <option key={association.id} value={association.id}>
                    {association.name}
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

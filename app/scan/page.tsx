'use client';

import React, { useEffect, useState, ComponentType } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

// QrScanner sans types (on force tout en any proprement)
import QrScannerRaw from 'react-qr-scanner';
const QrScanner = QrScannerRaw as ComponentType<any>;

// Scanner style
const scannerStyle = {
  width: '100%',
  maxWidth: 400,
};

// Next.js en dynamique
export const dynamic = 'force-dynamic';

interface Spa {
  id: string;
  name: string;
}

export default function ScanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [scanned, setScanned] = useState(false);
  const [showScanner, setShowScanner] = useState(true);
  const [merchantCode, setMerchantCode] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [spas, setSpas] = useState<Spa[]>([]);
  const [selectedSpaId, setSelectedSpaId] = useState('');
  const [donationPercent, setDonationPercent] = useState(50);

  const merchantCodeFromQuery = searchParams.get('m');
  const resolvedMerchantCode = merchantCodeFromQuery ?? merchantCode;

  // Si on arrive via un lien QR
  useEffect(() => {
    if (merchantCodeFromQuery && !merchantCode) {
      setMerchantCode(merchantCodeFromQuery);
      setShowScanner(false);
    }
  }, [merchantCodeFromQuery, merchantCode]);

  // Charger SPAs
  useEffect(() => {
    const loadSpas = async () => {
      const { data, error } = await supabase
        .from('spas')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) return console.error("Erreur SPAs :", error);
      setSpas(data || []);
    };

    loadSpas();
  }, [supabase]);

  // Scan QR
  const handleScan = (data: any) => {
    if (!data) return;

    const txt = typeof data === 'string' ? data : data.text;
    if (!txt) return;

    setMerchantCode(txt);
    setShowScanner(false);
    setErrorMsg(null);
  };

  const handleError = () => {};

  // Soumission transaction
  const handleValidateTransaction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg('');
    setLoading(true);

    if (!resolvedMerchantCode) {
      setErrorMsg('Merci de scanner un commerçant.');
      return setLoading(false);
    }

    const normalizedAmount = amount.replace(',', '.');
    const parsedAmount = parseFloat(normalizedAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMsg('Montant invalide.');
      return setLoading(false);
    }

    if (!selectedSpaId) {
      setErrorMsg('Choisissez un refuge bénéficiaire.');
      return setLoading(false);
    }

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      router.push(
        `/register?from=scan&m=${resolvedMerchantCode}&amount=${parsedAmount}`
      );
      return setLoading(false);
    }

    // Appel RPC supabase
    const { error } = await supabase.rpc('apply_cashback_transaction', {
      p_merchant_code: resolvedMerchantCode,
      p_amount: parsedAmount,
      p_spa_id: selectedSpaId,
      p_use_wallet: false,
      p_wallet_spent: 0,
      p_donation_percent: donationPercent,
    });

    if (error) {
      setErrorMsg(error.message);
      return setLoading(false);
    }

    setSuccessMsg('Transaction enregistrée !');
    setAmount('');
    setSelectedSpaId('');
    setDonationPercent(50);

    router.push('/dashboard');
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', padding: 16, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 600 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Scanner un commerçant</h1>

        {errorMsg && <p style={{ color: '#b91c1c' }}>{errorMsg}</p>}
        {successMsg && <p style={{ color: '#047857' }}>{successMsg}</p>}

        {/* SCANNER */}
        {showScanner && (
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <div style={scannerStyle}>
              <QrScanner
                delay={300}
                onScan={handleScan}
                onError={handleError}
                constraints={{
                  video: {
                    facingMode: { ideal: 'environment' }, // caméra arrière
                  },
                }}
              />
            </div>
          </div>
        )}

        {!showScanner && (
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            style={{
              marginBottom: 16,
              padding: 10,
              borderRadius: 8,
              border: '1px solid #d1d5db',
            }}
          >
            Re-scanner un QR code
          </button>
        )}

        {/* FORM */}
        <form onSubmit={handleValidateTransaction}>
          <label style={{ fontWeight: 600 }}>Code commerçant</label>
          <input
            type="text"
            value={merchantCode || ''}
            onChange={(e) => setMerchantCode(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
          />

          <input
            type="number"
            placeholder="Montant de l'achat"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ padding: 10, width: '100%', marginTop: 10 }}
          />

          <label style={{ fontWeight: 600, marginTop: 10, display: 'block' }}>
            Refuge bénéficiaire
          </label>
          <select
            value={selectedSpaId}
            onChange={(e) => setSelectedSpaId(e.target.value)}
            style={{ width: '100%', padding: 10, marginTop: 5 }}
          >
            <option value="">Choisir...</option>
            {spas.map((spa) => (
              <option key={spa.id} value={spa.id}>
                {spa.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 16,
              padding: '10px 20px',
              background: '#0A8F44',
              color: 'white',
              borderRadius: 8,
              fontSize: 18,
            }}
          >
            Valider
          </button>
        </form>
      </div>
    </div>
  );
}

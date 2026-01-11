'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import QRCodeCard from '@/components/QRCodeCard';
import { formatCurrency } from '@/lib/utils';

export const dynamic = "force-dynamic";

interface MerchantProfile {
  id: string;
  role: string | null;
  merchant_code: string | null;
  merchant_id: string | null;
}

interface MerchantStats {
  merchant_id: string;
  total_transactions: number;
  total_volume: number;
  total_cashback: number;
  total_donations: number;
  total_profit_pawpass: number;
  month_transactions: number;
  month_volume: number;
  month_cashback: number;
  month_donations: number;
  month_profit_pawpass: number;
}

export default function MerchantPage() {
  const supabase = createClient();
  const router = useRouter();

  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [stats, setStats] = useState<MerchantStats | null>(null);
  const [qrValue, setQrValue] = useState('');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------------------------------------
  // 1. CHARGER PROFIL COMMERÇANT
  // -----------------------------------------------------------
  useEffect(() => {
    const loadMerchant = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      // Charger profil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id,role,merchant_code,merchant_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setError(profileError.message);
        return;
      }

      if (!profile) {
        setError("Profil introuvable.");
        return;
      }

      // Vérification du rôle
      if (profile.role?.toLowerCase() !== "merchant" || !profile.merchant_id) {
        router.replace('/dashboard');
        return;
      }

      // Générer code si absent
      if (!profile.merchant_code) {
        const generatedToken = `PP_${user.id.slice(0, 8)}_${Math.random()
          .toString(36)
          .slice(2, 8)}`.toUpperCase();

        await supabase
          .from('profiles')
          .update({ merchant_code: generatedToken })
          .eq('id', user.id);

        profile.merchant_code = generatedToken;
      }

      setMerchant(profile);

      // Charger stats SQL
      const { data: statsData, error: statsError } = await supabase
        .from('merchant_dashboard_stats')
        .select('*')
        .eq('merchant_id', profile.merchant_id)
        .single();

      if (statsError) {
        setError(statsError.message);
        return;
      }

      if (statsData) setStats(statsData);
    };

    loadMerchant();
  }, [router, supabase]);

  // -----------------------------------------------------------
  // 2. CRÉATION DU LIEN QR
  // -----------------------------------------------------------
  useEffect(() => {
    if (!merchant?.merchant_code) return;

    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL;

    setQrValue(`${baseUrl}/scan?m=${merchant.merchant_code}`);
  }, [merchant]);

  // -----------------------------------------------------------
  // 3. COPIE DU LIEN QR
  // -----------------------------------------------------------
  const handleCopy = async () => {
    if (!qrValue) return;
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopyStatus("Copié !");
    } catch {
      setCopyStatus("Impossible de copier.");
    }
  };

  // -----------------------------------------------------------
  // 4. RENDER
  // -----------------------------------------------------------
  if (!merchant) {
    return (
      <div className="container">
        <h1>Mon QR commerçant</h1>
        <div className="card">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Mon QR commerçant</h1>

      <div className="grid grid-2">
        {/* ---------------- QR CODE ---------------- */}
        <QRCodeCard value={qrValue} title="QR PawPass · Commerçant" />

        {/* ---------------- STATISTIQUES DU MOIS ---------------- */}
        <div className="card">
          <h2>Statistiques du mois</h2>

          <p>
            <strong>Transactions :</strong>{" "}
            {stats?.month_transactions ?? 0}
          </p>

          <p>
            <strong>Volume généré :</strong>{" "}
            {formatCurrency(stats?.month_volume ?? 0)}
          </p>

          <p>
            <strong>Cashback distribué :</strong>{" "}
            {formatCurrency(stats?.month_cashback ?? 0)}
          </p>

          <p>
            <strong>Dons vers les refuges :</strong>{" "}
            {formatCurrency(stats?.month_donations ?? 0)}
          </p>

          <p>
            <strong>CA estimé PawPass :</strong>{" "}
            {formatCurrency(stats?.month_profit_pawpass ?? 0)}
          </p>

          <button
            className="button"
            type="button"
            onClick={handleCopy}
            style={{ marginTop: 12 }}
          >
            Copier le lien QR
          </button>

          {copyStatus && <p className="helper">{copyStatus}</p>}

          <div style={{ marginTop: 16 }}>
            <p>
              <strong>Code commerçant :</strong> {merchant.merchant_code}
            </p>
            <label className="label">
              Lien QR complet
              <input className="input" value={qrValue} readOnly />
            </label>
            <p className="helper">Les clients scannent ce QR à la caisse.</p>
          </div>
        </div>
      </div>

      {/* ---------------- TOTAUX CUMULÉS ---------------- */}
      <div style={{ marginTop: 24 }}>
        <div className="card">
          <h3>Totaux cumulés</h3>

          <p>
            <strong>Transactions totales :</strong>{" "}
            {stats?.total_transactions ?? 0}
          </p>

          <p>
            <strong>Volume total :</strong>{" "}
            {formatCurrency(stats?.total_volume ?? 0)}
          </p>

          <p>
            <strong>Cashback distribué :</strong>{" "}
            {formatCurrency(stats?.total_cashback ?? 0)}
          </p>

          <p>
            <strong>Dons totaux :</strong>{" "}
            {formatCurrency(stats?.total_donations ?? 0)}
          </p>

          <p>
            <strong>CA total PawPass :</strong>{" "}
            {formatCurrency(stats?.total_profit_pawpass ?? 0)}
          </p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}

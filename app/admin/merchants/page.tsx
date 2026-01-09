"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import TopNav from '@/components/TopNav';
export const dynamic = "force-dynamic";

interface MerchantRow {
  id: string;
  name: string | null;
  city: string | null;
  address: string | null;
  created_at: string;
  is_active: boolean | null;
  cashback_rate: number | null;
}

const formatCashbackPercent = (rate: number | null) => {
  const percent = Math.round((rate ?? 0) * 1000) / 10;
  return percent.toString();
};

export default function AdminMerchantsPage() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [cashbackPercent, setCashbackPercent] = useState('5');
  const [hasCheckedAccess, setHasCheckedAccess] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCashbackPercent, setEditCashbackPercent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMerchants = async () => {
    const { data, error: fetchError } = await supabase
      .from('merchants')
      .select('id,name,city,address,created_at,is_active,cashback_rate')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error(fetchError);
      setError(fetchError.message);
      return;
    }

    setMerchants(data ?? []);
  };

  useEffect(() => {
    const loadAdminData = async () => {
      setIsLoading(true);
      setError(null);
      setHasCheckedAccess(false);
      setIsAuthorized(false);

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setHasCheckedAccess(true);
        router.replace('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setHasCheckedAccess(true);
        setIsLoading(false);
        return;
      }

      if (profile?.role?.toLowerCase() !== 'admin') {
        setHasCheckedAccess(true);
        router.replace('/dashboard');
        return;
      }

      setHasCheckedAccess(true);
      setIsAuthorized(true);

      await fetchMerchants();
      setIsLoading(false);
    };

    void loadAdminData();
  }, [router, supabase]);

  const handleAddMerchant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedCity = city.trim();
    const trimmedAddress = address.trim();
    const percentValue = Number.parseFloat(cashbackPercent);

    if (!trimmedName || !trimmedCity || Number.isNaN(percentValue)) {
      setError('Veuillez renseigner un nom, une ville et un pourcentage valide.');
      return;
    }

    setIsSubmitting(true);
    const qrToken = crypto.randomUUID();
    const cashbackRate = percentValue / 100;
    const { error: insertError } = await supabase.from('merchants').insert({
      qr_token: qrToken,
      name: trimmedName,
      city: trimmedCity,
      address: trimmedAddress || null,
      cashback_rate: cashbackRate,
      is_active: true
    });

    if (insertError) {
      console.error(insertError);
      setError(insertError.message);
      setIsSubmitting(false);
      return;
    }

    setName('');
    setCity('');
    setAddress('');
    setCashbackPercent('5');
    await fetchMerchants();
    setIsSubmitting(false);
  };

  const handleStartEdit = (merchant: MerchantRow) => {
    setEditingId(merchant.id);
    setEditName(merchant.name ?? '');
    setEditCity(merchant.city ?? '');
    setEditAddress(merchant.address ?? '');
    setEditCashbackPercent(formatCashbackPercent(merchant.cashback_rate));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditCity('');
    setEditAddress('');
    setEditCashbackPercent('');
  };

  const handleSaveEdit = async (merchantId: string) => {
    setError(null);
    const trimmedName = editName.trim();
    const trimmedCity = editCity.trim();
    const trimmedAddress = editAddress.trim();
    const percentValue = Number.parseFloat(editCashbackPercent);

    if (!trimmedName || !trimmedCity || Number.isNaN(percentValue)) {
      setError('Veuillez renseigner un nom, une ville et un pourcentage valide.');
      return;
    }

    setIsSavingEdit(true);
    const cashbackRate = percentValue / 100;
    const { error: updateError } = await supabase
      .from('merchants')
      .update({
        name: trimmedName,
        city: trimmedCity,
        address: trimmedAddress || null,
        cashback_rate: cashbackRate
      })
      .eq('id', merchantId);

    if (updateError) {
      console.error(updateError);
      setError(updateError.message);
      setIsSavingEdit(false);
      return;
    }

    await fetchMerchants();
    setIsSavingEdit(false);
    handleCancelEdit();
  };

  const handleToggleActive = async (merchant: MerchantRow) => {
    setError(null);
    setTogglingId(merchant.id);
    const nextActive = !(merchant.is_active ?? true);
    const { error: toggleError } = await supabase
      .from('merchants')
      .update({ is_active: nextActive })
      .eq('id', merchant.id);

    if (toggleError) {
      console.error(toggleError);
      setError(toggleError.message);
      setTogglingId(null);
      return;
    }

    await fetchMerchants();
    setTogglingId(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const isMerchantsActive = pathname.startsWith('/admin/merchants');
  const isApplicationsActive = pathname.startsWith('/admin/merchant-applications');

  return (
    <div className="container">
      <TopNav title="Admin PawPass" />

      {!hasCheckedAccess ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <p className="helper">Chargement...</p>
        </div>
      ) : !isAuthorized ? (
        error ? (
          <div className="card" style={{ marginBottom: 24 }}>
            <p className="error">{error}</p>
          </div>
        ) : null
      ) : (
        <>
          <div className="card" style={{ marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className={isMerchantsActive ? 'button' : 'button secondary'} href="/admin/merchants">
              Tous les commerces
            </Link>
            <Link
              className={isApplicationsActive ? 'button' : 'button secondary'}
              href="/admin/merchant-applications"
            >
              Nouveaux commerçants
            </Link>
          </div>
          <div className="card" style={{ marginBottom: 24 }}>
            <h2>Gestion des commerçants</h2>
            <p className="helper">Ajoutez, modifiez ou désactivez les commerces partenaires.</p>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <h3>Ajouter un commerce partenaire</h3>
            <form onSubmit={handleAddMerchant}>
              <label className="label" htmlFor="merchantName">
                Nom
                <input
                  id="merchantName"
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
              <label className="label" htmlFor="merchantCity">
                Ville
                <input
                  id="merchantCity"
                  className="input"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  required
                />
              </label>
              <label className="label" htmlFor="merchantAddress">
                Adresse
                <input
                  id="merchantAddress"
                  className="input"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </label>
              <label className="label" htmlFor="merchantCashback">
                Pourcentage de cashback
                <input
                  id="merchantCashback"
                  className="input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={cashbackPercent}
                  onChange={(event) => setCashbackPercent(event.target.value)}
                  required
                />
              </label>
              {error && <p className="error">{error}</p>}
              <button
                className="button"
                type="submit"
                disabled={isSubmitting}
                style={{ marginTop: 12 }}
              >
                {isSubmitting ? 'Ajout en cours...' : 'Ajouter le commerce'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3>Liste des commerces</h3>
            {isLoading ? (
              <p className="helper">Chargement...</p>
            ) : merchants.length === 0 ? (
              <p className="helper">Aucun commerce trouvé.</p>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {merchants.map((merchant) => {
                  const isEditing = editingId === merchant.id;
                  return (
                    <div key={merchant.id} className="card" style={{ padding: 16 }}>
                      {isEditing ? (
                        <div style={{ display: 'grid', gap: 12 }}>
                          <label className="label" htmlFor={`edit-name-${merchant.id}`}>
                            Nom
                            <input
                              id={`edit-name-${merchant.id}`}
                              className="input"
                              value={editName}
                              onChange={(event) => setEditName(event.target.value)}
                              required
                            />
                          </label>
                          <label className="label" htmlFor={`edit-city-${merchant.id}`}>
                            Ville
                            <input
                              id={`edit-city-${merchant.id}`}
                              className="input"
                              value={editCity}
                              onChange={(event) => setEditCity(event.target.value)}
                              required
                            />
                          </label>
                          <label className="label" htmlFor={`edit-address-${merchant.id}`}>
                            Adresse
                            <input
                              id={`edit-address-${merchant.id}`}
                              className="input"
                              value={editAddress}
                              onChange={(event) => setEditAddress(event.target.value)}
                            />
                          </label>
                          <label className="label" htmlFor={`edit-cashback-${merchant.id}`}>
                            Pourcentage de cashback
                            <input
                              id={`edit-cashback-${merchant.id}`}
                              className="input"
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.1"
                              value={editCashbackPercent}
                              onChange={(event) => setEditCashbackPercent(event.target.value)}
                              required
                            />
                          </label>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button
                              className="button"
                              type="button"
                              onClick={() => void handleSaveEdit(merchant.id)}
                              disabled={isSavingEdit}
                            >
                              {isSavingEdit ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                            <button
                              className="button secondary"
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={isSavingEdit}
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h4 style={{ marginTop: 0 }}>{merchant.name ?? 'Commerce partenaire'}</h4>
                          <p className="helper" style={{ marginTop: 4 }}>
                            {merchant.city ?? 'Ville non renseignée'}
                          </p>
                          {merchant.address && (
                            <p className="helper" style={{ marginTop: 4, fontSize: '0.9rem' }}>
                              {merchant.address}
                            </p>
                          )}
                          <p style={{ marginTop: 8 }}>
                            {formatCashbackPercent(merchant.cashback_rate)}% de cashback
                          </p>
                          <p className="helper" style={{ marginTop: 4 }}>
                            {merchant.is_active ? 'Actif' : 'Inactif'}
                          </p>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                            <button
                              className="button secondary"
                              type="button"
                              onClick={() => handleStartEdit(merchant)}
                            >
                              Modifier
                            </button>
                            <button
                              className="button secondary"
                              type="button"
                              onClick={() => void handleToggleActive(merchant)}
                              disabled={togglingId === merchant.id}
                            >
                              {merchant.is_active ? 'Désactiver' : 'Réactiver'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

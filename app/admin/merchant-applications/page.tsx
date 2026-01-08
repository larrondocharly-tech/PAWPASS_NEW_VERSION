'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import TopNav from '@/components/TopNav';

interface MerchantApplication {
  id: string;
  user_id: string;
  business_name: string;
  city: string;
  address: string | null;
  phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

export default function MerchantApplicationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [apps, setApps] = useState<MerchantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      // Vérifier que l'utilisateur est connecté
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      // Vérifier que c'est bien un admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      if (!profile || profile.role?.toLowerCase() !== 'admin') {
        router.replace('/dashboard');
        return;
      }

      // Charger les demandes en attente
      const { data, error } = await supabase
        .from('merchant_applications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setApps(data ?? []);
      setLoading(false);
    };

    void load();
  }, [router, supabase]);

  const handleApprove = async (application: MerchantApplication) => {
    setActionLoadingId(application.id);
    setError(null);

    try {
      // Générer un QR token pour le commerce
      const qrToken = `PP_${application.user_id.slice(0, 8)}_${Math.random()
        .toString(36)
        .slice(2, 8)}`.toUpperCase();

      // 1) Créer le commerce
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .insert({
          name: application.business_name,
          city: application.city,
          address: application.address,
          qr_token: qrToken,
          is_active: true,
        })
        .select('id, qr_token')
        .single();

      if (merchantError) {
        throw merchantError;
      }

      const merchantId = merchantData.id;

      // 2) Mettre à jour le profil utilisateur
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'merchant',
          merchant_id: merchantId,
          merchant_code: merchantData.qr_token,
        })
        .eq('id', application.user_id);

      if (profileError) {
        throw profileError;
      }

      // 3) Mettre à jour la demande
      const { error: appError } = await supabase
        .from('merchant_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', application.id);

      if (appError) {
        throw appError;
      }

      // 4) Retirer la demande de la liste côté UI
      setApps((prev) => prev.filter((a) => a.id !== application.id));
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Erreur lors de l'approbation.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (application: MerchantApplication) => {
    setActionLoadingId(application.id);
    setError(null);

    try {
      const { error: appError } = await supabase
        .from('merchant_applications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', application.id);

      if (appError) {
        throw appError;
      }

      setApps((prev) => prev.filter((a) => a.id !== application.id));
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? 'Erreur lors du refus.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="container">
      <TopNav title="Demandes commerçants" />

      <div className="card" style={{ marginTop: 24 }}>
        <h2>Demandes de partenariats commerçants</h2>

        {loading && <p className="helper">Chargement des demandes…</p>}
        {error && <p className="error">{error}</p>}

        {!loading && apps.length === 0 && !error && (
          <p className="helper">Aucune demande en attente.</p>
        )}

        {!loading && apps.length > 0 && (
          <div className="list" style={{ marginTop: 16 }}>
            {apps.map((app) => (
              <div key={app.id} className="card" style={{ marginBottom: 12 }}>
                <p>
                  <strong>Commerce :</strong> {app.business_name} ({app.city})
                </p>
                {app.address && (
                  <p>
                    <strong>Adresse :</strong> {app.address}
                  </p>
                )}
                {app.phone && (
                  <p>
                    <strong>Téléphone :</strong> {app.phone}
                  </p>
                )}
                {app.message && (
                  <p>
                    <strong>Message :</strong> {app.message}
                  </p>
                )}
                <p className="helper">
                  Demande créée le {new Date(app.created_at).toLocaleString()}
                </p>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    className="button"
                    type="button"
                    disabled={actionLoadingId === app.id}
                    onClick={() => void handleApprove(app)}
                  >
                    {actionLoadingId === app.id ? 'Validation…' : 'Accepter'}
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    disabled={actionLoadingId === app.id}
                    onClick={() => void handleReject(app)}
                  >
                    {actionLoadingId === app.id ? 'Traitement…' : 'Refuser'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';
export const dynamic = "force-dynamic";

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
  created_at: string;
}

const buildMerchantToken = (userId: string) => {
  const prefix = userId.replace(/-/g, '').slice(0, 8);
  const random = Math.random().toString(36).slice(2, 8);
  return `PP_${prefix}_${random}`.toUpperCase();
};

export default function AdminMerchantApplicationsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadApplications = async () => {
      setIsLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        router.replace('/dashboard');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setIsLoading(false);
        return;
      }

      if (profile?.role?.toLowerCase() !== 'admin') {
        router.replace('/dashboard');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('merchant_applications')
        .select('id,user_id,business_name,city,address,phone,message,created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      setApplications(data ?? []);
      setIsLoading(false);
    };

    void loadApplications();
  }, [router, supabase]);

  const handleApprove = async (application: MerchantApplication) => {
    setError(null);
    setActionId(application.id);

    const qrToken = buildMerchantToken(application.user_id);
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .insert({
        name: application.business_name,
        city: application.city,
        address: application.address,
        qr_token: qrToken,
        is_active: true
      })
      .select('id')
      .single();

    if (merchantError || !merchant) {
      setError(merchantError?.message ?? 'Impossible de créer le commerçant.');
      setActionId(null);
      return;
    }

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        role: 'merchant',
        merchant_id: merchant.id,
        merchant_code: qrToken
      })
      .eq('id', application.user_id);

    if (profileUpdateError) {
      setError(profileUpdateError.message);
      setActionId(null);
      return;
    }

    const { error: applicationUpdateError } = await supabase
      .from('merchant_applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', application.id);

    if (applicationUpdateError) {
      setError(applicationUpdateError.message);
      setActionId(null);
      return;
    }

    setApplications((prev) => prev.filter((item) => item.id !== application.id));
    setActionId(null);
  };

  const handleReject = async (application: MerchantApplication) => {
    setError(null);
    setActionId(application.id);

    const { error: updateError } = await supabase
      .from('merchant_applications')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', application.id);

    if (updateError) {
      setError(updateError.message);
      setActionId(null);
      return;
    }

    setApplications((prev) => prev.filter((item) => item.id !== application.id));
    setActionId(null);
  };

  return (
    <div className="container">
      <TopNav title="Demandes commerçants" />

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>Demandes commerçants</h2>
        <p className="helper">Consultez et traitez les demandes en attente.</p>
      </div>

      {isLoading ? (
        <div className="card">
          <p className="helper">Chargement...</p>
        </div>
      ) : error ? (
        <div className="card">
          <p className="error">{error}</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="card">
          <p className="helper">Aucune demande en attente.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {applications.map((application) => (
            <div key={application.id} className="card" style={{ padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>{application.business_name}</h3>
              <p className="helper" style={{ marginTop: 4 }}>
                {application.city}
              </p>
              {application.address && (
                <p className="helper" style={{ marginTop: 4, fontSize: '0.9rem' }}>
                  {application.address}
                </p>
              )}
              {application.phone && (
                <p className="helper" style={{ marginTop: 4 }}>
                  Téléphone : {application.phone}
                </p>
              )}
              {application.message && <p style={{ marginTop: 8 }}>{application.message}</p>}
              <p className="helper" style={{ marginTop: 8 }}>
                Demande créée le {new Date(application.created_at).toLocaleString('fr-FR')}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                <button
                  className="button"
                  type="button"
                  onClick={() => void handleApprove(application)}
                  disabled={actionId === application.id}
                >
                  {actionId === application.id ? 'Validation...' : 'Accepter'}
                </button>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => void handleReject(application)}
                  disabled={actionId === application.id}
                >
                  {actionId === application.id ? 'Mise à jour...' : 'Refuser'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

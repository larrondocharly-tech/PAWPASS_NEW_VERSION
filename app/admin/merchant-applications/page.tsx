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

const buildMerchantToken = (userId: string) => {
  const prefix = userId.replace(/-/g, '').slice(0, 8);
  const random = Math.random().toString(36).slice(2, 8);
  return `PP_${prefix}_${random}`.toUpperCase();
};

export default function AdminMerchantApplicationsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [hasCheckedAccess, setHasCheckedAccess] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = async () => {
    const { data, error: fetchError } = await supabase
      .from('merchant_applications')
      .select('id,user_id,business_name,city,address,phone,message,status,created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error(fetchError);
      setError(fetchError.message);
      return;
    }

    setApplications(data ?? []);
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

      setAdminId(user.id);
      setHasCheckedAccess(true);
      setIsAuthorized(true);

      await fetchApplications();
      setIsLoading(false);
    };

    void loadAdminData();
  }, [router, supabase]);

  const handleApprove = async (applicationId: string) => {
    setError(null);
    setActionId(applicationId);

    const { data: application, error: applicationError } = await supabase
      .from('merchant_applications')
      .select('id,user_id,business_name,city,address')
      .eq('id', applicationId)
      .single();

    if (applicationError || !application) {
      setError(applicationError?.message ?? 'Demande introuvable.');
      setActionId(null);
      return;
    }

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
      .select('id,qr_token')
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
        merchant_code: merchant.qr_token
      })
      .eq('id', application.user_id);

    if (profileUpdateError) {
      setError(profileUpdateError.message);
      setActionId(null);
      return;
    }

    const { error: updateApplicationError } = await supabase
      .from('merchant_applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId
      })
      .eq('id', applicationId);

    if (updateApplicationError) {
      setError(updateApplicationError.message);
      setActionId(null);
      return;
    }

    await fetchApplications();
    setActionId(null);
  };

  const handleReject = async (applicationId: string) => {
    setError(null);
    setActionId(applicationId);

    const { error: updateError } = await supabase
      .from('merchant_applications')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId
      })
      .eq('id', applicationId);

    if (updateError) {
      setError(updateError.message);
      setActionId(null);
      return;
    }

    await fetchApplications();
    setActionId(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="container">
      <TopNav title="Admin PawPass" onSignOut={handleSignOut} />

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
          <div className="card" style={{ marginBottom: 24 }}>
            <h2>Demandes commerçants</h2>
            <p className="helper">Validez ou refusez les demandes en attente.</p>
          </div>

          <div className="card">
            <h3>Demandes en attente</h3>
            {isLoading ? (
              <p className="helper">Chargement...</p>
            ) : applications.length === 0 ? (
              <p className="helper">Aucune demande en attente.</p>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {applications.map((application) => (
                  <div key={application.id} className="card" style={{ padding: 16 }}>
                    <h4 style={{ marginTop: 0 }}>{application.business_name}</h4>
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
                    {application.message && (
                      <p style={{ marginTop: 8 }}>{application.message}</p>
                    )}
                    <p className="helper" style={{ marginTop: 8 }}>
                      Demande créée le {new Date(application.created_at).toLocaleString('fr-FR')}
                    </p>
                    {error && <p className="error">{error}</p>}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                      <button
                        className="button"
                        type="button"
                        onClick={() => void handleApprove(application.id)}
                        disabled={actionId === application.id}
                      >
                        {actionId === application.id ? 'Validation...' : 'Accepter'}
                      </button>
                      <button
                        className="button secondary"
                        type="button"
                        onClick={() => void handleReject(application.id)}
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
        </>
      )}
    </div>
  );
}

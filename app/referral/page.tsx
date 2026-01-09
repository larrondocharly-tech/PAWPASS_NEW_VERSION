"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import TopNav from '@/components/TopNav';
export const dynamic = "force-dynamic";





export default function ReferralPage() {
  const supabase = createClient();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      setUserId(user.id);
    };

    void loadUser();
  }, [router, supabase]);

  const referralCode = useMemo(() => {
    if (!userId) return 'PAWPASS-XXXXXX';
    return `PAWPASS-${userId.slice(0, 8).toUpperCase()}`;
  }, [userId]);

  const shareMessage = `Rejoins-moi sur PawPass et gagne des crédits en soutenant les animaux ! Utilise mon code : ${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setStatus('Code copié ✅');
    } catch {
      setStatus('Copie impossible, veuillez sélectionner le code.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareMessage });
        setStatus('Lien partagé ✅');
      } catch {
        setStatus('Partage annulé.');
      }
      return;
    }
    setStatus(shareMessage);
  };

  return (
    <main className="container">
      <TopNav title="Parrainer un ami" />

      <section className="card" style={{ marginBottom: 24 }}>
        <h1>Parrainer un ami</h1>
        <p className="helper">
          Invitez vos proches à utiliser PawPass. Lorsqu’ils créent un compte avec votre code, vous
          pourrez bénéficier d’avantages dans les futures versions de l’application.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2>Votre code de parrainage</h2>
        <div
          style={{
            marginTop: 12,
            background: 'rgba(95, 211, 179, 0.2)',
            padding: '12px 16px',
            borderRadius: 12,
            fontWeight: 700,
            textAlign: 'center'
          }}
        >
          {referralCode}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
          <button className="button" type="button" onClick={handleCopy}>
            Copier le code
          </button>
          <button className="button secondary" type="button" onClick={handleShare}>
            Partager
          </button>
        </div>
        {status && <p className="helper" style={{ marginTop: 12 }}>{status}</p>}
      </section>
    </main>
  );
}

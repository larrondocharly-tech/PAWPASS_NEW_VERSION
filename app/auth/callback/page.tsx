"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

function readHashTokens() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  const p = new URLSearchParams(hash);
  return {
    access_token: p.get("access_token"),
    refresh_token: p.get("refresh_token"),
    type: p.get("type"),
  };
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState("Connexion en cours…");

  useEffect(() => {
    (async () => {
      try {
        const next = sp.get("next") || "/reset-password";

        const { access_token, refresh_token } = readHashTokens();
        if (!access_token || !refresh_token) {
          setStatus("Lien invalide (tokens manquants).");
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          setStatus(`Erreur: ${error.message}`);
          return;
        }

        router.replace(next);
      } catch (e: any) {
        setStatus(e?.message || "Erreur inconnue");
      }
    })();
  }, [router, sp, supabase]);

  return (
    <div className="container" style={{ padding: 24 }}>
      <div className="card">
        <h2>Validation…</h2>
        <p className="helper">{status}</p>
      </div>
    </div>
  );
}

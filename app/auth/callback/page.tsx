"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState("Connexion en cours…");

  useEffect(() => {
    (async () => {
      try {
        const hash = window.location.hash || "";
        const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);

        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        const next = searchParams.get("next") || "/reset-password";

        if (!access_token || !refresh_token) {
          setStatus("Lien invalide (tokens manquants).");
          router.replace("/login");
          return;
        }

        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          setStatus("Erreur session: " + error.message);
          router.replace("/login");
          return;
        }

        setStatus("OK. Redirection…");
        router.replace(next);
      } catch (e: any) {
        setStatus("Erreur: " + (e?.message || "unknown"));
        router.replace("/login");
      }
    })();
  }, [router, searchParams, supabase]);

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1>Validation…</h1>
      <p>{status}</p>
    </div>
  );
}

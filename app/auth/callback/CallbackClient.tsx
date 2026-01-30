"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

function parseHashTokens() {
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const p = new URLSearchParams(raw);

  return {
    access_token: p.get("access_token"),
    refresh_token: p.get("refresh_token"),
    type: p.get("type"),
    error: p.get("error"),
    error_description: p.get("error_description"),
  };
}

export default function CallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [msg, setMsg] = useState("Finalisation…");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const next = searchParams.get("next") || "/reset-password";

        const { access_token, refresh_token, error, error_description } = parseHashTokens();

        // Si Supabase renvoie une erreur dans le hash
        if (error) {
          const d = error_description ? decodeURIComponent(error_description) : error;
          setMsg(d);
          router.replace("/login");
          return;
        }

        // IMPORTANT: si pas de tokens => Supabase a fallback vers la home
        if (!access_token || !refresh_token) {
          setMsg("Lien invalide (pas de token). Vérifie Redirect URLs Supabase + redirectTo.");
          router.replace("/login");
          return;
        }

        // 1) Créer la session à partir du hash
        const { error: setErr } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (setErr) {
          setMsg("Erreur session: " + setErr.message);
          router.replace("/login");
          return;
        }

        // 2) Rediriger
        if (cancelled) return;
        router.replace(next);
      } catch (e: any) {
        setMsg(e?.message || "Erreur inconnue");
        router.replace("/login");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams, supabase]);

  return <div style={{ padding: 24 }}>{msg}</div>;
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CallbackClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [msg, setMsg] = useState("Connexion en cours…");

  useEffect(() => {
    const run = async () => {
      try {
        // IMPORTANT: sur les liens d'invite, les tokens sont dans le hash (#...)
        // Supabase les lit tout seul côté navigateur.
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
          setMsg("Lien invalide ou expiré. Redirection vers connexion…");
          router.replace("/login");
          return;
        }

        // Optionnel: si tu passes ?next=/spa dans redirectTo
        const next = sp.get("next");
        if (next) {
          router.replace(next);
          return;
        }

        const role = data.session.user.user_metadata?.role;
        router.replace(role === "spa" ? "/spa" : "/dashboard");
      } catch {
        setMsg("Erreur callback. Redirection…");
        router.replace("/login");
      }
    };

    run();
  }, [router, sp]);

  return <div style={{ padding: 24 }}>{msg}</div>;
}

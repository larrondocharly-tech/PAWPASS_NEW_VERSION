"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallbackPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [msg, setMsg] = useState("Connexion en cours…");

  useEffect(() => {
    const run = async () => {
      try {
        // récupère la session à partir du hash (#access_token / refresh_token)
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
          setMsg("Lien invalide ou expiré. Redirection vers connexion…");
          router.replace("/login");
          return;
        }

        const next = sp.get("next");
        if (next) {
          router.replace(next);
          return;
        }

        const role = data.session.user.user_metadata?.role;
        router.replace(role === "spa" ? "/spa" : "/dashboard");
      } catch (e: any) {
        setMsg("Erreur callback. Redirection…");
        router.replace("/login");
      }
    };

    run();
  }, [router, sp]);

  return <div style={{ padding: 24 }}>{msg}</div>;
}

"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    const run = async () => {
      // IMPORTANT: force la lecture du token dans l’URL
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
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
    };

    run();
  }, [router, sp]);

  return <p style={{ padding: 24 }}>Connexion en cours…</p>;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      // Supabase lit automatiquement le token depuis l’URL (#access_token)
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        router.replace("/login");
        return;
      }

      const role = data.session.user.user_metadata?.role;

      if (role === "spa") {
        router.replace("/spa");
      } else if (role === "merchant") {
        router.replace("/merchant");
      } else {
        router.replace("/dashboard");
      }
    };

    run();
  }, [router]);

  return <p style={{ padding: 24 }}>Connexion en cours…</p>;
}

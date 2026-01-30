"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function CallbackClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleAuth = async () => {
      // Supabase lit automatiquement access_token & refresh_token depuis l'URL
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth callback error:", error);
        router.replace("/login");
        return;
      }

      if (data.session) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    };

    handleAuth();
  }, [router, supabase, searchParams]);

  return <div style={{ padding: 24 }}>Finalisation de la connexion…</div>;
}

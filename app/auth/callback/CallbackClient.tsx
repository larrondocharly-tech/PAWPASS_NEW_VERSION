"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function CallbackClient() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const go = async () => {
      // 1) La session doit exister après le callback
      const { data: sess, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !sess?.session?.user) {
        router.replace("/login");
        return;
      }

      const userId = sess.session.user.id;

      // 2) Lire le role (ta table profiles)
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      // Si erreur, fallback dashboard
      if (pErr) {
        router.replace("/dashboard");
        return;
      }

      const role = String(profile?.role ?? "").toLowerCase();

      if (role === "admin") {
        router.replace("/admin");
        return;
      }

      if (role === "spa") {
        router.replace("/spa");
        return;
      }

      router.replace("/dashboard");
    };

    go();
  }, [router, supabase]);

  return <div style={{ padding: 24 }}>Finalisation de la connexion…</div>;
}

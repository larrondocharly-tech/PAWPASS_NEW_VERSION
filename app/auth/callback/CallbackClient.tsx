"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CallbackClient() {
  const router = useRouter();

  useEffect(() => {
console.log("CALLBACK CLIENT RUNNING", window.location.href);
alert("CALLBACK CLIENT RUNNING");

    const run = async () => {
      // 1️⃣ Lire le hash (#access_token=...)
      const hash = window.location.hash;
      if (!hash) {
        router.replace("/");
        return;
      }

      const params = new URLSearchParams(hash.replace("#", ""));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        router.replace("/");
        return;
      }

      // 2️⃣ Créer la session Supabase
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        console.error("Supabase session error:", error);
        router.replace("/");
        return;
      }

      // 3️⃣ Récupérer le user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      // 4️⃣ Redirection selon le rôle
      const role = user.user_metadata?.role;

      if (role === "spa") {
        router.replace("/spa");
      } else if (role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    };

    run();
  }, [router]);

  return <div style={{ padding: 24 }}>Finalisation de la connexion…</div>;
}

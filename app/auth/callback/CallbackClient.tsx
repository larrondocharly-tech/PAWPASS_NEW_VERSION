"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function safeRoleRedirect(role?: string | null) {
  if (role === "spa") return "/spa";
  if (role === "admin") return "/admin";
  return "/dashboard";
}

export default function CallbackClient() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      try {
        const href = window.location.href;
        console.log("CALLBACK CLIENT RUNNING", href);

        // ✅ 1) CAS INVITE / RECOVERY: paramètres en query (?code=... ou ?token=...&type=invite ...)
        const search = new URLSearchParams(window.location.search);
        const type = (search.get("type") || "").toLowerCase();

        // Supabase peut envoyer:
        // - ?type=invite&token=...
        // - ?type=recovery&token=...
        // - ?code=... (selon config / flow)
        const hasInviteOrRecovery = type === "invite" || type === "recovery";
        const hasCode = !!search.get("code");
        const hasToken = !!search.get("token");

        if (hasInviteOrRecovery || hasCode || hasToken) {
          // 🔥 Le plus robuste: exchangeCodeForSession sur l'URL complète
          const { data, error } = await supabase.auth.exchangeCodeForSession(href);
          if (error) {
            console.error("exchangeCodeForSession error:", error);

            // Fallback: si jamais c'est un vieux flow token/type sans code
            // on tente au moins de récupérer une session existante
            const sess = await supabase.auth.getSession();
            if (!sess.data.session) {
              router.replace("/login?err=auth_callback");
              return;
            }
          }

          // Maintenant on a (normalement) une session
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            router.replace("/login?err=no_user");
            return;
          }

          const role = (user.user_metadata as any)?.role as string | undefined;
          router.replace(safeRoleRedirect(role));
          return;
        }

        // ✅ 2) CAS MAGIC LINK / OAUTH HASH: #access_token=...&refresh_token=...
        const hash = window.location.hash || "";
        if (hash.startsWith("#")) {
          const params = new URLSearchParams(hash.slice(1));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (error) {
              console.error("setSession error:", error);
              router.replace("/login?err=set_session");
              return;
            }

            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
              router.replace("/login?err=no_user");
              return;
            }

            const role = (user.user_metadata as any)?.role as string | undefined;
            router.replace(safeRoleRedirect(role));
            return;
          }
        }

        // ✅ 3) Sinon: si une session existe déjà, on redirige quand même
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const role = (user?.user_metadata as any)?.role as string | undefined;
          router.replace(safeRoleRedirect(role));
          return;
        }

        // ❌ Rien à faire → login
        router.replace("/login");
      } catch (e) {
        console.error("Callback fatal error:", e);
        router.replace("/login?err=fatal");
      }
    };

    run();
  }, [router]);

  return <div style={{ padding: 24 }}>Finalisation de la connexion…</div>;
}

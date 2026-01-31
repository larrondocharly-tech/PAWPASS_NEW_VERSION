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

function parseNextFromLocation(): string | null {
  try {
    const u = new URL(window.location.href);
    const next = (u.searchParams.get("next") || "").trim();
    if (!next) return null;
    return next.startsWith("/") ? next : `/${next}`;
  } catch {
    return null;
  }
}

function parseHashTokens(): { access_token: string; refresh_token: string } | null {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#")) return null;

  const params = new URLSearchParams(hash.slice(1));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

async function waitForSession(tries = 12, delayMs = 150) {
  for (let i = 0; i < tries; i++) {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data?.session) return data.session;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

export default function CallbackClient() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const go = (path: string) => {
      if (!cancelled) router.replace(path);
    };

    const run = async () => {
      try {
        const href = window.location.href;
        console.log("CALLBACK CLIENT RUNNING", href);

        const next = parseNextFromLocation();

        // 1) Cas HASH (#access_token=...&refresh_token=...)
        // => on crée la session immédiatement
        const tokens = parseHashTokens();
        if (tokens) {
          const { error: setErr } = await supabase.auth.setSession(tokens);
          if (setErr) {
            console.error("setSession error:", setErr);
            go("/login?err=set_session");
            return;
          }

          // Optionnel: nettoyer le hash pour éviter de garder les tokens dans l'URL
          try {
            const cleanUrl = window.location.pathname + window.location.search;
            window.history.replaceState({}, "", cleanUrl);
          } catch {}
        }

        // 2) Cas PKCE / verify (Supabase peut renvoyer ?code=... ou autres)
        // exchangeCodeForSession accepte l'URL complète, et n'explose pas si pas de code
        // (on ignore juste l'erreur si aucune donnée exploitable)
        const { error: exchErr } = await supabase.auth.exchangeCodeForSession(href);
        if (exchErr) {
          // Important: parfois il n'y a rien à échanger, donc on ne hard-fail pas ici
          console.warn("exchangeCodeForSession warning:", exchErr.message);
        }

        // 3) Attendre la session (évite les retours /login trop tôt)
        const session = await waitForSession();
        if (!session) {
          go("/login?err=no_session");
          return;
        }

        // ✅ PRIORITÉ ABSOLUE: next
        if (next) {
          go(next);
          return;
        }

        // 4) Sinon redirect par rôle
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr || !user) {
          go("/login?err=no_user");
          return;
        }

        const role = (user.user_metadata as any)?.role as string | undefined;
        go(safeRoleRedirect(role));
      } catch (e) {
        console.error("Callback fatal error:", e);
        go("/login?err=fatal");
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return <div style={{ padding: 24 }}>Finalisation de la connexion…</div>;
}

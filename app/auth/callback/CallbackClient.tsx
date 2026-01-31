"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // important
      flowType: "pkce", // ok même si pas utilisé
    },
  }
);

function safeRoleRedirect(role?: string | null) {
  if (role === "spa") return "/spa";
  if (role === "admin") return "/admin";
  return "/dashboard";
}

function getNext(): string | null {
  try {
    const u = new URL(window.location.href);
    const n = (u.searchParams.get("next") || "").trim();
    if (!n) return null;
    return n.startsWith("/") ? n : `/${n}`;
  } catch {
    return null;
  }
}

function parseHashTokens(): { access_token: string; refresh_token: string } | null {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#")) return null;

  const p = new URLSearchParams(hash.slice(1));
  const access_token = p.get("access_token");
  const refresh_token = p.get("refresh_token");
  if (!access_token || !refresh_token) return null;

  return { access_token, refresh_token };
}

async function waitForSession(tries = 15, delayMs = 200) {
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

        const next = getNext();

        // 1) INVITE/MAGIC: tokens dans le hash
        const tokens = parseHashTokens();
        if (tokens) {
          const { error } = await supabase.auth.setSession(tokens);
          if (error) {
            console.error("setSession error:", error);
            go("/login?err=set_session");
            return;
          }

          // Nettoie l’URL (évite de garder les tokens)
          try {
            const clean = window.location.pathname + window.location.search;
            window.history.replaceState({}, "", clean);
          } catch {}
        }

        // 2) PKCE: code dans la query
        const u = new URL(window.location.href);
        const code = u.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.warn("exchangeCodeForSession warning:", error.message);
            // on ne hard-fail pas : parfois la session est déjà mise via detectSessionInUrl
          }
        }

        // 3) Attendre la session
        const session = await waitForSession();
        if (!session) {
          go("/login?err=no_session");
          return;
        }

        // ✅ priorité absolue à next
        if (next) {
          go(next);
          return;
        }

        // 4) Sinon redirect par rôle
        const { data: uData, error: uErr } = await supabase.auth.getUser();
        if (uErr || !uData?.user) {
          go("/login?err=no_user");
          return;
        }

        const role = (uData.user.user_metadata as any)?.role as string | undefined;
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

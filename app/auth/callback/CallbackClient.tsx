"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

function safeRoleRedirect(role?: string | null) {
  if (role === "spa") return "/spa";
  if (role === "merchant") return "/merchant";
  if (role === "admin") return "/admin";
  return "/dashboard";
}

function getNextFromUrl(): string | null {
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

async function waitForSession(
  supabase: ReturnType<typeof createClient>,
  tries = 25,
  delayMs = 150
) {
  for (let i = 0; i < tries; i++) {
    const { data } = await supabase.auth.getSession();
    if (data?.session) return data.session;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

export default function CallbackClient() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    const go = (path: string) => {
      if (!cancelled) router.replace(path);
    };

    (async () => {
      try {
        const next = getNextFromUrl();

        // 1) HASH tokens (magic link / implicit)
        const tokens = parseHashTokens();
        if (tokens) {
          const { error } = await supabase.auth.setSession(tokens);
          if (error) {
            console.error("[callback] setSession error:", error.message);
            go("/login?err=set_session");
            return;
          }

          // clean url
          try {
            const clean = window.location.pathname + window.location.search;
            window.history.replaceState({}, "", clean);
          } catch {}
        }

        // 2) PKCE code
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.warn("[callback] exchangeCodeForSession:", error.message);
          }
        }

        // 3) wait session
        const session = await waitForSession(supabase);
        if (!session) {
          go("/login?err=no_session");
          return;
        }

        // 4) next priority
        if (next) {
          go(next);
          return;
        }

        // 5) role redirect
        const { data } = await supabase.auth.getUser();
        const role = (data.user?.user_metadata as any)?.role as string | undefined;
        go(safeRoleRedirect(role));
      } catch (e) {
        console.error("[callback] fatal:", e);
        go("/login?err=fatal");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  return <div style={{ padding: 24 }}>Finalisation de la connexion…</div>;
}

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
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  }
);

function safeRoleRedirect(role?: string | null) {
  if (role === "spa") return "/spa";
  if (role === "merchant") return "/merchant";
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

async function waitForSession(tries = 25, delayMs = 200) {
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
        console.log("[AUTH CALLBACK] start", window.location.href);

        const next = getNext();

        // ✅ 0) Méthode la plus robuste (invite / recovery / magic link / oauth)
        // Elle lit hash + query et stocke la session.
        let gotSession = false;
        try {
const authAny = supabase.auth as any;

const res = await authAny.getSessionFromUrl({
  storeSession: true,
});
          if (res.error) {
            console.warn("[AUTH CALLBACK] getSessionFromUrl warning:", res.error.message);
          }
          if (res.data?.session) gotSession = true;
        } catch (e) {
          // Certaines versions peuvent ne pas l’avoir / ou throw
          console.warn("[AUTH CALLBACK] getSessionFromUrl not available/failed:", e);
        }

        // ✅ 1) Fallback PKCE: ?code=...
        if (!gotSession) {
          const u = new URL(window.location.href);
          const code = u.searchParams.get("code");
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.warn("[AUTH CALLBACK] exchangeCodeForSession warning:", error.message);
            } else {
              gotSession = true;
            }
          }
        }

        // ✅ 2) Fallback vieux flow hash tokens
        if (!gotSession) {
          const tokens = parseHashTokens();
          if (tokens) {
            const { error } = await supabase.auth.setSession(tokens);
            if (error) {
              console.error("[AUTH CALLBACK] setSession error:", error);
              go("/login?err=set_session");
              return;
            }
            gotSession = true;

            // nettoie l'URL (enlève tokens)
            try {
              const clean = window.location.pathname + window.location.search;
              window.history.replaceState({}, "", clean);
            } catch {}
          }
        }

        // ✅ 3) Attendre la session (temps que le storage/cookies se fasse)
        const session = await waitForSession();
        if (!session) {
          console.error("[AUTH CALLBACK] no session after processing");
          go("/login?err=no_session");
          return;
        }

        // ✅ 4) next = priorité absolue (ex: /reset-password)
        if (next) {
          go(next);
          return;
        }

        // ✅ 5) redirect selon rôle
        const { data: uData, error: uErr } = await supabase.auth.getUser();
        if (uErr || !uData?.user) {
          go("/login?err=no_user");
          return;
        }

        const role =
          ((uData.user.user_metadata as any)?.role as string | undefined) ??
          ((uData.user.app_metadata as any)?.role as string | undefined);

        go(safeRoleRedirect(role));
      } catch (e) {
        console.error("[AUTH CALLBACK] fatal error:", e);
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

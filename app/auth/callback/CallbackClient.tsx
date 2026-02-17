"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type Role = "spa" | "merchant" | "admin" | "user";

function safeRoleRedirect(role?: string | null) {
  const r = (role || "").toLowerCase().trim();
  if (r === "spa") return "/spa";
  if (r === "merchant") return "/merchant";
  if (r === "admin") return "/admin";
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

async function fetchRoleFromProfiles(
  supabase: ReturnType<typeof createClient>
): Promise<Role | null> {
  const { data: uData, error: uErr } = await supabase.auth.getUser();
  if (uErr || !uData?.user) return null;

  const userId = uData.user.id;

  // ✅ Source de vérité: profiles.role
  const { data: p, error: pErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (pErr) return null;

  const role = (p?.role || "").toString().toLowerCase().trim() as Role;
  return role || null;
}

export default function CallbackClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

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
            go("/login?err=set_session");
            return;
          }
          // clean URL (retire les tokens)
          try {
            const clean = window.location.pathname + window.location.search;
            window.history.replaceState({}, "", clean);
          } catch {}
        }

        // 2) PKCE code
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }

        // 3) attendre une session
        const session = await waitForSession(supabase);
        if (!session) {
          go("/login?err=no_session");
          return;
        }

        // 4) priorité au next si fourni
        if (next) {
          go(next);
          return;
        }

        // 5) redirect par rôle (profiles.role)
        const role = await fetchRoleFromProfiles(supabase);
        if (role) {
          go(safeRoleRedirect(role));
          return;
        }

        // fallback (si profile absent)
        go("/dashboard");
      } catch {
        go("/login?err=fatal");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  return <div style={{ padding: 24 }}>Finalisation de la connexion…</div>;
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // important pour route handler + service role

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

function getBaseUrl(req: Request) {
  // 1) Priorité à NEXT_PUBLIC_SITE_URL (recommandé en prod)
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) return normalizeBaseUrl(envUrl);

  // 2) Si pas d'env, essaie les headers proxy (Vercel / reverse proxy)
  const xfProto = req.headers.get("x-forwarded-proto");
  const xfHost = req.headers.get("x-forwarded-host");
  if (xfProto && xfHost) return normalizeBaseUrl(`${xfProto}://${xfHost}`);

  // 3) Sinon host
  const host = req.headers.get("host");
  if (host) return normalizeBaseUrl(`https://${host}`);

  // 4) Fallback local
  return "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const ibanRaw = body?.iban ?? null;
    const iban = typeof ibanRaw === "string" && ibanRaw.trim() ? ibanRaw.trim() : null;

    if (!name || !email) {
      return NextResponse.json({ error: "name et email requis" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json(
        {
          error:
            "Env manquantes: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY",
        },
        { status: 500 }
      );
    }

    // Bearer token (admin logged-in côté client)
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
    }

    // Client "user" pour RLS + vérifier admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: adminRow, error: adminErr } = await userClient
      .from("app_admins")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (adminErr) return NextResponse.json({ error: adminErr.message }, { status: 400 });
    if (!adminRow) return NextResponse.json({ error: "Forbidden (not admin)" }, { status: 403 });

    // Service role (auth admin + DB write sans RLS)
    const admin = createClient(supabaseUrl, serviceKey);

    // (Optionnel mais conseillé) : éviter de recréer 50 fois la même SPA
    const { data: existingSpa, error: existErr } = await admin
      .from("spas")
      .select("id,email,auth_user_id")
      .eq("email", email)
      .maybeSingle();

    if (existErr) {
      return NextResponse.json({ error: existErr.message }, { status: 400 });
    }
    if (existingSpa?.id) {
      return NextResponse.json(
        { error: "Cette SPA existe déjà (email déjà utilisé). Supprime-la ou change l’email." },
        { status: 409 }
      );
    }

    // Redirect URL pour choix MDP
    const baseUrl = getBaseUrl(req);
    const redirectTo = `${baseUrl}/reset-password`;

    // 1) Invite user (envoie email "set password")
    // NOTE: selon versions, certains utilisent "redirectTo", d’autres "emailRedirectTo"
    const { data: invited, error: iErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      // fallback compat
      // @ts-expect-error - compat supabase versions
      emailRedirectTo: redirectTo,
      data: { role: "spa", name },
    });

    if (iErr || !invited?.user) {
      return NextResponse.json(
        { error: iErr?.message || "inviteUserByEmail failed", redirectTo },
        { status: 400 }
      );
    }

    const spaUserId = invited.user.id;

    // 2) Insert (ou upsert) dans spas
    const { data: spaRow, error: sErr } = await admin
      .from("spas")
      .insert({
        auth_user_id: spaUserId,
        name,
        email,
        iban,
      })
      .select("id, name, email, auth_user_id, iban")
      .single();

    if (sErr) {
      // rollback auth user pour éviter un user orphelin
      try {
        await admin.auth.admin.deleteUser(spaUserId);
      } catch {
        // ignore
      }
      return NextResponse.json({ error: sErr.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      invited: true,
      redirectTo,
      spa: spaRow,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

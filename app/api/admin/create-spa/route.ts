import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getBaseUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, "");

  // fallback (dev)
  const origin = req.headers.get("origin") || "http://localhost:3000";
  return origin.replace(/\/+$/, "");
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

    // Auth token from client
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
    }

    // User client (RLS) to check current user + admin status
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check admin via app_admins
    const { data: adminRow, error: adminErr } = await userClient
      .from("app_admins")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (adminErr) return NextResponse.json({ error: adminErr.message }, { status: 400 });
    if (!adminRow) return NextResponse.json({ error: "Forbidden (not admin)" }, { status: 403 });

    // Service role for auth admin + DB inserts
    const admin = createClient(supabaseUrl, serviceKey);

    // ✅ IMPORTANT: forcer l'URL prod si dispo
    const baseUrl = getBaseUrl(req);

    // ✅ INVITE: rediriger vers /auth/callback (et seulement ensuite tu gères le next)
    const redirectTo = `${baseUrl}/auth/callback?next=/reset-password`;

    // 1) Invite user => envoie email "set password"
    const { data: invited, error: iErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { role: "spa", name },
    });

    if (iErr || !invited?.user) {
      return NextResponse.json(
        { error: iErr?.message || "inviteUserByEmail failed" },
        { status: 400 }
      );
    }

    const spaUserId = invited.user.id;

    // ✅ IMPORTANT : créer le profile SPA (sinon callback ne sait pas router)
    const { error: pErr } = await admin.from("profiles").upsert({
      id: spaUserId,
      role: "spa",
    });

    if (pErr) {
      await admin.auth.admin.deleteUser(spaUserId);
      return NextResponse.json({ error: pErr.message }, { status: 400 });
    }

    // 2) Insert into spas table
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
      // rollback auth user + profile
      await admin.from("profiles").delete().eq("id", spaUserId);
      await admin.auth.admin.deleteUser(spaUserId);
      return NextResponse.json({ error: sErr.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      spa: spaRow,
      invited: true,
      redirectTo,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

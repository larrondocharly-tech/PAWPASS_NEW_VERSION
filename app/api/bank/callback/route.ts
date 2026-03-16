import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getBankProvider } from "@/lib/bank/provider";

function cleanAccounts(accounts: unknown): string[] {
  if (!Array.isArray(accounts)) return [];

  return accounts
    .map((a) => String(a ?? "").trim())
    .filter((a) => !!a && a !== "undefined" && a !== "null");
}

export async function GET(req: Request) {
  try {
    const supabase = createServerSupabase();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const url = new URL(req.url);
    const providerName = (process.env.BANK_PROVIDER || "mock").toLowerCase();

    const admin = createAdminClient();
    const provider = await getBankProvider();

    // =========================
    // BRIDGE FLOW
    // =========================
    if (providerName === "bridge") {
      const source = url.searchParams.get("source");
      const success = url.searchParams.get("success");
      const user_uuid = url.searchParams.get("user_uuid");

      if (source !== "connect") {
        return NextResponse.json(
          { error: "BRIDGE_SOURCE_INVALID" },
          { status: 400 }
        );
      }

      if (success !== "true") {
        return NextResponse.json(
          { error: "BRIDGE_CONNECT_NOT_COMPLETED" },
          { status: 400 }
        );
      }

      if (!user_uuid) {
        return NextResponse.json(
          { error: "BRIDGE_USER_UUID_MISSING" },
          { status: 400 }
        );
      }

      // On prend la dernière connexion bridge créée pour cet utilisateur
      const { data: connRow, error: connErr } = await admin
        .from("bank_connections")
        .select("id,requisition_id,status")
        .eq("user_id", auth.user.id)
        .eq("provider", "bridge")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (connErr) throw connErr;
      if (!connRow?.id) {
        throw new Error("bank_connections not found");
      }

      // IMPORTANT :
      // pour Bridge, on récupère les comptes à partir du user_id
      const complete = await provider.completeConnection({
        requisition_id: user_uuid,
        user_id: auth.user.id,
        user_email: auth.user.email ?? undefined,
      });

      const accounts = cleanAccounts(complete?.accounts);

      if (accounts.length === 0) {
        return NextResponse.json(
          { error: "BRIDGE_NO_VALID_ACCOUNTS_RETURNED" },
          { status: 400 }
        );
      }

      // Active la connexion
      const { error: updateErr } = await admin
        .from("bank_connections")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", connRow.id);

      if (updateErr) throw updateErr;

      // Nettoie les anciens comptes liés à cette connexion
      const { error: deleteOldErr } = await admin
        .from("bank_accounts")
        .delete()
        .eq("connection_id", connRow.id);

      if (deleteOldErr) throw deleteOldErr;

      // Réinsère proprement les comptes valides
      for (const provider_account_id of accounts) {
        const { error: upsertErr } = await admin.from("bank_accounts").upsert(
          {
            user_id: auth.user.id,
            connection_id: connRow.id,
            provider_account_id,
            status: "active",
          },
          { onConflict: "provider_account_id" }
        );

        if (upsertErr) {
          throw upsertErr;
        }
      }

      return NextResponse.json({
        ok: true,
        provider: "bridge",
        accounts_count: accounts.length,
        accounts,
      });
    }

    // =========================
    // FALLBACK MOCK / AUTRES FLOWS
    // =========================
    const requisition_id = url.searchParams.get("requisition_id");

    if (!requisition_id) {
      return NextResponse.json(
        { error: "Missing requisition_id" },
        { status: 400 }
      );
    }

    const complete = await provider.completeConnection({
      requisition_id,
      user_id: auth.user.id,
      user_email: auth.user.email ?? undefined,
    });

    const accounts = cleanAccounts(complete?.accounts);

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: "NO_VALID_ACCOUNTS_RETURNED" },
        { status: 400 }
      );
    }

    const { data: connRow, error: connErr } = await admin
      .from("bank_connections")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("requisition_id", requisition_id)
      .maybeSingle();

    if (connErr) throw connErr;
    if (!connRow?.id) {
      throw new Error("bank_connections not found");
    }

    const { error: updateErr } = await admin
      .from("bank_connections")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connRow.id);

    if (updateErr) throw updateErr;

    const { error: deleteOldErr } = await admin
      .from("bank_accounts")
      .delete()
      .eq("connection_id", connRow.id);

    if (deleteOldErr) throw deleteOldErr;

    for (const provider_account_id of accounts) {
      const { error: upsertErr } = await admin.from("bank_accounts").upsert(
        {
          user_id: auth.user.id,
          connection_id: connRow.id,
          provider_account_id,
          status: "active",
        },
        { onConflict: "provider_account_id" }
      );

      if (upsertErr) {
        throw upsertErr;
      }
    }

    return NextResponse.json({
      ok: true,
      provider: providerName,
      accounts_count: accounts.length,
      accounts,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "BANK_CALLBACK_ERROR" },
      { status: 500 }
    );
  }
}
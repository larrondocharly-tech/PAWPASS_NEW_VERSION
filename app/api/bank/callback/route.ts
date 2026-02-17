import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getBankProvider } from "@/lib/bank/provider";

export async function GET(req: Request) {
  try {
    const supabase = createServerSupabase();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

    const url = new URL(req.url);
    const requisition_id = url.searchParams.get("requisition_id");
    if (!requisition_id) return NextResponse.json({ error: "Missing requisition_id" }, { status: 400 });

    const provider = await getBankProvider();
    const { accounts } = await provider.completeConnection({ requisition_id });

    const admin = createAdminClient();

    // récupère connection_id
    const { data: connRow, error: connErr } = await admin
      .from("bank_connections")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("requisition_id", requisition_id)
      .maybeSingle();
    if (connErr || !connRow?.id) throw new Error("bank_connections not found");

    await admin
      .from("bank_connections")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", connRow.id);

    for (const provider_account_id of accounts) {
      await admin.from("bank_accounts").upsert(
        {
          user_id: auth.user.id,
          connection_id: connRow.id,
          provider_account_id,
          status: "active",
        },
        { onConflict: "provider_account_id" }
      );
    }

    return NextResponse.json({ ok: true, accounts_count: accounts.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "BANK_CALLBACK_ERROR" }, { status: 500 });
  }
}

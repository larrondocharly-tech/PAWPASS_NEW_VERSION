import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getBankProvider } from "@/lib/bank/provider";

export async function POST() {
  try {
    const supabase = createServerSupabase();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const redirect = `${siteUrl}/settings/bank/callback`;

    const provider = await getBankProvider();
    const { requisition_id, link } = await provider.createConnectionLink({
      user_id: auth.user.id,
      redirect,
    });

    const admin = createAdminClient();
    await admin.from("bank_connections").insert({
      user_id: auth.user.id,
      provider: process.env.BANK_PROVIDER || "mock",
      requisition_id,
      status: "created",
    });

    return NextResponse.json({ requisition_id, link });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "BANK_CONNECT_ERROR" }, { status: 500 });
  }
}

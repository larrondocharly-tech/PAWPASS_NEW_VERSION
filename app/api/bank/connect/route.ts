import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getBankProvider } from "@/lib/bank/provider";

export async function POST() {
  try {
    const supabase = createServerSupabase();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    if (!auth.user.email) {
      return NextResponse.json({ error: "USER_EMAIL_MISSING" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const redirect = `${siteUrl}/settings/bank/callback`;

    const provider = await getBankProvider();
    const { requisition_id, link } = await provider.createConnectionLink({
      user_id: auth.user.id,
      user_email: auth.user.email,
      redirect,
    });

    const admin = createAdminClient();
    const providerName = process.env.BANK_PROVIDER || "mock";

    await admin
      .from("bank_connections")
      .update({
        status: "revoked",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", auth.user.id)
      .eq("provider", providerName)
      .in("status", ["created", "active"]);

    const { error: insertError } = await admin.from("bank_connections").insert({
      user_id: auth.user.id,
      provider: providerName,
      requisition_id,
      status: "created",
    });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ requisition_id, link });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "BANK_CONNECT_ERROR" },
      { status: 500 }
    );
  }
}
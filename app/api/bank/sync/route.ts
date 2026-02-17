import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getBankProvider } from "@/lib/bank/provider";

type BankConnectionRow = {
  id: string;
  user_id: string;
  provider: string | null;
  requisition_id: string | null;
  status: string;
};

type BankAccountRow = {
  id: string;
  provider_account_id: string;
  user_id: string;
};

type MerchantRow = {
  id: string;
  name: string | null;
  city: string | null;
  is_active: boolean | null;
};

type MerchantKeywordsRow = {
  merchant_id: string;
  keywords: string[] | null;
  city_tokens: string[] | null;
};

type ProviderTx = {
  provider_tx_id: string;
  booked_at: string; // ISO
  amount: number;
  currency?: string | null;
  raw_descriptor?: string | null;
};

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function computeDedupKey(userId: string, merchantId: string, amount: number, happenedAtIso: string) {
  const happenedAt = new Date(happenedAtIso);
  // bucket de 10 minutes
  const bucket = Math.floor(happenedAt.getTime() / 1000 / 600);
  const payload = `${userId}:${merchantId}:${Number(amount).toFixed(2)}:${bucket}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function findBestMerchantMatch(opts: {
  descriptor: string;
  merchants: MerchantRow[];
  kwMap: Map<string, { keywords: string[]; city_tokens: string[] }>;
}) {
  const desc = norm(opts.descriptor);
  if (!desc) return null;

  let best: { merchantId: string; score: number } | null = null;

  for (const m of opts.merchants) {
    if (!m?.id) continue;
    if (m.is_active === false) continue;

    const row = opts.kwMap.get(m.id);
    const keys = (row?.keywords || []).map(norm).filter(Boolean);
    const cities = (row?.city_tokens || []).map(norm).filter(Boolean);

    let score = 0;
    for (const k of keys) if (k && desc.includes(k)) score += 2;
    for (const c of cities) if (c && desc.includes(c)) score += 1;

    if (score <= 0) continue;

    if (!best || score > best.score) best = { merchantId: m.id, score };
  }

  return best;
}

export async function POST(req: Request) {
  try {
    // ✅ protection par secret (cron / appel manuel)
    const secret = req.headers.get("x-bank-sync-secret");
    const envSecret = process.env.BANK_SYNC_SECRET;

    if (!secret || !envSecret || secret !== envSecret) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const admin = createAdminClient();
    const provider = await getBankProvider();

    // 1) connexions actives
    const { data: conns, error: cErr } = await admin
      .from("bank_connections")
      .select("id,user_id,provider,requisition_id,status")
      .eq("status", "active");

    if (cErr) throw cErr;

    const connections = (conns || []) as BankConnectionRow[];
    if (connections.length === 0) {
      return NextResponse.json({ ok: true, insertedBankTx: 0, linkedTx: 0, note: "no active connections" });
    }

    // 2) merchants + keywords
    const { data: merchantsRaw, error: mErr } = await admin.from("merchants").select("id,name,city,is_active");
    if (mErr) throw mErr;

    const { data: kwRaw, error: kErr } = await admin
      .from("merchant_bank_keywords")
      .select("merchant_id,keywords,city_tokens");
    if (kErr) throw kErr;

    const merchants = (merchantsRaw || []) as MerchantRow[];
    const kw = (kwRaw || []) as MerchantKeywordsRow[];

    const kwMap = new Map<string, { keywords: string[]; city_tokens: string[] }>();
    for (const r of kw) {
      kwMap.set(r.merchant_id, {
        keywords: r.keywords || [],
        city_tokens: r.city_tokens || [],
      });
    }

    let insertedBankTx = 0;
    let linkedTx = 0;

    // 3) boucle connexions -> comptes -> transactions
    for (const conn of connections) {
      const userId = conn.user_id;

      // comptes de l’utilisateur
      const { data: accountsRaw, error: aErr } = await admin
        .from("bank_accounts")
        .select("id,provider_account_id,user_id")
        .eq("user_id", userId);

      if (aErr) throw aErr;

      const accounts = (accountsRaw || []) as BankAccountRow[];
      if (accounts.length === 0) continue;

      for (const acc of accounts) {
        const booked = (await provider.fetchBookedTransactions({
          account_id: acc.provider_account_id,
        })) as ProviderTx[];

        for (const t of booked || []) {
          if (!t?.provider_tx_id) continue;

          const providerTxId = t.provider_tx_id;
          const bookedAt = t.booked_at;
          const amount = Number(t.amount);
          if (!Number.isFinite(amount)) continue;

          // upsert bank tx (dédup par provider_tx_id)
          const up = await admin.from("bank_transactions").upsert(
            {
              user_id: userId,
              account_id: acc.id,
              provider_tx_id: providerTxId,
              booked_at: bookedAt,
              amount,
              currency: t.currency || "EUR",
              raw_descriptor: t.raw_descriptor || "unknown",
            },
            { onConflict: "provider_tx_id" }
          );

          if (up.error) throw up.error;
          insertedBankTx++;

          // tentative de matching merchant
          const match = findBestMerchantMatch({
            descriptor: t.raw_descriptor || "",
            merchants,
            kwMap,
          });

          if (!match) continue;

          const dedup_key = computeDedupKey(userId, match.merchantId, amount, bookedAt);

          // récupère l'id de bank_transactions
          const { data: btRow, error: btErr } = await admin
            .from("bank_transactions")
            .select("id")
            .eq("provider_tx_id", providerTxId)
            .maybeSingle();

          if (btErr) throw btErr;

          const bank_transaction_id: string | null = (btRow as any)?.id ?? null;

          // check exist transaction (dedup_key)
          const { data: existing, error: exErr } = await admin
            .from("transactions")
            .select("id,bank_transaction_id")
            .eq("user_id", userId)
            .eq("dedup_key", dedup_key)
            .maybeSingle();

          if (exErr) throw exErr;

          const existingId: string | null = (existing as any)?.id ?? null;
          const existingBankTxId: string | null = (existing as any)?.bank_transaction_id ?? null;

          if (existingId) {
            // relie si manquant
            if (!existingBankTxId && bank_transaction_id) {
              const { error: updErr } = await admin
                .from("transactions")
                .update({
                  bank_transaction_id,
                  confirmed_at: new Date().toISOString(),
                  match_confidence: match.score,
                })
                .eq("id", existingId);

              if (updErr) throw updErr;
              linkedTx++;
            }
          } else {
            // crée la transaction
            const { error: insErr } = await admin.from("transactions").insert({
              user_id: userId,
              merchant_id: match.merchantId,
              amount,
              source: "bank",
              dedup_key,
              bank_transaction_id,
              confirmed_at: new Date().toISOString(),
              match_confidence: match.score,
              status: "pending",
            });

            if (insErr) throw insErr;
            linkedTx++;
          }
        }
      }
    }

    return NextResponse.json({ ok: true, insertedBankTx, linkedTx });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "BANK_SYNC_ERROR" }, { status: 500 });
  }
}

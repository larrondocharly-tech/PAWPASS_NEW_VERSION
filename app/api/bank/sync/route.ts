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
  cashback_rate: number | null;
  bank_descriptor_hint?: string | null;
  bank_aliases?: string[] | null;
};

type ProviderTx = {
  provider_tx_id: string;
  booked_at: string;
  amount: number;
  currency?: string | null;
  raw_descriptor?: string | null;
};

type WalletRow = {
  user_id: string;
  balance: number | null;
  reserved_balance: number | null;
  pending_balance: number | null;
  pending_donated: number | null;
};

type ProfileRow = {
  id: string;
  spa_id?: string | null;
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

function toNum(v: unknown) {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function computeDedupKey(
  userId: string,
  merchantId: string,
  amount: number,
  happenedAtIso: string
) {
  const happenedAt = new Date(happenedAtIso);
  const bucket = Math.floor(happenedAt.getTime() / 1000 / 600);
  const payload = `${userId}:${merchantId}:${Number(amount).toFixed(2)}:${bucket}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function getMerchantTokens(m: MerchantRow) {
  const tokens: string[] = [];

  if (m.name) tokens.push(m.name);
  if (m.city) tokens.push(m.city);
  if (m.bank_descriptor_hint) tokens.push(m.bank_descriptor_hint);
  if (Array.isArray(m.bank_aliases)) tokens.push(...m.bank_aliases);

  return tokens.map(norm).filter(Boolean);
}

function findBestMerchantMatch(opts: {
  descriptor: string;
  merchants: MerchantRow[];
}) {
  const desc = norm(opts.descriptor);
  if (!desc) return null;

  let best: { merchantId: string; score: number } | null = null;

  for (const m of opts.merchants) {
    if (!m?.id) continue;
    if (m.is_active === false) continue;

    const tokens = getMerchantTokens(m);

    let score = 0;
    for (const token of tokens) {
      if (!token) continue;
      if (desc.includes(token)) {
        score += token.length >= 10 ? 3 : 2;
      }
    }

    if (m.city && desc.includes(norm(m.city))) {
      score += 1;
    }

    if (score <= 0) continue;

    if (!best || score > best.score) {
      best = { merchantId: m.id, score };
    }
  }

  return best;
}

async function ensureWallet(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const { data: walletRow, error: walletErr } = await admin
    .from("wallets")
    .select("user_id,balance,reserved_balance,pending_balance,pending_donated")
    .eq("user_id", userId)
    .maybeSingle();

  if (walletErr) throw walletErr;

  if (walletRow) {
    return walletRow as WalletRow;
  }

  const { data: created, error: createErr } = await admin
    .from("wallets")
    .insert({
      user_id: userId,
      balance: 0,
      reserved_balance: 0,
      pending_balance: 0,
      pending_donated: 0,
    })
    .select("user_id,balance,reserved_balance,pending_balance,pending_donated")
    .single();

  if (createErr) throw createErr;
  return created as WalletRow;
}

export async function POST(req: Request) {
  try {
    const secret = req.headers.get("x-bank-sync-secret");
    const envSecret = process.env.BANK_SYNC_SECRET;

    if (!secret || !envSecret || secret !== envSecret) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const admin = createAdminClient();
    const provider = await getBankProvider();
    const providerMode = (process.env.BANK_PROVIDER || "mock").toLowerCase();

    const { data: conns, error: cErr } = await admin
      .from("bank_connections")
      .select("id,user_id,provider,requisition_id,status")
      .eq("status", "active")
      .eq("provider", providerMode);

    if (cErr) throw cErr;

    const connections = (conns || []) as BankConnectionRow[];

    if (connections.length === 0) {
      return NextResponse.json({
        ok: true,
        insertedBankTx: 0,
        linkedTx: 0,
        creditedPending: 0,
        note: "no active connections for current provider",
      });
    }

    const { data: merchantsRaw, error: mErr } = await admin
      .from("merchants")
      .select("id,name,city,is_active,cashback_rate,bank_descriptor_hint,bank_aliases")
      .eq("is_active", true);

    if (mErr) throw mErr;

    const merchants = (merchantsRaw || []) as MerchantRow[];

    let insertedBankTx = 0;
    let linkedTx = 0;
    let creditedPending = 0;

    for (const conn of connections) {
      const userId = conn.user_id;

      const { data: profileRaw, error: profileErr } = await admin
        .from("profiles")
        .select("id,spa_id")
        .eq("id", userId)
        .maybeSingle();

      if (profileErr) throw profileErr;

      const profile = (profileRaw || {
        id: userId,
        spa_id: null,
      }) as ProfileRow;

      // MVP simple : 50% pour le client / 50% pour la SPA par défaut
      const donationPercent = 50;

      const { data: accountsRaw, error: aErr } = await admin
        .from("bank_accounts")
        .select("id,provider_account_id,user_id")
        .eq("user_id", userId);

      if (aErr) throw aErr;

      const accounts = ((accountsRaw || []) as BankAccountRow[]).filter(
        (a) => !!a.provider_account_id && a.provider_account_id !== "undefined"
      );

      if (accounts.length === 0) continue;

      for (const acc of accounts) {
        const booked = (await provider.fetchBookedTransactions({
          account_id: acc.provider_account_id,
          user_id: userId,
        })) as ProviderTx[];

        for (const t of booked || []) {
          if (!t?.provider_tx_id) continue;

          const providerTxId = t.provider_tx_id;
          const bookedAt = t.booked_at;
          const amount = Number(t.amount);

          if (!Number.isFinite(amount) || amount <= 0) continue;

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

          const match = findBestMerchantMatch({
            descriptor: t.raw_descriptor || "",
            merchants,
          });

          if (!match) continue;

          const matchedMerchant = merchants.find((m) => m.id === match.merchantId);
          if (!matchedMerchant) continue;

          const cashbackRate = toNum(matchedMerchant.cashback_rate);
          if (cashbackRate <= 0) continue;

          const cashbackTotal = round2(amount * cashbackRate);
          if (cashbackTotal <= 0) continue;

          const donationAmount = round2(cashbackTotal * 0.5);

          const cashbackToUser = round2(cashbackTotal - donationAmount);

          const dedup_key = computeDedupKey(
            userId,
            match.merchantId,
            amount,
            bookedAt
          );

          const { data: btRow, error: btErr } = await admin
            .from("bank_transactions")
            .select("id")
            .eq("provider_tx_id", providerTxId)
            .maybeSingle();

          if (btErr) throw btErr;

          const bank_transaction_id: string | null = (btRow as any)?.id ?? null;

          const { data: existing, error: exErr } = await admin
            .from("transactions")
            .select("id,bank_transaction_id,status")
            .eq("user_id", userId)
            .eq("dedup_key", dedup_key)
            .maybeSingle();

          if (exErr) throw exErr;

          const existingId: string | null = (existing as any)?.id ?? null;
          const existingBankTxId: string | null =
            (existing as any)?.bank_transaction_id ?? null;

          if (existingId) {
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

            continue;
          }

          const { error: insErr } = await admin.from("transactions").insert({
            user_id: userId,
            merchant_id: match.merchantId,
            amount,
            cashback_rate: cashbackRate,
            cashback_total: cashbackTotal,
            donation_amount: donationAmount,
            cashback_to_user: cashbackToUser,
            spa_id: profile.spa_id ?? null,
            source: "bank",
            dedup_key,
            bank_transaction_id,
            confirmed_at: new Date().toISOString(),
            match_confidence: match.score,
            status: "pending",
          });

          if (insErr) throw insErr;
          linkedTx++;

          const wallet = await ensureWallet(admin, userId);

          const nextPendingBalance = round2(
            toNum(wallet.pending_balance) + cashbackToUser
          );
          const nextPendingDonated = round2(
            toNum(wallet.pending_donated) + donationAmount
          );

          const { error: walletUpdateErr } = await admin
            .from("wallets")
            .update({
              pending_balance: nextPendingBalance,
              pending_donated: nextPendingDonated,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          if (walletUpdateErr) throw walletUpdateErr;

          creditedPending += cashbackToUser;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      providerMode,
      insertedBankTx,
      linkedTx,
      creditedPending,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "BANK_SYNC_ERROR" },
      { status: 500 }
    );
  }
}
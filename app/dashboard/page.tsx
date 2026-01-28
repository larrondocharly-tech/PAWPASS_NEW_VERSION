"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import DonationFeedTicker from "@/components/DonationFeedTicker";

export const dynamic = "force-dynamic";

interface StatTransaction {
  cashback_to_user: number | string | null;
  donation_amount: number | string | null;
  status: string | null;
  wallet_spent: number | string | null;
}

interface RecentTransaction {
  id: string;
  created_at: string;
  merchant_name: string | null;
  purchase_amount: number;
  cashback_to_user: number;
  donation_amount: number;
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [availableBalance, setAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [totalCashback, setTotalCashback] = useState(0);
  const [totalDonation, setTotalDonation] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const [recentTx, setRecentTx] = useState<RecentTransaction[]>([]);
  const [historyErrorMsg, setHistoryErrorMsg] = useState<string | null>(null);

  const ui = {
    maxW: 1120,
    radius: 18,
    radiusSm: 14,
    shadow: "0 18px 50px rgba(15, 23, 42, 0.12)",
    shadowSoft: "0 10px 28px rgba(15, 23, 42, 0.10)",
    border: "1px solid rgba(15, 23, 42, 0.07)",
    text: "#0F172A",
    subtext: "rgba(15, 23, 42, 0.65)",
    subtext2: "rgba(15, 23, 42, 0.55)",
    brand: "#FF7A3C",
    blue: "#2563EB",
    green: "#16A34A",
    greenBg: "rgba(22, 163, 74, 0.10)",
    blueBg: "rgba(37, 99, 235, 0.10)",
    amberBg: "rgba(255, 122, 60, 0.10)",
    surface: "rgba(255,255,255,0.86)",
    surfaceStrong: "rgba(255,255,255,0.94)",
    blur: "blur(10px)",
  };

  const cardBase: CSSProperties = {
    borderRadius: ui.radius,
    background: ui.surface,
    border: ui.border,
    boxShadow: ui.shadowSoft,
    backdropFilter: ui.blur,
  };

  const formatEuro = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    return safe.toFixed(2) + " €";
  };

  const formatDate = (value: string) => {
    try {
      return new Date(value).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return value;
    }
  };

  const formatTime = (value: string) => {
    try {
      return new Date(value).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      setHistoryErrorMsg(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setError("Vous devez être connecté pour accéder à votre tableau de bord.");
        setLoading(false);
        router.push("/login");
        return;
      }

      // role
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled) {
        if ((profileData?.role || "").toLowerCase() === "admin") setIsAdmin(true);
        else setIsAdmin(false);
      }

      // SOLDE wallets.balance
      const { data: walletRow, error: walletErr } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cancelled) {
        if (walletErr) {
          console.error("wallets error:", walletErr);
          setAvailableBalance(0);
        } else {
          const bal = toNum((walletRow as any)?.balance);
          setAvailableBalance(Math.max(bal, 0));
        }
      }

      // Stats
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("cashback_to_user, donation_amount, status, wallet_spent")
        .eq("user_id", user.id);

      if (!cancelled) {
        if (txError) {
          console.error("transactions stats error:", txError);
          setTotalCashback(0);
          setTotalDonation(0);
          setTxCount(0);
        } else if (txData) {
          const list = txData as StatTransaction[];
          const approved = list.filter(
            (tx) => tx.status === "approved" || tx.status === "validated"
          );

          const totalCb = approved.reduce(
            (sum, tx) => sum + toNum(tx.cashback_to_user),
            0
          );

          const totalDon = approved.reduce(
            (sum, tx) => sum + toNum(tx.donation_amount),
            0
          );

          setTotalCashback(totalCb);
          setTotalDonation(totalDon);
          setTxCount(approved.length);
        }
      }

      // Historique (view)
      const { data: historyData, error: historyError } = await supabase
        .from("client_transactions_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!cancelled) {
        if (historyError) {
          console.error("client_transactions_history error:", historyError);
          setHistoryErrorMsg(historyError.message);
          setRecentTx([]);
        } else if (historyData) {
          const mapped: RecentTransaction[] =
            historyData.map((row: any) => ({
              id: row.id,
              created_at: row.created_at,
              merchant_name: row.merchant_name ?? null,
              purchase_amount: toNum(row.purchase_amount ?? row.amount ?? 0),
              cashback_to_user: toNum(row.cashback_to_user ?? row.cashback_amount ?? 0),
              donation_amount: toNum(row.donation_amount ?? row.donation ?? 0),
            })) ?? [];

          setRecentTx(mapped);
        }
      }

      if (!cancelled) setLoading(false);
    };

    loadData();

    const onFocus = () => loadData();
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadData();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [supabase, router]);

  // ✅ NEW: seuil minimum pour utiliser la cagnotte
  const MIN_REDEEM = 5;
  const unlockPct = clamp01(availableBalance / MIN_REDEEM);
  const remainingToUnlock = Math.max(0, MIN_REDEEM - availableBalance);
  const isUnlocked = availableBalance >= MIN_REDEEM;

  const emptyStateTip =
    txCount === 0
      ? "Commencez par scanner un QR commerçant. En 10 secondes, votre 1er don apparaît ici."
      : availableBalance <= 0
      ? "Votre cagnotte est à 0€. Faites un nouveau scan pour regagner des crédits."
      : "Vous pouvez utiliser une partie de votre cagnotte dès maintenant.";

  return (
    <main>
      <div className="ppWrap">
        {/* Header */}
        <header className="ppHeader">
          <div className="ppHeaderTop">
            <div>
              <h1 className="ppTitle">Tableau de bord</h1>
              <p className="ppSubtitle">
                Suivez votre contribution et votre cagnotte en un coup d&apos;œil.
              </p>
            </div>

            {isAdmin && (
              <button onClick={() => router.push("/admin")} className="ppBtn ppBtnSecondary">
                Accéder à l&apos;admin
              </button>
            )}
          </div>

          <div className="ppBanner" style={cardBase}>
            <div style={{ minWidth: 0 }}>
              <div className="ppBannerTitle">
                {txCount === 0 ? "Votre première action" : "Prochaine étape"}
              </div>
              <div className="ppBannerText">{emptyStateTip}</div>
            </div>
            <button onClick={() => router.push("/scan")} className="ppBtn ppBtnPrimary">
              Scanner un QR
            </button>
          </div>
        </header>

        {loading && (
          <div style={{ ...cardBase, padding: 14 }}>
            <p style={{ margin: 0, color: ui.subtext }}>Chargement…</p>
          </div>
        )}

        {error && (
          <div style={{ ...cardBase, padding: 14 }}>
            <p style={{ color: "#B91C1C", margin: 0 }}>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Cards grid */}
            <section className="ppCards">
              {/* Welcome */}
              <div className="ppCard" style={cardBase}>
                <div className="ppCardGlow ppCardGlowWarm" />
                <div className="ppCardInner">
                  <div className="ppPill">Bienvenue</div>
                  <h2 className="ppH2">Un scan, et votre cashback démarre</h2>
                  <p className="ppP">
                    Scannez un QR commerçant pour enregistrer vos achats et accumuler du cashback
                    solidaire.
                  </p>

                  <div className="ppRow">
                    <button
                      onClick={() => router.push("/comment-ca-marche")}
                      className="ppBtn ppBtnSecondary"
                    >
                      Comment ça marche
                    </button>
                    <button
                      onClick={() => router.push("/commerces")}
                      className="ppBtn ppBtnSecondary"
                    >
                      Voir les commerces
                    </button>
                  </div>
                </div>
              </div>

              {/* Contribution */}
              <div className="ppCard" style={cardBase}>
                <div className="ppCardGlow ppCardGlowGreenSoft" />
                <div className="ppCardInner">
                  <div className="ppPill ppPillGreen">Ma contribution</div>
                  <h2 className="ppH2">Ma contribution PawPass</h2>
                  <p className="ppP" style={{ marginTop: 8 }}>
                    Voici l&apos;impact total de vos passages chez les commerçants partenaires.
                  </p>

                  <div className="ppContributionBox">
                    <div className="ppContributionLabel">Total des dons depuis le début</div>
                    <div className="ppContributionValue">{formatEuro(totalDonation)}</div>
                    <div className="ppContributionMeta">
                      Basé sur <b>{txCount}</b> transaction{txCount > 1 ? "s" : ""} validée
                      {txCount > 1 ? "s" : ""}.
                    </div>
                  </div>

                  <div className="ppTiny" style={{ marginTop: 10 }}>
                    Merci. Chaque scan aide une SPA locale.
                  </div>
                </div>
              </div>

              {/* Wallet */}
              <div className="ppCard ppCardHero" style={{ ...cardBase, boxShadow: ui.shadow }}>
                <div className="ppCardGlow ppCardGlowGreen" />
                <div className="ppCardInner">
                  <div className="ppWalletTop">
                    <div>
                      <h2 className="ppH2" style={{ marginBottom: 2 }}>
                        Ma cagnotte PawPass
                      </h2>
                      <div className="ppSmall">Cashback disponible pour vos réductions</div>
                    </div>
                  </div>

                  <div className="ppWalletMid">
                    <div>
                      <div className="ppBig">{formatEuro(availableBalance)}</div>
                      <div className="ppSmall">
                        Cashback gagné : <b style={{ color: ui.text }}>{formatEuro(totalCashback)}</b>
                        {"  "}•{"  "}
                        Transactions : <b style={{ color: ui.text }}>{txCount}</b>
                      </div>
                    </div>

                    <button
                      onClick={() => router.push("/scan?mode=redeem&scan=1")}
                      className="ppBtn ppBtnGreen"
                      disabled={!isUnlocked}
                      title={
                        !isUnlocked
                          ? `Minimum ${formatEuro(MIN_REDEEM)} requis. Il vous reste ${formatEuro(
                              remainingToUnlock
                            )} à cumuler.`
                          : "Utiliser votre cashback"
                      }
                    >
                      Utiliser mon cashback
                    </button>
                  </div>

                  {/* ✅ REPLACEMENT: seuil 5€ */}
                  <div className="ppGoal">
                    <div className="ppGoalTop">
                      <span className="ppSmall">
                        Déblocage cagnotte :{" "}
                        <b style={{ color: ui.text }}>{formatEuro(MIN_REDEEM)}</b> minimum
                      </span>
                      <span className="ppSmall">{Math.round(unlockPct * 100)}%</span>
                    </div>

                    <div className="ppBar">
                      <div
                        className="ppBarFill"
                        style={{ width: `${Math.round(unlockPct * 100)}%` }}
                      />
                    </div>

                   <div className="ppTiny">
  {isUnlocked ? (
    <>Cagnotte débloquée. Vous pouvez utiliser vos crédits dès maintenant.</>
  ) : (
    <>
      Il vous reste <b>{formatEuro(remainingToUnlock)}</b> à cumuler pour débloquer votre cagnotte.
    </>
  )}
</div>

                  </div>
                </div>
              </div>
            </section>

            {/* Donation ticker */}
            <section className="ppSectionNarrow">
              <DonationFeedTicker limit={6} />
            </section>

            {/* Transactions */}
            <section className="ppSectionNarrow">
              <div className="ppCard" style={cardBase}>
                <div className="ppCardInner">
                  <div className="ppSectionHeader">
                    <h2 className="ppH2" style={{ margin: 0 }}>
                      Dernières transactions
                    </h2>
                    <Link className="ppLink" href="/transactions">
                      Voir tout l&apos;historique
                    </Link>
                  </div>

                  {historyErrorMsg && (
                    <div className="ppErrorBox">
                      Impossible de charger l&apos;historique : {historyErrorMsg}
                    </div>
                  )}

                  {recentTx.length === 0 ? (
                    <div className="ppEmptyBox">Aucune transaction pour le moment.</div>
                  ) : (
                    <>
                      {/* Desktop table */}
                      <div className="ppTxDesktop">
                        {recentTx.map((tx) => (
                          <div className="ppTxRow" key={tx.id}>
                            <div className="ppTxMerchant">
                              <b>{tx.merchant_name || "Commerçant"}</b>
                              <span className="ppTxMeta">
                                • Achat {formatEuro(tx.purchase_amount)}
                              </span>
                            </div>
                            <div className="ppTxDate">{formatDate(tx.created_at)}</div>
                            <div className="ppTxCb">{formatEuro(tx.cashback_to_user)}</div>
                            <div className="ppTxDon">{formatEuro(tx.donation_amount)}</div>
                          </div>
                        ))}
                      </div>

                      {/* Mobile list */}
                      <div className="ppTxMobile">
                        {recentTx.map((tx) => (
                          <div className="ppTxCard" key={tx.id}>
                            <div className="ppTxCardTop">
                              <div className="ppTxCardMerchant">
                                {tx.merchant_name || "Commerçant"}
                              </div>
                              <div className="ppTxCardDate">
                                {formatDate(tx.created_at)} • {formatTime(tx.created_at)}
                              </div>
                            </div>

                            <div className="ppTxCardMid">
                              <div className="ppTxCardSmall">Achat</div>
                              <div className="ppTxCardVal">{formatEuro(tx.purchase_amount)}</div>
                            </div>

                            <div className="ppTxCardBottom">
                              <div className="ppTag ppTagBlue">
                                Cashback {formatEuro(tx.cashback_to_user)}
                              </div>
                              <div className="ppTag ppTagGreen">
                                Don {formatEuro(tx.donation_amount)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {/* CSS responsive minimal (dans CE fichier uniquement) */}
        <style jsx global>{`
          .ppWrap {
            max-width: ${ui.maxW}px;
            margin: 0 auto;
            padding: 18px 14px 48px;
          }

          .ppHeader {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 14px;
          }

          .ppHeaderTop {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
          }

          .ppTitle {
            margin: 0;
            font-size: 28px;
            letter-spacing: -0.02em;
            color: ${ui.text};
          }

          .ppSubtitle {
            margin: 6px 0 0 0;
            color: ${ui.subtext};
            line-height: 1.35;
            font-size: 14px;
          }

          .ppBanner {
            padding: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }

          .ppBannerTitle {
            font-weight: 900;
            color: ${ui.text};
            font-size: 13px;
          }

          .ppBannerText {
            margin-top: 2px;
            color: ${ui.subtext};
            font-size: 13px;
            line-height: 1.35;
          }

          .ppCards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
          }

          .ppSectionNarrow {
            margin-top: 18px;
            max-width: 920px;
            margin-left: auto;
            margin-right: auto;
          }

          .ppCard {
            position: relative;
            overflow: hidden;
          }

          .ppCardInner {
            padding: 14px;
            position: relative;
            z-index: 2;
          }

          .ppCardGlow {
            position: absolute;
            inset: -1px;
            z-index: 1;
            pointer-events: none;
          }
          .ppCardGlowWarm {
            background: radial-gradient(
                600px 200px at 10% 0%,
                rgba(255, 122, 60, 0.18) 0%,
                rgba(255, 255, 255, 0) 60%
              ),
              radial-gradient(
                520px 200px at 90% 30%,
                rgba(37, 99, 235, 0.14) 0%,
                rgba(255, 255, 255, 0) 60%
              );
          }
          .ppCardGlowGreen {
            background: radial-gradient(
                540px 220px at 85% 0%,
                rgba(22, 163, 74, 0.16) 0%,
                rgba(255, 255, 255, 0) 60%
              ),
              radial-gradient(
                540px 240px at 0% 100%,
                rgba(255, 122, 60, 0.12) 0%,
                rgba(255, 255, 255, 0) 60%
              );
          }
          .ppCardGlowGreenSoft {
            background: radial-gradient(
                520px 220px at 15% 0%,
                rgba(22, 163, 74, 0.14) 0%,
                rgba(255, 255, 255, 0) 62%
              ),
              radial-gradient(
                520px 220px at 90% 60%,
                rgba(37, 99, 235, 0.10) 0%,
                rgba(255, 255, 255, 0) 62%
              );
          }
          .ppCardGlowBlue {
            background: radial-gradient(
              560px 240px at 20% 0%,
              rgba(37, 99, 235, 0.16) 0%,
              rgba(255, 255, 255, 0) 62%
            );
          }

          .ppPill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            border-radius: 999px;
            background: ${ui.amberBg};
            color: ${ui.brand};
            font-weight: 900;
            font-size: 12px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            margin-bottom: 10px;
          }

          .ppPillGreen {
            background: rgba(22, 163, 74, 0.12);
            color: ${ui.green};
          }

          .ppH2 {
            margin: 0;
            font-size: 18px;
            color: ${ui.text};
            line-height: 1.2;
          }

          .ppP {
            margin: 10px 0 0 0;
            color: ${ui.subtext};
            line-height: 1.5;
            font-size: 14px;
          }

          .ppSmall {
            color: ${ui.subtext2};
            font-size: 13px;
            line-height: 1.35;
          }

          .ppTiny {
            color: ${ui.subtext2};
            font-size: 12px;
            line-height: 1.35;
            margin-top: 8px;
          }

          .ppRow {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 12px;
          }

          .ppBtn {
            border: none;
            border-radius: 999px;
            padding: 10px 12px;
            font-weight: 900;
            font-size: 14px;
            cursor: pointer;
            white-space: nowrap;
          }

          .ppBtnPrimary {
            background: ${ui.brand};
            color: white;
            box-shadow: 0 16px 34px rgba(255, 122, 60, 0.3);
          }

          .ppBtnSecondary {
            background: ${ui.surfaceStrong};
            border: ${ui.border};
            color: ${ui.text};
            box-shadow: 0 10px 22px rgba(15, 23, 42, 0.1);
          }

          .ppBtnGreen {
            background: #16a34a;
            color: white;
            padding: 10px 14px;
            border-radius: 14px;
            box-shadow: 0 18px 34px rgba(22, 163, 74, 0.28);
          }

          .ppBtnGreen:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            box-shadow: none;
          }

          .ppWalletTop {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 10px;
          }

          .ppWalletMid {
            margin-top: 10px;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 12px;
          }

          .ppBig {
            font-size: 40px;
            font-weight: 950;
            color: ${ui.text};
            letter-spacing: -0.03em;
            line-height: 1;
          }

          .ppGoal {
            margin-top: 12px;
          }

          .ppGoalTop {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }

          .ppBar {
            height: 10px;
            border-radius: 999px;
            background: rgba(15, 23, 42, 0.08);
            overflow: hidden;
            margin-top: 8px;
          }

          .ppBarFill {
            height: 100%;
            border-radius: 999px;
            background: linear-gradient(
              90deg,
              rgba(255, 122, 60, 0.95) 0%,
              rgba(22, 163, 74, 0.95) 100%
            );
            transition: width 260ms ease;
          }

          .ppContributionBox {
            margin-top: 12px;
            border-radius: 16px;
            padding: 14px;
            background: rgba(22, 163, 74, 0.09);
            border: 1px solid rgba(22, 163, 74, 0.16);
          }
          .ppContributionLabel {
            font-size: 13px;
            font-weight: 900;
            color: ${ui.green};
          }
          .ppContributionValue {
            margin-top: 6px;
            font-size: 34px;
            font-weight: 950;
            color: ${ui.text};
            letter-spacing: -0.03em;
            line-height: 1.05;
          }
          .ppContributionMeta {
            margin-top: 8px;
            font-size: 13px;
            color: ${ui.subtext};
            line-height: 1.35;
          }

          .ppSectionHeader {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 10px;
          }

          .ppLink {
            font-size: 13px;
            font-weight: 800;
            color: ${ui.blue};
            text-decoration: underline;
            white-space: nowrap;
          }

          .ppErrorBox {
            border-radius: 14px;
            padding: 12px;
            background: rgba(185, 28, 28, 0.08);
            border: 1px solid rgba(185, 28, 28, 0.16);
            color: #b91c1c;
            font-size: 13px;
            margin-bottom: 10px;
          }

          .ppEmptyBox {
            border-radius: 14px;
            padding: 14px;
            background: rgba(15, 23, 42, 0.05);
            border: 1px solid rgba(15, 23, 42, 0.07);
            color: ${ui.subtext};
            font-size: 13px;
          }

          /* Transactions desktop */
          .ppTxDesktop {
            display: block;
          }
          .ppTxRow {
            display: grid;
            grid-template-columns: 2.2fr 1fr 1fr 1fr;
            gap: 10px;
            align-items: center;
            padding: 10px 6px;
            border-bottom: 1px solid rgba(15, 23, 42, 0.06);
            font-size: 14px;
          }
          .ppTxMerchant {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: ${ui.text};
          }
          .ppTxMeta {
            margin-left: 8px;
            color: ${ui.subtext2};
            font-size: 12px;
          }
          .ppTxDate {
            color: ${ui.subtext2};
            font-size: 13px;
          }
          .ppTxCb {
            text-align: right;
            font-weight: 900;
            color: ${ui.text};
          }
          .ppTxDon {
            text-align: right;
            font-weight: 900;
            color: ${ui.green};
          }

          /* Transactions mobile */
          .ppTxMobile {
            display: none;
          }
          .ppTxCard {
            border-radius: 14px;
            padding: 12px;
            background: rgba(255, 255, 255, 0.75);
            border: 1px solid rgba(15, 23, 42, 0.07);
            margin-top: 10px;
          }
          .ppTxCardTop {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 10px;
          }
          .ppTxCardMerchant {
            font-weight: 950;
            color: ${ui.text};
          }
          .ppTxCardDate {
            font-size: 12px;
            color: ${ui.subtext2};
            white-space: nowrap;
          }
          .ppTxCardMid {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-top: 10px;
          }
          .ppTxCardSmall {
            font-size: 12px;
            color: ${ui.subtext2};
            font-weight: 800;
          }
          .ppTxCardVal {
            font-weight: 950;
            color: ${ui.text};
          }
          .ppTxCardBottom {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 10px;
          }
          .ppTag {
            padding: 7px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 950;
            white-space: nowrap;
          }
          .ppTagBlue {
            background: rgba(37, 99, 235, 0.1);
            border: 1px solid rgba(37, 99, 235, 0.16);
            color: ${ui.blue};
          }
          .ppTagGreen {
            background: rgba(22, 163, 74, 0.1);
            border: 1px solid rgba(22, 163, 74, 0.16);
            color: ${ui.green};
          }

          @media (max-width: 640px) {
            .ppWrap {
              padding: 14px 12px 44px;
            }

            .ppHeaderTop {
              flex-direction: column;
              align-items: stretch;
            }

            .ppTitle {
              font-size: 24px;
            }

            .ppBanner {
              flex-direction: column;
              align-items: stretch;
            }

            .ppBtnPrimary {
              width: 100%;
            }

            .ppBig {
              font-size: 34px;
            }

            .ppWalletMid {
              flex-direction: column;
              align-items: stretch;
            }

            .ppBtnGreen {
              width: 100%;
            }

            .ppTxDesktop {
              display: none;
            }
            .ppTxMobile {
              display: block;
            }
          }

          button:focus-visible,
          a:focus-visible {
            outline: 3px solid rgba(37, 99, 235, 0.28);
            outline-offset: 2px;
            border-radius: 12px;
          }
        `}</style>
      </div>
    </main>
  );
}

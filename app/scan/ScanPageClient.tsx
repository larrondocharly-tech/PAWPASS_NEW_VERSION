"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamicImport from "next/dynamic";
import ScanInner from "./scan-inner";

export const dynamic = "force-dynamic";

type Mode = "scan" | "coupon";

const QrScanner = dynamicImport(() => import("react-qr-scanner"), { ssr: false }) as any;
const videoConstraints = { video: { facingMode: { ideal: "environment" } } };

function CouponStart({
  onScan,
  onUseLast,
  hasLast,
}: {
  onScan: () => void;
  onUseLast: () => void;
  hasLast: boolean;
}) {
  return (
    <main style={{ minHeight: "100vh", background: "transparent", padding: "16px 0 28px" }}>
      <div className="container" style={{ maxWidth: 560 }}>
        <section
          style={{
            borderRadius: 22,
            padding: 16,
            background: "rgba(255,255,255,0.90)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 16px 34px rgba(0,0,0,0.10)",
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#FF7A3C",
              margin: 0,
            }}
          >
            COUPON / RÉDUCTION
          </p>

          <h1 style={{ fontSize: 24, fontWeight: 900, margin: "8px 0 0", color: "#0f172a" }}>
            Utiliser mes crédits
          </h1>

          <p style={{ color: "#475569", marginTop: 8, lineHeight: 1.4 }}>
            Pour utiliser ta cagnotte, sélectionne un commerçant en scannant son QR code, ou continue avec le dernier
            commerçant scanné.
          </p>

          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {hasLast && (
              <button
                type="button"
                onClick={onUseLast}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "none",
                  background: "#0A8F44",
                  color: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Continuer avec le dernier commerçant
              </button>
            )}

            <button
              type="button"
              onClick={onScan}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Scanner un commerçant
            </button>

            {!hasLast && (
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Astuce : après un premier scan, on te proposera automatiquement de reprendre le dernier commerçant.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function normalizeMode(raw: string): Mode {
  const m = (raw || "").toLowerCase().trim();
  // compat: mode=redeem (ancien) => coupon
  if (m === "coupon" || m === "redeem") return "coupon";
  return "scan";
}

/**
 * Scan-only:
 * - On n'accepte PLUS m= / code= (ni depuis URL, ni depuis QR)
 * - On accepte uniquement un token de scan "t" (ou "token") provenant du QR
 */
function extractScanToken(rawInput: string) {
  const raw = (rawInput || "").trim();
  if (!raw) return "";

  // Cas URL => on lit uniquement t / token
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      const t = url.searchParams.get("t") || url.searchParams.get("token") || "";
      return (t || "").trim();
    } catch {
      // Si c'est une URL invalide, on retombe en "texte brut" (mais on exigera un token propre)
      return "";
    }
  }

  /**
   * Cas texte brut scanné (si un jour tu mets un QR qui contient juste le token)
   * => on accepte si ça ressemble à un token non trivial
   */
  return raw;
}

export default function ScanPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const modeParam = searchParams.get("mode") || "";
  const mode: Mode = normalizeMode(modeParam);

  // ✅ Scan-only : on ne lit plus m/code
  const scanToken = (searchParams.get("t") || searchParams.get("token") || "").trim();

  // scan=1 => on force l’écran caméra
  const scanFlag = (searchParams.get("scan") || "").trim() === "1";

  const [error, setError] = useState<string | null>(null);

  const [scanned, setScanned] = useState(false);
  const scannedAt = useRef<number>(0);
  const scanLock = useRef(false);
  const [scannerKey, setScannerKey] = useState(1);

  // Dernier commerçant = dernier token scanné (pas un code)
  const [lastMerchantToken, setLastMerchantToken] = useState<string>("");

  useEffect(() => {
    try {
      const v = localStorage.getItem("pp_last_merchant_token") || "";
      setLastMerchantToken(v.trim());
    } catch {
      setLastMerchantToken("");
    }
  }, []);

  useEffect(() => {
    setError(null);
    setScanned(false);
    scannedAt.current = 0;
    scanLock.current = false;
    setScannerKey((k) => k + 1);
  }, [mode, scanToken, scanFlag]);

  // ✅ Normalise aussi l’URL si on arrive en mode=redeem => mode=coupon (propre)
  useEffect(() => {
    const raw = (modeParam || "").toLowerCase().trim();
    if (raw === "redeem") {
      const t = scanToken ? `&t=${encodeURIComponent(scanToken)}` : "";
      const s = scanFlag ? `&scan=1` : "";
      router.replace(`/scan?mode=coupon${t}${s}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Si quelqu'un arrive avec ?m= ou ?code=, on ignore et on "nettoie" l'URL (anti-triche)
  useEffect(() => {
    const m = (searchParams.get("m") || "").trim();
    const c = (searchParams.get("code") || "").trim();
    if (m || c) {
      const t = scanToken ? `&t=${encodeURIComponent(scanToken)}` : "";
      const s = scanFlag ? `&scan=1` : "";
      router.replace(`/scan?mode=${encodeURIComponent(mode)}${t}${s}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const pushToModeWithToken = (token: string) => {
    const safe = encodeURIComponent(token);

    try {
      localStorage.setItem("pp_last_merchant_token", token);
    } catch {}

    router.replace(`/scan?mode=${encodeURIComponent(mode)}&t=${safe}`);
  };

  const handleScan = (data: any) => {
    if (!data) return;
    if (scanned) return;
    if (scanLock.current) return;

    const text = typeof data === "string" ? data : data?.text || data?.data || data?.qrCodeMessage;
    const token = extractScanToken(text || "");
    if (!token) return;

    const now = Date.now();
    if (now - scannedAt.current < 1200) return;
    scannedAt.current = now;

    scanLock.current = true;
    setScanned(true);

    try {
      pushToModeWithToken(token);
    } catch (e) {
      console.error(e);
      setError("Erreur lors de la lecture du QR code.");
      setScanned(false);
      scanLock.current = false;
    }
  };

  const handleScanError = (err: any) => {
    console.error(err);
    setError("Erreur du scanner QR. Vérifiez l’autorisation caméra.");
  };

  // ✅ Si on a un token => ScanInner gère scan/coupon
  if (scanToken) {
    return <ScanInner />;
  }

  // ✅ Mode coupon sans commerçant : écran start (pas caméra)
  if (mode === "coupon" && !scanFlag) {
    return (
      <CouponStart
        hasLast={!!lastMerchantToken}
        onUseLast={() => {
          if (!lastMerchantToken) return;
          router.replace(`/scan?mode=coupon&t=${encodeURIComponent(lastMerchantToken)}`);
        }}
        onScan={() => {
          router.replace(`/scan?mode=coupon&scan=1`);
        }}
      />
    );
  }

  // ✅ Sinon : écran caméra
  return (
    <main style={{ minHeight: "100vh", background: "transparent", padding: "16px 0 28px" }}>
      <div className="container" style={{ maxWidth: 560 }}>
        <header style={{ textAlign: "center", marginBottom: 14 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#FF7A3C",
              margin: 0,
            }}
          >
            {mode === "coupon" ? "Sélection du commerçant" : "Scan rapide"}
          </p>

          <h1 style={{ fontSize: 26, fontWeight: 900, margin: "8px 0 0", color: "#0f172a" }}>
            {mode === "coupon" ? "Scanner un commerçant (coupon)" : "Scanner un commerçant"}
          </h1>

          <p style={{ color: "#475569", marginTop: 6 }}>Placez le QR code dans le cadre. La détection est automatique.</p>
        </header>

        {error && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              padding: 12,
              borderRadius: 14,
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <section
          className="card"
          style={{
            borderRadius: 22,
            padding: 14,
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 16px 34px rgba(0,0,0,0.10)",
          }}
        >
          <div
            style={{
              position: "relative",
              borderRadius: 18,
              overflow: "hidden",
              background: "#0b1220",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            {!scanned ? (
              <QrScanner
                key={scannerKey}
                delay={300}
                onError={handleScanError}
                onScan={handleScan}
                constraints={videoConstraints}
                style={{ width: "100%" }}
              />
            ) : (
              <div style={{ width: "100%", aspectRatio: "4 / 3" }} />
            )}

            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(circle at center, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0.55) 100%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: "72%",
                  maxWidth: 320,
                  aspectRatio: "1 / 1",
                  transform: "translate(-50%,-50%)",
                  borderRadius: 18,
                  border: scanned ? "2px solid rgba(34,197,94,0.95)" : "2px solid rgba(255,255,255,0.85)",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.18) inset",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 10,
                  textAlign: "center",
                  fontSize: 13,
                  fontWeight: 800,
                  color: "white",
                  textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                }}
              >
                {scanned ? "QR détecté…" : "Placez le QR dans le cadre"}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setScanned(false);
                  scannedAt.current = 0;
                  scanLock.current = false;
                  setError(null);
                  setScannerKey((k) => k + 1);
                }}
                style={{
                  flex: 1,
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Reprendre
              </button>

              {/* Scan-only: plus de saisie manuelle */}
              <button
                type="button"
                onClick={() => {
                  setError("La saisie manuelle est désactivée. Merci de scanner le QR code du commerçant.");
                }}
                style={{
                  flex: 1,
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "none",
                  background: "#94a3b8",
                  color: "white",
                  fontWeight: 900,
                  cursor: "not-allowed",
                }}
                disabled
              >
                Scan obligatoire
              </button>
            </div>

            <p style={{ fontSize: 12, color: "#64748b", margin: 0, textAlign: "center" }}>
              Astuce : si la luminosité est faible, rapprochez-vous d’une source de lumière.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

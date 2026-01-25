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
            Pour utiliser ta cagnotte, sélectionne un commerçant (scan du QR) ou continue avec le dernier commerçant
            scanné.
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

export default function ScanPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const modeParam = searchParams.get("mode") || "";
  const mode: Mode = normalizeMode(modeParam);

  // compat: ?m= ou ?code=
  const merchantCode = (searchParams.get("m") || searchParams.get("code") || "").trim();

  // scan=1 => on force l’écran caméra
  const scanFlag = (searchParams.get("scan") || "").trim() === "1";

  const [error, setError] = useState<string | null>(null);

  const [scanned, setScanned] = useState(false);
  const scannedAt = useRef<number>(0);
  const scanLock = useRef(false);
  const [scannerKey, setScannerKey] = useState(1);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const [lastMerchant, setLastMerchant] = useState<string>("");

  useEffect(() => {
    try {
      const v = localStorage.getItem("pp_last_merchant") || "";
      setLastMerchant(v.trim());
    } catch {
      setLastMerchant("");
    }
  }, []);

  useEffect(() => {
    setError(null);
    setScanned(false);
    scannedAt.current = 0;
    scanLock.current = false;
    setManualOpen(false);
    setManualCode("");
    setScannerKey((k) => k + 1);
  }, [mode, merchantCode, scanFlag]);

  // ✅ Normalise aussi l’URL si on arrive en mode=redeem => mode=coupon (propre)
  useEffect(() => {
    const raw = (modeParam || "").toLowerCase().trim();
    if (raw === "redeem") {
      const m = merchantCode ? `&m=${encodeURIComponent(merchantCode)}` : "";
      const s = scanFlag ? `&scan=1` : "";
      router.replace(`/scan?mode=coupon${m}${s}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extractCode = (rawInput: string) => {
    const raw = (rawInput || "").trim();
    if (!raw) return "";

    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      try {
        const url = new URL(raw);
        const fromUrl = url.searchParams.get("m") || url.searchParams.get("code");
        return (fromUrl || raw).trim();
      } catch {
        return raw;
      }
    }
    return raw;
  };

  const pushToMode = (code: string) => {
    const safe = encodeURIComponent(code);

    try {
      localStorage.setItem("pp_last_merchant", code);
    } catch {}

    // ✅ on force la canonicalisation: coupon/scan seulement
    router.replace(`/scan?mode=${encodeURIComponent(mode)}&m=${safe}`);
  };

  const handleScan = (data: any) => {
    if (!data) return;
    if (scanned) return;
    if (scanLock.current) return;

    const text = typeof data === "string" ? data : data?.text || data?.data || data?.qrCodeMessage;
    const code = extractCode(text || "");
    if (!code) return;

    const now = Date.now();
    if (now - scannedAt.current < 1200) return;
    scannedAt.current = now;

    scanLock.current = true;
    setScanned(true);

    try {
      pushToMode(code);
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

  // ✅ Si on a un commerçant => ScanInner gère scan/coupon
  if (merchantCode) {
    return <ScanInner />;
  }

  // ✅ Mode coupon sans commerçant : écran start (pas caméra)
  if (mode === "coupon" && !scanFlag) {
    return (
      <CouponStart
        hasLast={!!lastMerchant}
        onUseLast={() => {
          if (!lastMerchant) return;
          router.replace(`/scan?mode=coupon&m=${encodeURIComponent(lastMerchant)}`);
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

              <button
                type="button"
                onClick={() => setManualOpen((v) => !v)}
                style={{
                  flex: 1,
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "none",
                  background: "#FF7A3C",
                  color: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Saisir un code
              </button>
            </div>

            {manualOpen && (
              <div
                style={{
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(0,0,0,0.10)",
                  borderRadius: 16,
                  padding: 12,
                }}
              >
                <label style={{ display: "block", fontWeight: 900, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>
                  Code commerçant
                </label>
                <input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ex : PP_XXXX"
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(0,0,0,0.12)",
                    fontSize: 15,
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const code = manualCode.trim();
                    if (!code) return;
                    pushToMode(code);
                  }}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    padding: "12px 12px",
                    borderRadius: 14,
                    border: "none",
                    background: "#0A8F44",
                    color: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Continuer
                </button>
              </div>
            )}

            <p style={{ fontSize: 12, color: "#64748b", margin: 0, textAlign: "center" }}>
              Astuce : si la luminosité est faible, rapprochez-vous d’une source de lumière.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

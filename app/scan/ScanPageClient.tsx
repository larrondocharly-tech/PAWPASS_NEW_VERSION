"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ScanInner from "./scan-inner";
import type { Html5Qrcode } from "html5-qrcode";

export const dynamic = "force-dynamic";

type Mode = "scan" | "coupon";

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
  if (m === "coupon" || m === "redeem") return "coupon";
  return "scan";
}

/**
 * Compat scan token:
 * - Nouveau format: ?t= ou ?token=
 * - Ancien format: ?m= ou ?code=
 * - Texte brut: accepté tel quel
 */
function extractScanToken(rawInput: string) {
  const raw = (rawInput || "").trim();
  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      const t =
        url.searchParams.get("t") ||
        url.searchParams.get("token") ||
        url.searchParams.get("m") ||
        url.searchParams.get("code") ||
        "";
      return (t || "").trim();
    } catch {
      return "";
    }
  }

  return raw;
}

/**
 * Scanner robuste iOS/Android (html5-qrcode) :
 * - iOS prod peut FREEZE sur getCameras() => on démarre d'abord en facingMode
 * - fallback getCameras si facingMode échoue
 * - si iOS exige un "user gesture", on affiche un bouton "Activer la caméra"
 */
function CameraScanner({
  scannerKey,
  onText,
  onError,
  onDebug,
}: {
  scannerKey: number;
  onText: (decodedText: string) => void;
  onError: (err: unknown) => void;
  onDebug?: (msg: string) => void;
}) {
  const regionId = useMemo(
    () => `pp-qr-region-${scannerKey}-${Math.random().toString(36).slice(2)}`,
    [scannerKey]
  );

  const qrRef = useRef<Html5Qrcode | null>(null);
  const lastRef = useRef<string>("");

  const [needsTap, setNeedsTap] = useState(false);
  const [starting, setStarting] = useState(false);

  const safeStop = async () => {
    const inst = qrRef.current;
    qrRef.current = null;
    if (!inst) return;

    try {
      await inst.stop();
    } catch {}
    try {
      inst.clear();
    } catch {}
  };

  const startScanner = async () => {
    if (starting) return;
    setStarting(true);
    setNeedsTap(false);

    try {
      onDebug?.("Initialisation caméra…");
      const mod = await import("html5-qrcode");
      const Html5QrcodeCtor = mod.Html5Qrcode;

      // stop ancien scanner si existant
      await safeStop();

      const qr = new Html5QrcodeCtor(regionId);
      qrRef.current = qr;

      const onDecoded = (decodedText: string) => {
        const txt = (decodedText || "").trim();
        if (!txt) return;
        if (txt === lastRef.current) return;
        lastRef.current = txt;
        onDebug?.(`QR détecté: ${txt.slice(0, 60)}${txt.length > 60 ? "…" : ""}`);
        onText(txt);
      };

      // 1) iOS: éviter getCameras() au début => facingMode direct
      onDebug?.("Démarrage caméra arrière…");
      await qr.start(
        { facingMode: "environment" as any },
        { fps: 12, qrbox: { width: 260, height: 260 } } as any,
        onDecoded,
        () => {}
      );

      onDebug?.("Caméra OK. En attente de QR…");
      setStarting(false);
      return;
    } catch (e1) {
      // 2) Fallback getCameras (utile sur certains Android/desktop)
      try {
        onDebug?.("Fallback caméra…");
        const mod = await import("html5-qrcode");
        const Html5QrcodeCtor = mod.Html5Qrcode;

        await safeStop();

        const cams = await mod.Html5Qrcode.getCameras();
        if (!cams?.length) throw e1;

        const back =
          cams.find((d) => /back|rear|environment/i.test(d.label)) ??
          cams[cams.length - 1] ??
          cams[0];

        const qr = new Html5QrcodeCtor(regionId);
        qrRef.current = qr;

        const onDecoded = (decodedText: string) => {
          const txt = (decodedText || "").trim();
          if (!txt) return;
          if (txt === lastRef.current) return;
          lastRef.current = txt;
          onDebug?.(`QR détecté: ${txt.slice(0, 60)}${txt.length > 60 ? "…" : ""}`);
          onText(txt);
        };

        await qr.start(
          { deviceId: { exact: back.id } } as any,
          { fps: 12, qrbox: { width: 260, height: 260 } } as any,
          onDecoded,
          () => {}
        );

        onDebug?.("Caméra OK. En attente de QR…");
        setStarting(false);
        return;
      } catch (e2) {
        // 3) Si iOS bloque sans geste utilisateur, on force un tap
        const msg = String((e2 as any)?.message || e2 || "");
        if (/NotAllowedError|Permission|denied|SecurityError/i.test(msg)) {
          onDebug?.("Appuie sur “Activer la caméra”.");
          setNeedsTap(true);
        } else {
          onDebug?.("Erreur caméra/scanner.");
        }
        onError(e2);
        setStarting(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      lastRef.current = "";
      onDebug?.("Initialisation caméra…");

      // Tentative auto
      await startScanner();

      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
      lastRef.current = "";
      safeStop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId]);

  return (
    <div style={{ width: "100%" }}>
      <div id={regionId} style={{ width: "100%", minHeight: 260 }} />

      {needsTap && (
        <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => startScanner()}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              border: "none",
              background: "#0A8F44",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Activer la caméra
          </button>
        </div>
      )}
    </div>
  );
}

export default function ScanPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const modeParam = searchParams.get("mode") || "";
  const mode: Mode = normalizeMode(modeParam);

  const scanToken = (searchParams.get("t") || searchParams.get("token") || "").trim();
  const scanFlag = (searchParams.get("scan") || "").trim() === "1";

  const [error, setError] = useState<string | null>(null);

  const [scanned, setScanned] = useState(false);
  const scannedAt = useRef<number>(0);
  const scanLock = useRef(false);
  const [scannerKey, setScannerKey] = useState(1);

  const [debugMsg, setDebugMsg] = useState<string>("");
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
    setDebugMsg("");
    setScannerKey((k) => k + 1);
  }, [mode, scanToken, scanFlag]);

  useEffect(() => {
    const raw = (modeParam || "").toLowerCase().trim();
    if (raw === "redeem") {
      const t = scanToken ? `&t=${encodeURIComponent(scanToken)}` : "";
      const s = scanFlag ? `&scan=1` : "";
      router.replace(`/scan?mode=coupon${t}${s}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleDecodedText = (decodedText: string) => {
    if (!decodedText) return;
    if (scanned) return;
    if (scanLock.current) return;

    const token = extractScanToken(decodedText);
    if (!token) {
      setDebugMsg("QR détecté mais token introuvable (attendu: URL avec ?t=/?token= ou token brut).");
      return;
    }

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

  const handleScanError = (err: unknown) => {
    console.error(err);
    const msg = String((err as any)?.message || err || "");
    if (/NotAllowedError|Permission|denied/i.test(msg)) {
      setError("Accès caméra refusé. Autorise la caméra dans Safari/Chrome puis recharge la page.");
      return;
    }
    if (/NotFoundError|no camera|Aucune caméra/i.test(msg)) {
      setError("Aucune caméra détectée sur cet appareil.");
      return;
    }
    // On n’affiche pas en rouge si on gère via bouton “Activer la caméra”
    setError(null);
  };

  if (scanToken) {
    return <ScanInner />;
  }

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
              <div style={{ width: "100%" }}>
                <CameraScanner
                  scannerKey={scannerKey}
                  onText={handleDecodedText}
                  onError={handleScanError}
                  onDebug={(m) => setDebugMsg(m)}
                />
              </div>
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

          <div style={{ marginTop: 10, fontSize: 12, color: "#64748b", textAlign: "center", wordBreak: "break-word" }}>
            {debugMsg || "Initialisation…"}
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
                  setDebugMsg("");
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

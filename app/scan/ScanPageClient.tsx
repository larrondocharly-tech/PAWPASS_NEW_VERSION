"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamicImport from "next/dynamic";
import { createClient } from "@/lib/supabaseClient";
import ScanInner from "./scan-inner";

const QrScanner = dynamicImport(() => import("react-qr-scanner"), { ssr: false }) as any;

type Mode = "scan" | "redeem";

const videoConstraints = { video: { facingMode: { ideal: "environment" } } };

export default function ScanPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const modeParam = searchParams.get("mode");
  const mode: Mode = modeParam === "redeem" ? "redeem" : "scan";
  const merchantCode = searchParams.get("m");

  const [error, setError] = useState<string | null>(null);

  // anti-double scan + UX
  const [scanned, setScanned] = useState(false);
  const scannedAt = useRef<number>(0);

  // fallback saisie manuelle
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");

  // reset scan quand on change de route / mode
  useEffect(() => {
    setError(null);
    setScanned(false);
    scannedAt.current = 0;
    setManualOpen(false);
    setManualCode("");
  }, [mode, merchantCode]);

  const handleScan = (data: any) => {
    if (!data || scanned) return;

    const text =
      typeof data === "string"
        ? data
        : data?.text || data?.data || data?.qrCodeMessage;

    const raw = (text || "").trim();
    if (!raw) return;

    // throttle (évite 2 triggers rapprochés)
    const now = Date.now();
    if (now - scannedAt.current < 1200) return;
    scannedAt.current = now;

    setScanned(true);

    try {
      let code = raw;

      if (raw.startsWith("http://") || raw.startsWith("https://")) {
        const url = new URL(raw);
        code = url.searchParams.get("m") || url.searchParams.get("code") || raw;
      }

      if (mode === "redeem") {
        router.push(`/scan?mode=redeem&m=${encodeURIComponent(code)}`);
      } else {
        router.push(`/scan?m=${encodeURIComponent(code)}`);
      }
    } catch (e) {
      console.error(e);
      setError("Erreur lors de la lecture du QR code.");
      setScanned(false);
    }
  };

  const handleScanError = (err: any) => {
    console.error(err);
    setError("Erreur du scanner QR. Vérifiez l’autorisation caméra.");
  };

  // ✅ MODE SCAN normal : si m existe → formulaire
  if (mode === "scan" && merchantCode) {
    return <ScanInner />;
  }

  // (Ton mode redeem est long chez toi : je ne le modifie pas ici.
  //  Si tu veux, on appliquera le même scanner overlay + UI à redeem aussi.)
  if (mode === "redeem" && merchantCode) {
    // laisse ton ancien flux redeem ici si tu veux le garder.
    // Pour l’instant, on ne casse rien :
    return (
      <main style={{ minHeight: "100vh", background: "#FAFAF5", padding: "16px 0" }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="card" style={{ borderRadius: 16, padding: 16 }}>
            <p style={{ margin: 0 }}>
              Mode redeem détecté avec commerçant. (On peut harmoniser l’UI ensuite.)
            </p>
            <button
              className="button"
              style={{ marginTop: 12 }}
              onClick={() => router.push("/dashboard")}
            >
              Retour dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ✅ ÉCRAN SCANNER (scan normal OU redeem sans m)
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
            {mode === "redeem" ? "Scan sécurisé" : "Scan rapide"}
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: "8px 0 0", color: "#0f172a" }}>
            {mode === "redeem" ? "Utiliser mes crédits" : "Scanner un commerçant"}
          </h1>
          <p style={{ color: "#475569", marginTop: 6 }}>
            Placez le QR code dans le cadre. La détection est automatique.
          </p>
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
          {/* Zone caméra + overlay */}
          <div
            style={{
              position: "relative",
              borderRadius: 18,
              overflow: "hidden",
              background: "#0b1220",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <QrScanner
              delay={300}
              onError={handleScanError}
              onScan={handleScan}
              constraints={videoConstraints}
              style={{ width: "100%" }}
            />

            {/* Overlay sombre + cadre */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
              }}
            >
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

          {/* Actions */}
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setScanned(false);
                  scannedAt.current = 0;
                  setError(null);
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
                  placeholder="Ex : BAB-1234"
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
                    if (mode === "redeem") {
                      router.push(`/scan?mode=redeem&m=${encodeURIComponent(code)}`);
                    } else {
                      router.push(`/scan?m=${encodeURIComponent(code)}`);
                    }
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

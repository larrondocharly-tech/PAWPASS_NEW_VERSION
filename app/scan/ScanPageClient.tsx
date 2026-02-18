"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import ScanInner from "./scan-inner";

export const dynamic = "force-dynamic";

type Mode = "scan" | "coupon";

function normalizeMode(raw: string): Mode {
  const m = (raw || "").toLowerCase().trim();
  return m === "coupon" || m === "redeem" ? "coupon" : "scan";
}

/**
 * ✅ P0.1
 * - On accepte t= / token=
 * - On garde aussi m= / code= en fallback (TES ANCIENS QR sont en m=, on l’a vu)
 */
function extractScanToken(rawInput: string) {
  const raw = (rawInput || "").trim();
  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      const token =
        url.searchParams.get("t") ||
        url.searchParams.get("token") ||
        url.searchParams.get("m") ||
        url.searchParams.get("code") ||
        "";
      return (token || "").trim();
    } catch {
      return "";
    }
  }

  return raw;
}

/* -------------------------------------------------- */
/* Camera scanner (P0.1 stable) */
/* -------------------------------------------------- */
function CameraScanner({
  scannerKey,
  onDecoded,
  onError,
}: {
  scannerKey: number;
  onDecoded: (text: string) => void;
  onError: (err: unknown) => void;
}) {
  // IMPORTANT: id stable (sinon html5-qrcode bug / double video)
  const regionId = useMemo(() => `pp-qr-region-${scannerKey}`, [scannerKey]);

  const qrRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);
  const stoppingRef = useRef(false);
  const lastRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    startedRef.current = false;
    stoppingRef.current = false;
    lastRef.current = "";

    const start = async () => {
      try {
        // Evite double start (StrictMode)
        if (cancelled || startedRef.current) return;

        // force permissions + liste cam (réduit les freezes)
        await Html5Qrcode.getCameras();
        if (cancelled) return;

        const qr = new Html5Qrcode(regionId);
        qrRef.current = qr;
        startedRef.current = true;

        await qr.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 300, height: 300 },
            disableFlip: true,
            // @ts-ignore (selon versions)
            aspectRatio: 1.0,
          },
          (text) => {
            if (cancelled || stoppingRef.current) return;
            if (!text || text === lastRef.current) return;
            lastRef.current = text;
            onDecoded(text);
          },
          () => {}
        );
      } catch (e) {
        onError(e);
      }
    };

    start();

    return () => {
      cancelled = true;
      stoppingRef.current = true;

      const inst = qrRef.current;
      qrRef.current = null;

      if (!inst) return;

      // STOP PROPRE (et surtout: clear() n'est PAS une Promise selon versions)
      (async () => {
        try {
          await inst.stop();
        } catch {}
        try {
          inst.clear();
        } catch {}
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId]);

  return <div id={regionId} style={{ width: "100%", minHeight: 320 }} />;
}

/* -------------------------------------------------- */
/* Page */
/* -------------------------------------------------- */
export default function ScanPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = normalizeMode(searchParams.get("mode") || "");
  const scanToken = (
    searchParams.get("t") ||
    searchParams.get("token") ||
    searchParams.get("m") ||
    searchParams.get("code") ||
    ""
  ).trim();

  const scanFlag = (searchParams.get("scan") || "") === "1";

  const [error, setError] = useState<string | null>(null);
  const [scannerKey, setScannerKey] = useState(1);
  const lockRef = useRef(false);

  // Si token => écran achat/coupon
  if (scanToken) return <ScanInner />;

  // Mode coupon: bouton pour lancer la caméra (optionnel)
  if (mode === "coupon" && !scanFlag) {
    return (
      <main style={{ padding: 24 }}>
        <button
          onClick={() => router.replace("/scan?mode=coupon&scan=1")}
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 14,
            background: "#0A8F44",
            color: "white",
            fontWeight: 900,
            border: "none",
            cursor: "pointer",
          }}
        >
          Scanner un commerçant
        </button>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", padding: 16 }}>
      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#b91c1c",
            padding: 12,
            borderRadius: 12,
            marginBottom: 12,
            fontWeight: 800,
          }}
        >
          {error}
        </div>
      )}

      <CameraScanner
        scannerKey={scannerKey}
        onDecoded={(rawText) => {
          if (lockRef.current) return;

          const token = extractScanToken(rawText);
          if (!token) return;

          lockRef.current = true;
          router.replace(`/scan?mode=${mode}&t=${encodeURIComponent(token)}`);
        }}
        onError={(e) => {
          console.error("CameraScanner error:", e);
          setError("Erreur caméra. Autorise la caméra dans le navigateur puis recharge la page.");
        }}
      />

      <button
        onClick={() => {
          lockRef.current = false;
          setError(null);
          setScannerKey((k) => k + 1);
        }}
        style={{
          marginTop: 16,
          width: "100%",
          padding: 14,
          borderRadius: 14,
          fontWeight: 900,
          border: "1px solid rgba(0,0,0,0.15)",
          background: "white",
          cursor: "pointer",
        }}
      >
        Reprendre le scan
      </button>
    </main>
  );
}

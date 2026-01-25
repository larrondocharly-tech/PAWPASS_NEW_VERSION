"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import ScanInner from "./scan-inner";

export const dynamic = "force-dynamic";

type Mode = "scan" | "coupon";

/* -------------------------------------------------- */
/* Utils */
/* -------------------------------------------------- */

function normalizeMode(raw: string): Mode {
  const m = (raw || "").toLowerCase().trim();
  return m === "coupon" || m === "redeem" ? "coupon" : "scan";
}

function extractScanToken(rawInput: string) {
  const raw = (rawInput || "").trim();
  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      return (
        url.searchParams.get("t") ||
        url.searchParams.get("token") ||
        url.searchParams.get("m") ||
        url.searchParams.get("code") ||
        ""
      ).trim();
    } catch {
      return "";
    }
  }

  return raw;
}

/* -------------------------------------------------- */
/* Camera scanner (PROD SAFE MOBILE) */
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
  const regionId = useMemo(
    () => `pp-qr-${scannerKey}-${Math.random().toString(36).slice(2)}`,
    [scannerKey]
  );

  const qrRef = useRef<Html5Qrcode | null>(null);
  const lastRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const qr = new Html5Qrcode(regionId);
        qrRef.current = qr;

        await qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (text) => {
            if (cancelled) return;
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
      const inst = qrRef.current;
      qrRef.current = null;
      if (inst) {
        inst.stop().catch(() => {});
        try {
          inst.clear();
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId]);

  return <div id={regionId} style={{ width: "100%", minHeight: 260 }} />;
}

/* -------------------------------------------------- */
/* Page */
/* -------------------------------------------------- */

export default function ScanPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = normalizeMode(searchParams.get("mode") || "");
  const scanToken = (searchParams.get("t") || "").trim();
  const scanFlag = (searchParams.get("scan") || "") === "1";

  const [error, setError] = useState<string | null>(null);
  const [scannerKey, setScannerKey] = useState(1);
  const lockRef = useRef(false);

  if (scanToken) {
    return <ScanInner />;
  }

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
          }}
        >
          {error}
        </div>
      )}

      <CameraScanner
        scannerKey={scannerKey}
        onDecoded={(text) => {
          if (lockRef.current) return;
          const token = extractScanToken(text);
          if (!token) return;
          lockRef.current = true;
          router.replace(`/scan?mode=${mode}&t=${encodeURIComponent(token)}`);
        }}
        onError={() => {
          setError(
            "Erreur caméra. Autorise la caméra dans le navigateur puis recharge la page."
          );
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
        }}
      >
        Reprendre le scan
      </button>
    </main>
  );
}

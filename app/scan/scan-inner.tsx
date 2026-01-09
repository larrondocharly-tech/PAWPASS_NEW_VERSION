"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

import QrScannerRaw from "react-qr-scanner";
const QrScanner: any = QrScannerRaw;

export const dynamic = "force-dynamic";

interface Spa {
  id: string;
  name: string;
}

export default function ScanInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [scanned, setScanned] = useState(false);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Scanner un code QR</h1>

      <QrScanner
        delay={250}
        style={{ width: "100%" }}
        constraints={{
          video: {
            facingMode: { ideal: "environment" } // caméra arrière
          },
        }}
        onScan={(result: any) => {
          if (result && !scanned) {
            setScanned(true);
            router.push(`/scan?code=${result.text}`);
          }
        }}
        onError={(err: any) => console.error("QR error:", err)}
      />
    </div>
  );
}

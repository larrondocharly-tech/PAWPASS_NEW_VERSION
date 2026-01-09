"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

import QrScanner from "react-qr-scanner";

export const dynamic = "force-dynamic";

const AnyQrScanner: any = QrScanner;

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

      <AnyQrScanner
        delay={250}
        style={{ width: "100%" }}
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

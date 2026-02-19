"use client";

import dynamic from "next/dynamic";

const ScanPageClient = dynamic(() => import("./ScanPageClient"), {
  ssr: false,
  loading: () => (
    <main style={{ minHeight: "100vh", padding: 16 }}>
      <p>Chargement du scanner…</p>
    </main>
  ),
});

export default function ScanPageClientWrapper() {
  return <ScanPageClient />;
}

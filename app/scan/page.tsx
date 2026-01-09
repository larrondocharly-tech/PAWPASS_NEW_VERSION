"use client";

import React, { Suspense } from "react";
import ScanInner from "./scan-inner";

export const dynamic = "force-dynamic";

export default function ScanPage() {
  return (
    <Suspense fallback={<p>Chargement…</p>}>
      <ScanInner />
    </Suspense>
  );
}

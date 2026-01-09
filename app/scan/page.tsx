'use client';

import React, { Suspense } from "react";
import ScanInner from "./scan-inner";

// Scanner style
const scannerStyle = {
  width: '100%',
  maxWidth: 400,
};

export default function ScanPage() {
  return (
    <Suspense fallback={<p>Chargement...</p>}>
      <ScanInner />
    </Suspense>
  );
}

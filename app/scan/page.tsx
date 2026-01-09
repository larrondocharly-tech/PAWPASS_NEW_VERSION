"use client";

import React, { Suspense } from "react";
import ScanInner from "./scan-inner";

<<<<<<< Updated upstream
// Scanner style
const scannerStyle = {
  width: '100%',
  maxWidth: 400,
};
=======
export const dynamic = "force-dynamic";
>>>>>>> Stashed changes

export default function ScanPage() {
  return (
    <Suspense fallback={<p>Chargement...</p>}>
      <ScanInner />
    </Suspense>
  );
}

"use client";

import { useSearchParams } from 'next/navigation';
export const dynamic = "force-dynamic";





export default function ScanPageClient() {
  const searchParams = useSearchParams();

  // ⬇️ COLLE ICI le contenu actuel de ton app/scan/page.tsx
  // (tout ton JSX, toute ta logique, tout)
  return (
    <div>
      {/* ton contenu */}
    </div>
  );
}

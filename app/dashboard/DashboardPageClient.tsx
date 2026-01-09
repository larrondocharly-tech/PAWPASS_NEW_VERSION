"use client";

import { useSearchParams } from 'next/navigation';
export const dynamic = "force-dynamic";





export default function DashboardPageClient() {
  const searchParams = useSearchParams();

  // ⬇️ COLLE le contenu actuel de dashboard/page.tsx
  return (
    <div>
      {/* ton dashboard */}
    </div>
  );
}

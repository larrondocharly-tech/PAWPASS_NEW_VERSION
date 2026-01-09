'use client';

import { useSearchParams } from 'next/navigation';

export default function DashboardPageClient() {
  const searchParams = useSearchParams();

  // ⬇️ COLLE le contenu actuel de dashboard/page.tsx
  return (
    <div>
      {/* ton dashboard */}
    </div>
  );
}

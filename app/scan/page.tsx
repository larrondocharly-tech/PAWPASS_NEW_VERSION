import { Suspense } from 'react';
import ScanPageClient from './ScanPageClient';

export default function ScanPage() {
  return (
    <Suspense fallback={<p>Chargement...</p>}>
      <ScanPageClient />
    </Suspense>
  );
}

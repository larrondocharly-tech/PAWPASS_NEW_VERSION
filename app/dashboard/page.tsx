import { Suspense } from 'react';
import DashboardPageClient from './DashboardPageClient';

export default function DashboardPage() {
  return (
    <Suspense fallback={<p>Chargement...</p>}>
      <DashboardPageClient />
    </Suspense>
  );
}

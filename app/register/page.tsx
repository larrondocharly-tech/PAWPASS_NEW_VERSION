'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AuthForm from '@/components/AuthForm';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const pendingMerchantCode = searchParams.get('pendingMerchantCode');
  const pendingAmountParam = searchParams.get('pendingAmount');
  const pendingSpaIdParam = searchParams.get('pendingSpaId');
  const pendingDonationPercentParam = searchParams.get('pendingDonationPercent');
  const pendingCashback =
    pendingMerchantCode && pendingAmountParam
      ? {
          merchantCode: pendingMerchantCode,
          amount: Number.parseFloat(pendingAmountParam),
          spaId: pendingSpaIdParam && pendingSpaIdParam !== '' ? pendingSpaIdParam : null,
          donationPercent: pendingDonationPercentParam
            ? Number.parseInt(pendingDonationPercentParam, 10)
            : 0
        }
      : null;

  return (
    <div className="container">
      <Link href="/">← Retour</Link>
      <AuthForm mode="register" pendingCashback={pendingCashback} />
      <p style={{ marginTop: 16 }}>
        Déjà un compte ? <Link href="/login">Se connecter</Link>
      </p>
    </div>
  );
}

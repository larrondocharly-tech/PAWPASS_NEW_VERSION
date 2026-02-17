export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import BankCallbackClient from "./BankCallbackClient";

export default function BankCallbackPage() {
  return (
    <Suspense fallback={<main style={{ padding: 20 }}>Connexion en cours…</main>}>
      <BankCallbackClient />
    </Suspense>
  );
}

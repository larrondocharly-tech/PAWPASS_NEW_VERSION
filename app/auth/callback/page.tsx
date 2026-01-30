import { Suspense } from "react";
import CallbackClient from "./CallbackClient";

export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Connexion en cours…</div>}>
      <CallbackClient />
    </Suspense>
  );
}

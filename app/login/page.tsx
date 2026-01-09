export const dynamic = "force-dynamic";
import Link from 'next/link';
import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-start pt-10 px-4">
      <div className="w-full max-w-xl">
        <Link href="/" className="text-sm text-emerald-500 hover:underline">
          ← Retour
        </Link>

        <h1 className="mt-4 text-3xl font-semibold text-slate-900">
          Connexion
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Retrouvez votre cagnotte PawPass et vos dons aux refuges.
        </p>

        <AuthForm mode="login" />

        <p className="mt-4 text-sm text-slate-600">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-emerald-500 font-medium hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </main>
  );
}

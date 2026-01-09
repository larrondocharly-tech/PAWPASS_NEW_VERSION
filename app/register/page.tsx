import Link from 'next/link';
import AuthForm from '@/components/AuthForm';

export default function RegisterPage() {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-start pt-10 px-4">
      <div className="w-full max-w-xl">
        <Link href="/" className="text-sm text-emerald-500 hover:underline">
          ← Retour
        </Link>

        <h1 className="mt-4 text-3xl font-semibold text-slate-900">
          Créer un compte
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Gagnez du cashback chez les commerçants partenaires et soutenez les
          refuges locaux.
        </p>

        <AuthForm mode="register" />

        <p className="mt-4 text-sm text-slate-600">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-emerald-500 font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}

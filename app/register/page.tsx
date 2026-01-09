import AuthForm from '@/components/AuthForm';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Créer un compte</h1>

      <AuthForm mode="register" />

      <p className="mt-4 text-sm">
        Déjà un compte ?{' '}
        <Link href="/login" className="underline">
          Se connecter
        </Link>
      </p>
    </main>
  );
}

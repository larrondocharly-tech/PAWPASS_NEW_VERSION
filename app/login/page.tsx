import Link from 'next/link';
import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <div className="container">
      <Link href="/">← Retour</Link>
      <AuthForm mode="login" />
      <p style={{ marginTop: 16 }}>
        Pas encore de compte ? <Link href="/register">Créer un compte</Link>
      </p>
    </div>
  );
}

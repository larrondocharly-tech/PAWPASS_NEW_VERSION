import Link from 'next/link';
import AuthForm from '@/components/AuthForm';

export default function RegisterPage() {
  return (
    <div className="container">
      <Link href="/">← Retour</Link>
      <AuthForm mode="register" />
      <p style={{ marginTop: 16 }}>
        Déjà un compte ? <Link href="/login">Se connecter</Link>
      </p>
    </div>
  );
}

import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <main className="container mx-auto max-w-4xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard Admin PawPass</h1>
        <p className="mt-2 text-sm text-slate-600">
          Accédez rapidement aux statistiques principales et aux sections dédiées aux commerçants et refuges.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
          href="/admin/merchants"
        >
          <h3 className="text-lg font-semibold">Voir les commerçants</h3>
          <p className="mt-1 text-sm text-slate-600">Consulter les statistiques détaillées des commerçants.</p>
        </Link>
        <Link
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
          href="/admin/refuges"
        >
          <h3 className="text-lg font-semibold">Voir les refuges</h3>
          <p className="mt-1 text-sm text-slate-600">Consulter les statistiques détaillées des refuges.</p>
        </Link>
      </section>
    </main>
  );
}

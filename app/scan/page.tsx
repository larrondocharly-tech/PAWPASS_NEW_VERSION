export default function ScanPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-6 text-center space-y-3">
        <h1 className="text-2xl font-semibold text-slate-900">
          Scanner un commerçant
        </h1>
        <p className="text-sm text-slate-600">
          La fonctionnalité de scan n&apos;est pas encore activée sur cette
          version en ligne de PawPass.
        </p>
        <p className="text-sm text-slate-600">
          Vous pouvez déjà créer un compte, vous connecter, voir votre tableau
          de bord, vos transactions, les commerçants partenaires, les mentions
          légales, etc.
        </p>
      </div>
    </main>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-slate-400">404</p>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">Página no encontrada</h1>
      <p className="mt-2 text-sm text-slate-500">
        La dirección que buscas no existe o fue movida.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}

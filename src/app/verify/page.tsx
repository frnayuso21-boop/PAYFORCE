import { redirect } from "next/navigation";

/**
 * Ruta legacy: el flujo MFA vive en /login/2fa.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const sp = await searchParams;
  const from = sp.from ?? "/app/dashboard";
  redirect(`/login/2fa?from=${encodeURIComponent(from)}`);
}

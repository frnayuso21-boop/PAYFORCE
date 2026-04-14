import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, AlertCircle } from "lucide-react";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pago completado — PayForce" };

interface Props {
  searchParams: Promise<{ payment_intent?: string }>;
}

export default async function SuccessPage({ searchParams }: Props) {
  const { payment_intent } = await searchParams;

  // Verificar estado real contra Stripe — evita mostrar éxito en accesos directos
  let verified = false;
  if (payment_intent) {
    try {
      const pi = await stripe.paymentIntents.retrieve(payment_intent);
      verified = pi.status === "succeeded";
    } catch {
      verified = false;
    }
  }

  if (!verified) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <div className="flex w-full max-w-xs flex-col items-center text-center">
          <Image
            src="/logo-payforce.png"
            alt="PayForce"
            width={260}
            height={74}
            priority
            className="mb-12 object-contain"
          />
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
            <AlertCircle className="h-9 w-9 text-amber-500" />
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
            No se pudo verificar el pago
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Comprueba tu email o contacta con soporte.
          </p>
          <Link
            href="/checkout"
            className="mt-10 flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            Volver al checkout
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="flex w-full max-w-xs flex-col items-center text-center">

        <Image
          src="/logo-payforce.png"
          alt="PayForce"
          width={260}
          height={74}
          priority
          className="mb-12 object-contain"
        />

        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#5cb87a]">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
          Pagado
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Tu pago se ha procesado correctamente
        </p>

        <Link
          href="/app/dashboard"
          className="mt-10 flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
        >
          Ir al dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>

        <div className="mt-12 flex items-center gap-1.5">
          <span className="text-[11px] text-slate-300">Powered by</span>
          <Image
            src="/logo-payforce.png"
            alt="PayForce"
            width={56}
            height={16}
            className="object-contain opacity-30"
          />
        </div>

      </div>
    </main>
  );
}

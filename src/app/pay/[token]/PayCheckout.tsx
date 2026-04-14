"use client";

import { useState, useEffect } from "react";
import { loadStripe }          from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { formatCurrency } from "@/lib/utils";
import { Lock, CreditCard } from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// ─── Skeleton de carga ────────────────────────────────────────────────────────

function CheckoutSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Apple Pay / Google Pay skeleton */}
      <div className="h-14 w-full rounded-2xl bg-slate-900/10" />
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-100" />
        <div className="h-3 w-24 rounded bg-slate-100" />
        <div className="h-px flex-1 bg-slate-100" />
      </div>
      {/* Card form skeleton */}
      <div className="space-y-3 rounded-2xl border border-slate-100 p-5">
        <div className="h-3 w-16 rounded bg-slate-100" />
        <div className="h-11 w-full rounded-xl bg-slate-100" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-11 rounded-xl bg-slate-100" />
          <div className="h-11 rounded-xl bg-slate-100" />
        </div>
      </div>
      <div className="h-14 w-full rounded-2xl bg-slate-100" />
    </div>
  );
}

// ─── Formulario de pago ───────────────────────────────────────────────────────

function CheckoutForm({
  token,
  amount,
  currency,
  customerEmail,
}: {
  token:          string;
  amount:         number;
  currency:       string;
  customerEmail?: string | null;
}) {
  const stripe   = useStripe();
  const elements = useElements();

  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [hasExpress,    setHasExpress]    = useState(false);
  const [expressReady,  setExpressReady]  = useState(false);
  const [cardVisible,   setCardVisible]   = useState(false);

  const returnUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/pay/${token}`
      : `/pay/${token}`;

  // ── Express Checkout: Apple Pay / Google Pay ───────────────────────────────
  const handleExpressConfirm = async (
    event: Parameters<
      NonNullable<React.ComponentProps<typeof ExpressCheckoutElement>["onConfirm"]>
    >[0],
  ) => {
    if (!stripe || !elements) { event.paymentFailed({ reason: "fail" }); return; }
    const { error: err } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        ...(customerEmail ? { receipt_email: customerEmail } : {}),
      },
    });
    if (err) {
      event.paymentFailed({ reason: "fail" });
      setError(err.message ?? "Error al procesar el pago");
    }
  };

  // ── Pago con tarjeta ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        ...(customerEmail ? { receipt_email: customerEmail } : {}),
      },
    });
    if (stripeError) {
      setError(stripeError.message ?? "Error al procesar el pago");
      setLoading(false);
    }
  };

  const amountFmt = formatCurrency(amount / 100, currency);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* ── Express Checkout (Apple Pay / Google Pay) ─────────────────────── */}
      {/* Siempre montado para que Stripe detecte métodos disponibles */}
      <div className={expressReady ? "block" : "hidden"}>
        <ExpressCheckoutElement
          onReady={({ availablePaymentMethods }) => {
            setExpressReady(true);
            setHasExpress(availablePaymentMethods !== null);
            // Si no hay Apple Pay ni Google Pay, mostrar tarjeta directamente
            if (availablePaymentMethods === null) setCardVisible(true);
          }}
          onConfirm={handleExpressConfirm}
          options={{
            buttonType:  { applePay: "plain", googlePay: "pay" },
            buttonTheme: { applePay: "black", googlePay: "black" },
            buttonHeight: 52,
            paymentMethods: {
              applePay:  "always",
              googlePay: "always",
              link:      "never",
              paypal:    "never",
              amazonPay: "never",
            },
            layout: { maxColumns: 1, maxRows: 2, overflow: "never" },
          }}
        />
      </div>

      {/* Skeleton mientras Stripe carga */}
      {!expressReady && <CheckoutSkeleton />}

      {/* ── Divider + toggle tarjeta ──────────────────────────────────────── */}
      {expressReady && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-100" />
          <button
            type="button"
            onClick={() => setCardVisible((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          >
            <CreditCard className="h-3 w-3" />
            {cardVisible ? "Ocultar tarjeta" : (hasExpress ? "Pagar con tarjeta" : "Pagar con tarjeta")}
          </button>
          <div className="h-px flex-1 bg-slate-100" />
        </div>
      )}

      {/* ── Payment Element (tarjeta) — se muestra al pulsar o si no hay Express ── */}
      {expressReady && cardVisible && (
        <>
          <PaymentElement
            options={{
              layout: "tabs",
              paymentMethodOrder: ["card"],
              defaultValues: { billingDetails: { email: customerEmail ?? "" } },
            }}
          />

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              <span className="mt-0.5 text-base leading-none">⚠</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!stripe || loading}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[15px] font-bold text-white transition-all hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Procesando…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 opacity-70" />
                Pagar {amountFmt}
              </>
            )}
          </button>
        </>
      )}

      {/* Error en Express Checkout */}
      {expressReady && !cardVisible && error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span className="mt-0.5 text-base leading-none">⚠</span>
          {error}
        </div>
      )}
    </form>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface PayCheckoutProps {
  clientSecret:   string;
  token:          string;
  amount:         number;
  currency:       string;
  description?:   string | null;
  customerEmail?: string | null;
  customerName?:  string | null;
}

export function PayCheckout({
  clientSecret,
  token,
  amount,
  currency,
  customerEmail,
}: PayCheckoutProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  if (!ready) return <CheckoutSkeleton />;

  return (
    <div className="w-full">
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          loader: "auto",
          appearance: {
            theme: "stripe",
            variables: {
              fontFamily:       "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              borderRadius:     "12px",
              colorPrimary:     "#0f172a",
              colorBackground:  "#ffffff",
              colorText:        "#1e293b",
              colorDanger:      "#ef4444",
              spacingUnit:      "4px",
              fontSizeBase:     "14px",
            },
            rules: {
              ".Input":              { padding: "14px", fontSize: "15px" },
              ".Input:focus":        { boxShadow: "0 0 0 2px rgba(15,23,42,0.15)" },
              ".Label":              { fontWeight: "500", color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" },
              ".Tab":                { borderRadius: "10px", padding: "10px 14px" },
              ".Tab--selected":      { backgroundColor: "#0f172a", color: "#ffffff" },
              ".p-Logo":             { display: "none" },
              ".p-Logo-img":         { display: "none" },
              ".p-TermsText":        { display: "none" },
              "[class*='powered']":  { display: "none" },
            },
          },
        }}
      >
        <CheckoutForm
          token={token}
          amount={amount}
          currency={currency}
          customerEmail={customerEmail}
        />
      </Elements>
    </div>
  );
}

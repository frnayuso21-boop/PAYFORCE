"use client";

import { useState }       from "react";
import { loadStripe }     from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Lock }           from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ─── Formulario interno ───────────────────────────────────────────────────────

function InnerForm({ amount, currency }: { amount: number; currency: string }) {
  const stripe   = useStripe();
  const elements = useElements();

  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [hasExpress, setHasExpress] = useState(false);

  const returnUrl =
    typeof window !== "undefined" ? `${window.location.origin}/success` : "/success";

  const handleExpressConfirm = async (
    event: Parameters<
      NonNullable<React.ComponentProps<typeof ExpressCheckoutElement>["onConfirm"]>
    >[0],
  ) => {
    if (!stripe || !elements) {
      event.paymentFailed({ reason: "fail" });
      return;
    }
    const { error: err } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    if (err) {
      event.paymentFailed({ reason: "fail" });
      setError(err.message ?? "Error al procesar el pago");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    if (stripeError) {
      setError(stripeError.message ?? "Error al procesar el pago");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ExpressCheckoutElement
        onReady={({ availablePaymentMethods }) =>
          setHasExpress(availablePaymentMethods !== null)
        }
        onConfirm={handleExpressConfirm}
        options={{
          buttonType:  { applePay: "buy", googlePay: "buy", paypal: "buynow", klarna: "pay" },
          buttonTheme: { applePay: "black", googlePay: "black" },
          paymentMethods: {
            applePay:  "always",
            googlePay: "always",
            link:      "auto",
            paypal:    "auto",
            klarna:    "auto",
            amazonPay: "auto",
          },
          layout: { maxColumns: 2, maxRows: 1, overflow: "auto" },
        }}
      />

      {hasExpress && (
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-slate-100" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            o paga con tarjeta
          </span>
          <div className="flex-1 border-t border-slate-100" />
        </div>
      )}

      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Procesando…
          </>
        ) : (
          `Pagar ${formatCurrency(amount, currency)}`
        )}
      </button>

      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Lock className="h-3 w-3" />
        Pago seguro con PayForce
      </div>
    </form>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CheckoutFormProps {
  amount:       number;   // céntimos
  currency:     string;
  clientSecret: string;   // obtenido desde el servidor antes de renderizar este componente
}

export function CheckoutForm({ amount, currency, clientSecret }: CheckoutFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        loader: "auto",
        appearance: {
          theme: "stripe",
          variables: {
            fontFamily:         "Inter, system-ui, sans-serif",
            borderRadius:       "10px",
            colorPrimary:       "#0f172a",
            colorBackground:    "#ffffff",
            colorText:          "#0f172a",
            colorTextSecondary: "#64748b",
          },
        },
      }}
    >
      <InnerForm amount={amount / 100} currency={currency} />
    </Elements>
  );
}

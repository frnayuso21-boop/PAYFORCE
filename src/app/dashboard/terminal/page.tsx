"use client";

import { useEffect, useState, useCallback } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  CreditCard, Loader2, CheckCircle2, XCircle, ShieldCheck,
  Phone, Clock, MessageCircle,
} from "lucide-react";

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

const BRAND_LABEL: Record<string, string> = {
  visa: "Visa", mastercard: "Mastercard", amex: "Amex",
  discover: "Discover", diners: "Diners", jcb: "JCB",
  unionpay: "UnionPay", unknown: "",
};

function centsFromEurosInput(raw: string): number {
  const n = parseFloat(raw.replace(",", "."));
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function formatMoney(cents: number, cur = "EUR") {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: cur }).format(cents / 100);
}

type HistoryRow = {
  id: string; date: string; customer: string;
  amount: number; currency: string; status: string; description: string;
};

function TerminalForm({
  stripeAccountId,
  onHistoryRefresh,
}: {
  stripeAccountId: string;
  onHistoryRefresh: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();

  const [amountStr,   setAmountStr]   = useState("");
  const [description, setDescription] = useState("");
  const [email,       setEmail]       = useState("");
  const [name,        setName]        = useState("");
  const [phone,       setPhone]       = useState("");
  const [saveCard,    setSaveCard]    = useState(false);
  const [cardOk,      setCardOk]      = useState(false);
  const [brand,       setBrand]       = useState<string | null>(null);
  const [busy,        setBusy]        = useState(false);
  const [busyWa,      setBusyWa]      = useState(false);
  const [result,      setResult]      = useState<"ok" | "err" | null>(null);
  const [resultMsg,   setResultMsg]   = useState("");

  const cents = centsFromEurosInput(amountStr);
  const canSubmit =
    cents >= 50 &&
    description.trim().length > 0 &&
    cardOk && stripe &&
    (!saveCard || name.trim().length > 0 || email.trim().length > 0);

  const canWhatsApp = cents >= 50 && description.trim().length > 0;

  const sendWhatsApp = useCallback(async () => {
    if (!canWhatsApp) return;
    setBusyWa(true);
    setResult(null);
    setResultMsg("");
    try {
      const res = await fetch("/api/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount:        cents,
          currency:      "eur",
          description:   description.trim(),
          customerEmail: email.trim() || undefined,
          customerName:  name.trim()  || undefined,
          customerPhone: phone.trim() || undefined,
        }),
      });
      const data = await res.json() as { url?: string; token?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "No se pudo crear el link");

      const amountFormatted = formatMoney(cents);
      const concept         = description.trim();
      const paymentUrl      = data.url;
      const msg = encodeURIComponent(
        `Hola${name.trim() ? ` ${name.trim()}` : ""}! Aquí tienes tu enlace de pago de ${amountFormatted} para ${concept}:\n\n${paymentUrl}\n\nPuedes pagar de forma segura con tarjeta. Gracias!`
      );

      const rawPhone = phone.trim().replace(/\s+/g, "");
      const waUrl = rawPhone
        ? `https://wa.me/${rawPhone.startsWith("+") ? rawPhone.slice(1) : rawPhone}?text=${msg}`
        : `https://wa.me/?text=${msg}`;
      window.open(waUrl, "_blank");

      setResult("ok");
      setResultMsg("Link de pago creado y WhatsApp abierto");
      onHistoryRefresh();
    } catch (e) {
      setResult("err");
      setResultMsg(e instanceof Error ? e.message : "Error al crear el link");
    } finally {
      setBusyWa(false);
    }
  }, [canWhatsApp, cents, description, email, name, phone, onHistoryRefresh]);

  const submit = useCallback(async () => {
    if (!stripe || !elements || !canSubmit) return;
    const card = elements.getElement(CardElement);
    if (!card) return;

    setBusy(true);
    setResult(null);
    setResultMsg("");

    try {
      const { error: pmErr, paymentMethod } = await stripe.createPaymentMethod({
        type: "card", card,
        billing_details: {
          name:  name.trim() || undefined,
          email: email.trim() || undefined,
        },
      });
      if (pmErr || !paymentMethod) throw new Error(pmErr?.message ?? "No se pudo leer la tarjeta");

      const res = await fetch("/api/dashboard/terminal/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          amount:          cents,
          description:     description.trim(),
          customerEmail:   email.trim() || undefined,
          customerName:    name.trim() || undefined,
          saveCard,
        }),
      });

      const data = await res.json() as {
        ok?: boolean; error?: string;
        requiresAction?: boolean; clientSecret?: string; paymentIntentId?: string;
      };

      if (data.requiresAction && data.clientSecret) {
        const { error: cErr, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret);
        if (cErr) throw new Error(cErr.message);
        if (paymentIntent?.status === "succeeded" && paymentIntent.id) {
          await fetch("/api/dashboard/terminal/finalize", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
          });
        }
        setResult("ok"); setResultMsg("Cobro completado");
        onHistoryRefresh();
        setAmountStr(""); setDescription(""); setSaveCard(false);
        card.clear(); setCardOk(false); setBusy(false);
        return;
      }

      if (!res.ok) throw new Error(data.error ?? "Error al cobrar");

      if (data.ok) {
        setResult("ok"); setResultMsg("Cobro completado");
        onHistoryRefresh();
        setAmountStr(""); setDescription(""); setSaveCard(false);
        card.clear(); setCardOk(false);
      } else {
        throw new Error("Respuesta inesperada");
      }
    } catch (e) {
      setResult("err");
      setResultMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }, [stripe, elements, canSubmit, cents, description, email, name, saveCard, onHistoryRefresh]);

  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-6 pt-6 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
            <Phone className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 leading-tight">Cobro por teléfono</h2>
            <p className="text-xs text-slate-400 mt-0.5">Terminal · {stripeAccountId.slice(0, 14)}…</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Columna izquierda — datos del cobro */}
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Importe <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400 text-lg font-medium">€</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-3 text-xl font-semibold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
                />
              </div>
              {cents > 0 && cents < 50 && (
                <p className="mt-1.5 text-xs text-amber-500">Mínimo 0,50 €</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Concepto <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Descripción del cobro"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="opcional"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Nombre
                </label>
                <input
                  type="text"
                  placeholder="opcional"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
                />
              </div>
            </div>

            {/* Teléfono para WhatsApp */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Teléfono WhatsApp <span className="normal-case font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400 text-sm font-medium select-none">+34</span>
                <input
                  type="tel"
                  placeholder="612 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-12 pr-4 py-3 text-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-50"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Con o sin prefijo. Si lo dejas vacío, elige el contacto en WhatsApp.</p>
            </div>
          </div>

          {/* Columna derecha — tarjeta */}
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Tarjeta <span className="text-rose-400">*</span>
                </label>
                {brand && BRAND_LABEL[brand] && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {BRAND_LABEL[brand]}
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-50">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: "15px",
                        color: "#0f172a",
                        fontFamily: "ui-sans-serif, system-ui, sans-serif",
                        letterSpacing: "0.01em",
                        "::placeholder": { color: "#cbd5e1" },
                      },
                      invalid: { color: "#f43f5e" },
                    },
                    hidePostalCode: true,
                  }}
                  onChange={(e) => {
                    setCardOk(e.complete && !e.error);
                    if (e.error) setResult(null);
                    if (e.brand) setBrand(e.brand);
                  }}
                />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                Cifrado TLS · procesado por Stripe PCI-DSS
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3.5 transition hover:border-slate-200">
              <input
                type="checkbox"
                checked={saveCard}
                onChange={(e) => setSaveCard(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-indigo-600"
              />
              <span className="text-[13px] text-slate-600 leading-snug">
                <span className="font-medium text-slate-800">Guardar tarjeta</span> para cobros futuros.
                Requiere nombre o email del cliente.
              </span>
            </label>
          </div>
        </div>

        {/* Resultado */}
        {result && (
          <div className={`mt-5 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
            result === "ok"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
              : "bg-rose-50 text-rose-700 border border-rose-100"
          }`}>
            {result === "ok"
              ? <CheckCircle2 className="h-4 w-4 shrink-0" />
              : <XCircle     className="h-4 w-4 shrink-0" />
            }
            {resultMsg}
          </div>
        )}

        {/* Botones de acción */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            disabled={!canSubmit || busy || busyWa}
            onClick={() => void submit()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy
              ? <Loader2    className="h-4 w-4 animate-spin" />
              : <CreditCard className="h-4 w-4" />
            }
            {cents >= 50 ? `Cobrar ${formatMoney(cents)}` : "Cobrar ahora"}
          </button>

          <button
            type="button"
            disabled={!canWhatsApp || busyWa || busy}
            onClick={() => void sendWhatsApp()}
            title="Crear link de pago y enviar por WhatsApp"
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busyWa
              ? <Loader2        className="h-4 w-4 animate-spin" />
              : <MessageCircle  className="h-4 w-4" />
            }
            WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardTerminalPage() {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [bootstrapErr, setBootstrapErr]       = useState<string | null>(null);
  const [loadingBoot,  setLoadingBoot]        = useState(true);
  const [history,      setHistory]            = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading]   = useState(true);

  const loadHistory = useCallback(() => {
    fetch("/api/dashboard/terminal/history?limit=40")
      .then((r) => r.json())
      .then((d) => setHistory((d as { data?: HistoryRow[] }).data ?? []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    if (!pk) { setBootstrapErr("Falta NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"); setLoadingBoot(false); return; }
    fetch("/api/dashboard/terminal/bootstrap")
      .then((r) => r.json())
      .then((d: { ready?: boolean; stripeAccountId?: string; error?: string; message?: string }) => {
        if (d.error) { setBootstrapErr(d.error); return; }
        if (!d.ready || !d.stripeAccountId) { setBootstrapErr(d.message ?? "Terminal no disponible"); return; }
        setStripeAccountId(d.stripeAccountId);
        setStripePromise(loadStripe(pk, { stripeAccount: d.stripeAccountId }));
      })
      .catch(() => setBootstrapErr("No se pudo cargar la configuración"))
      .finally(() => setLoadingBoot(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Título de sección */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
          <Phone className="h-4 w-4 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-[17px] font-semibold text-slate-900 leading-tight">Terminal virtual</h1>
          <p className="text-[12px] text-slate-400">Cobro manual por teléfono · MOTO</p>
        </div>
      </div>

      <div className="space-y-6">

        {/* ── Formulario de cobro ──────────────────────────────────────────── */}
        {loadingBoot && (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-slate-400 text-sm gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando terminal…
          </div>
        )}

        {!loadingBoot && bootstrapErr && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            {bootstrapErr}
          </div>
        )}

        {!loadingBoot && stripePromise && stripeAccountId && (
          <Elements stripe={stripePromise} options={{ locale: "es" }}>
            <TerminalForm stripeAccountId={stripeAccountId} onHistoryRefresh={loadHistory} />
          </Elements>
        )}

        {/* ── Historial ── */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50">
              <Clock className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900 leading-tight">Historial de cobros</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Últimos cobros realizados desde este terminal</p>
            </div>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : history.length === 0 ? (
            <div className="py-14 text-center">
              <CreditCard className="mx-auto mb-3 h-8 w-8 text-slate-200" />
              <p className="text-sm text-slate-400">Aún no hay cobros registrados desde este terminal.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-3 font-semibold text-slate-500">Fecha</th>
                    <th className="px-5 py-3 font-semibold text-slate-500">Cliente</th>
                    <th className="px-5 py-3 font-semibold text-slate-500">Importe</th>
                    <th className="px-5 py-3 font-semibold text-slate-500">Estado</th>
                    <th className="px-5 py-3 font-semibold text-slate-500">Concepto</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/40 transition">
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-400 tabular-nums">
                        {new Date(row.date).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-700">{row.customer}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 tabular-nums">
                        {formatMoney(row.amount, row.currency.toUpperCase())}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Cobrado
                        </span>
                      </td>
                      <td className="max-w-[180px] truncate px-5 py-3.5 text-slate-500" title={row.description}>
                        {row.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

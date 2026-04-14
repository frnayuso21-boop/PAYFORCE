"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  Plus, X, Loader2, CheckCircle2, RefreshCw,
  Calendar, User, Package, Zap, FileText, CreditCard,
} from "lucide-react";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { cn } from "@/lib/utils";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type PriceType = "fixed" | "variable";
type Interval  = "month" | "week" | "year";

interface Sub {
  id: string; status: string; priceType: string; interval?: string;
  amount?: number; currency?: string; productName?: string;
  customerEmail?: string; customerName?: string;
  currentPeriodEnd: string; trialEnd?: string | null; cancelAt?: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  active:   "text-emerald-600 bg-emerald-50",
  trialing: "text-blue-600 bg-blue-50",
  past_due: "text-amber-600 bg-amber-50",
  canceled: "text-slate-400 bg-slate-100",
  incomplete: "text-amber-600 bg-amber-50",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Activa", trialing: "Prueba", past_due: "Pago pendiente",
  canceled: "Cancelada", incomplete: "Incompleta",
};

/* ─── Payment setup form ───────────────────────────────────────────────── */
function SetupForm({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true); setError("");
    const { error: err } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/app/subscriptions?success=1` },
    });
    if (err) { setError(err.message ?? "Error"); setLoading(false); }
    else onSuccess();
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-[13px] text-red-500">{error}</p>}
      <button type="submit" disabled={loading || !stripe}
        className="w-full h-[52px] rounded-2xl bg-slate-900 text-white font-bold text-[16px] disabled:opacity-40 flex items-center justify-center gap-2">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Activar suscripción"}
      </button>
    </form>
  );
}

export default function SubscriptionsPage() {
  const [subs,        setSubs]        = useState<Sub[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [clientSecret,setClientSecret]= useState("");
  const [creating,    setCreating]    = useState(false);
  const [created,     setCreated]     = useState(false);
  const [formError,   setFormError]   = useState("");

  // Cargo variable
  const [chargeSubId,    setChargeSubId]    = useState<string | null>(null);
  const [chargeAmount,   setChargeAmount]   = useState("");
  const [chargeDesc,     setChargeDesc]     = useState("");
  const [chargePeriod,   setChargePeriod]   = useState({ start: "", end: "" });
  const [chargingLoading,setChargingLoading]= useState(false);
  const [chargeError,    setChargeError]    = useState("");
  const [chargeOk,       setChargeOk]       = useState("");

  // Form state
  const [customerEmail,       setCustomerEmail]       = useState("");
  const [customerName,        setCustomerName]        = useState("");
  const [productName,         setProductName]         = useState("");
  const [description,         setDescription]         = useState("");
  const [statementDescriptor, setStatementDescriptor] = useState("");
  const [priceType,           setPriceType]           = useState<PriceType>("fixed");
  const [amountStr,           setAmountStr]           = useState("");
  const [interval,            setInterval]            = useState<Interval>("month");
  const [trialDays,           setTrialDays]           = useState("");

  async function loadSubs() {
    setLoadingSubs(true);
    try {
      const res  = await fetch("/api/subscriptions");
      const data = await res.json();
      setSubs(data.data ?? []);
    } finally {
      setLoadingSubs(false);
    }
  }
  useEffect(() => { loadSubs(); }, []);

  async function handleCreate() {
    setFormError("");
    if (!customerEmail) { setFormError("Email del cliente requerido"); return; }
    if (!productName)   { setFormError("Nombre del producto requerido"); return; }
    if (priceType === "fixed" && (!amountStr || Number(amountStr) <= 0))
      { setFormError("Introduce el importe mensual"); return; }

    setCreating(true);
    try {
      const amountCents = priceType === "fixed" ? Math.round(Number(amountStr) * 100) : undefined;
      const res  = await fetch("/api/subscriptions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerEmail, customerName, productName, description,
          statementDescriptor: statementDescriptor || undefined,
          priceType, amount: amountCents, interval,
          trialDays: trialDays ? Number(trialDays) : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.clientSecret) setClientSecret(data.clientSecret);
      else { setCreated(true); setShowCreate(false); loadSubs(); }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error al crear suscripción");
    } finally {
      setCreating(false);
    }
  }

  async function handleVariableCharge() {
    if (!chargeSubId) return;
    const cents = Math.round(Number(chargeAmount) * 100);
    if (!cents || cents < 1) { setChargeError("Introduce un importe válido"); return; }
    if (!chargeDesc)         { setChargeError("Descripción requerida"); return; }
    setChargeError(""); setChargingLoading(true);
    try {
      const period = chargePeriod.start && chargePeriod.end ? {
        start: Math.floor(new Date(chargePeriod.start).getTime() / 1000),
        end:   Math.floor(new Date(chargePeriod.end).getTime()   / 1000),
      } : undefined;
      const res  = await fetch(`/api/subscriptions/${chargeSubId}/charge`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: cents, description: chargeDesc, period }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChargeOk(data.message);
      setChargeSubId(null); setChargeAmount(""); setChargeDesc("");
      setChargePeriod({ start: "", end: "" });
    } catch (e) {
      setChargeError(e instanceof Error ? e.message : "Error");
    } finally {
      setChargingLoading(false);
    }
  }

  const intervalLabel = { month: "mes", week: "semana", year: "año" };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <MobileHeader title="Suscripciones" />

      {/* Header con acción */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <div>
          <p className="text-[13px] text-slate-400">{subs.filter(s=>s.status==="active").length} activas · {subs.length} total</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-[13px] font-semibold text-white active:scale-[0.97]">
          <Plus className="h-4 w-4" /> Nueva
        </button>
      </div>

      {/* Lista */}
      <div className="flex-1 px-4 py-3 space-y-2.5">
        {loadingSubs
          ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-slate-300" /></div>
          : subs.length === 0
            ? <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Calendar className="h-12 w-12 text-slate-200" />
                <p className="text-[16px] font-semibold text-slate-400">Sin suscripciones</p>
                <p className="text-[13px] text-slate-300">Crea la primera suscripción recurrente</p>
                <button onClick={() => setShowCreate(true)}
                  className="mt-2 rounded-xl bg-slate-900 px-5 py-2.5 text-[14px] font-semibold text-white">
                  Crear suscripción
                </button>
              </div>
            : subs.map((s) => (
                <div key={s.id} className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-slate-900 truncate">{s.productName}</p>
                      <p className="text-[12px] text-slate-400 truncate">{s.customerEmail}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", STATUS_COLOR[s.status] ?? "text-slate-500 bg-slate-100")}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[13px] mb-3">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <RefreshCw className="h-3.5 w-3.5" />
                      {s.priceType === "fixed" && s.amount
                        ? `€${(s.amount/100).toFixed(2)} / ${intervalLabel[s.interval as Interval] ?? s.interval}`
                        : `Variable / ${intervalLabel[s.interval as Interval] ?? s.interval}`
                      }
                    </div>
                    <span className="text-slate-300 text-[11px]">
                      Próximo: {new Date(s.currentPeriodEnd).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                  {s.trialEnd && (
                    <p className="mb-2 text-[11px] text-blue-500">
                      Prueba hasta {new Date(s.trialEnd).toLocaleDateString("es-ES")}
                    </p>
                  )}
                  {/* Botón cobro variable — visible siempre para poder añadir cargos extra */}
                  {s.status !== "canceled" && (
                    <button
                      onClick={() => { setChargeSubId(s.id); setChargeDesc(""); setChargeAmount(""); setChargeError(""); }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-50 border border-amber-200 py-2.5 text-[13px] font-semibold text-amber-700 active:bg-amber-100 transition"
                    >
                      <Zap className="h-4 w-4" />
                      {s.priceType === "variable" ? "Registrar consumo del período" : "Añadir cargo extra"}
                    </button>
                  )}
                </div>
              ))
        }
      </div>

      {/* ── Bottom sheet: Crear suscripción ─────────────────────────────── */}
      {(showCreate || clientSecret) && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/40" onClick={() => { setShowCreate(false); setClientSecret(""); }} />
          <div className="fixed bottom-0 left-0 right-0 z-[90] rounded-t-3xl bg-white px-4 pt-4 max-h-[92vh] overflow-y-auto shadow-2xl"
               style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
            <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between mb-5">
              <p className="text-[17px] font-bold text-slate-900">
                {clientSecret ? "Método de pago" : "Nueva suscripción"}
              </p>
              <button onClick={() => { setShowCreate(false); setClientSecret(""); }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            {/* Formulario de pago si ya tenemos clientSecret */}
            {clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <SetupForm clientSecret={clientSecret} onSuccess={() => { setClientSecret(""); setCreated(true); loadSubs(); }} />
              </Elements>
            ) : (
              <div className="space-y-4 pb-4">
                {/* Cliente */}
                <Section icon={<User className="h-4 w-4" />} label="Cliente">
                  <Input placeholder="Email del cliente *" value={customerEmail} onChange={setCustomerEmail} type="email" />
                  <Input placeholder="Nombre (opcional)" value={customerName} onChange={setCustomerName} />
                </Section>

                {/* Producto */}
                <Section icon={<Package className="h-4 w-4" />} label="Producto">
                  <Input placeholder="Nombre del producto *" value={productName} onChange={setProductName} />
                  <Input placeholder="Descripción (opcional)" value={description} onChange={setDescription} />
                  <div>
                    <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                      <CreditCard className="h-4 w-4 text-slate-400 shrink-0" />
                      <input type="text" maxLength={22}
                        placeholder="Extracto bancario del cliente (máx 22 chars)"
                        value={statementDescriptor}
                        onChange={(e) => setStatementDescriptor(e.target.value.toUpperCase())}
                        className="flex-1 bg-transparent text-[13px] font-mono text-slate-900 placeholder:text-slate-400 placeholder:font-sans placeholder:normal-case outline-none" />
                      <span className="text-[10px] text-slate-300 shrink-0">{statementDescriptor.length}/22</span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400 px-1">
                      Aparece en el banco del cliente · ej: PAYFORCE ENERGIA
                    </p>
                  </div>
                </Section>

                {/* Precio */}
                <Section icon={<RefreshCw className="h-4 w-4" />} label="Precio">
                  {/* Tipo: fijo / variable */}
                  <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
                    {(["fixed","variable"] as PriceType[]).map((t) => (
                      <button key={t} onClick={() => setPriceType(t)}
                        className={cn("flex-1 rounded-lg py-2 text-[13px] font-semibold transition-all",
                          priceType === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>
                        {t === "fixed" ? "💰 Precio fijo" : "📊 Variable"}
                      </button>
                    ))}
                  </div>

                  {priceType === "fixed" && (
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                      <span className="text-slate-400 font-medium">€</span>
                      <input type="number" step="0.01" min="0.50" placeholder="0,00" value={amountStr}
                        onChange={(e) => setAmountStr(e.target.value)}
                        className="flex-1 bg-transparent text-[16px] text-slate-900 placeholder:text-slate-300 outline-none" />
                      <span className="text-slate-400 text-[13px]">/ {intervalLabel[interval]}</span>
                    </div>
                  )}

                  {priceType === "variable" && (
                    <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                      <p className="text-[12px] text-blue-600 font-medium">Precio variable (metered billing)</p>
                      <p className="text-[11px] text-blue-400 mt-0.5">Se cobra según el uso registrado cada ciclo. Configura el precio por unidad desde el panel de cobros de PayForce.</p>
                    </div>
                  )}

                  {/* Intervalo */}
                  <div className="flex gap-2">
                    {(["week","month","year"] as Interval[]).map((i) => (
                      <button key={i} onClick={() => setInterval(i)}
                        className={cn("flex-1 rounded-xl py-2.5 text-[13px] font-semibold border transition-all",
                          interval === i ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200")}>
                        {i === "week" ? "Semanal" : i === "month" ? "Mensual" : "Anual"}
                      </button>
                    ))}
                  </div>

                  {/* Días de prueba */}
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                    <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                    <input type="number" min="0" max="90" placeholder="Días de prueba gratis (opcional)"
                      value={trialDays} onChange={(e) => setTrialDays(e.target.value)}
                      className="flex-1 bg-transparent text-[14px] text-slate-900 placeholder:text-slate-400 outline-none" />
                  </div>
                </Section>

                {formError && <p className="text-[13px] text-red-500 text-center">{formError}</p>}

                <button onClick={handleCreate} disabled={creating}
                  className="w-full h-[54px] rounded-2xl bg-slate-900 text-white text-[16px] font-bold disabled:opacity-40 flex items-center justify-center gap-2">
                  {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : "Crear suscripción →"}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Bottom sheet: Cargo variable ──────────────────────────────── */}
      {chargeSubId && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/40" onClick={() => setChargeSubId(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[90] rounded-t-3xl bg-white px-4 pt-4 shadow-2xl"
               style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
            <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[17px] font-bold text-slate-900">Añadir cargo</p>
                <p className="text-[12px] text-slate-400 mt-0.5">Se incluirá en la próxima factura</p>
              </div>
              <button onClick={() => setChargeSubId(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-3 pb-2">
              {/* Importe */}
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <span className="text-slate-400 font-medium text-[16px]">€</span>
                <input type="number" step="0.01" min="0.01" placeholder="0,00"
                  value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)}
                  className="flex-1 bg-transparent text-[22px] font-bold text-slate-900 placeholder:text-slate-300 outline-none" />
              </div>

              {/* Descripción — aparece en la factura */}
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                <input type="text" placeholder="Descripción en factura *  (ej: Consumo eléctrico dic 2024)"
                  value={chargeDesc} onChange={(e) => setChargeDesc(e.target.value)} maxLength={200}
                  className="flex-1 bg-transparent text-[14px] text-slate-900 placeholder:text-slate-400 outline-none" />
              </div>

              {/* Período de consumo */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                  Período de consumo (opcional)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
                    <p className="text-[10px] text-slate-400 mb-0.5">Desde</p>
                    <input type="date" value={chargePeriod.start}
                      onChange={(e) => setChargePeriod(p => ({ ...p, start: e.target.value }))}
                      className="w-full bg-transparent text-[13px] text-slate-700 outline-none" />
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
                    <p className="text-[10px] text-slate-400 mb-0.5">Hasta</p>
                    <input type="date" value={chargePeriod.end}
                      onChange={(e) => setChargePeriod(p => ({ ...p, end: e.target.value }))}
                      className="w-full bg-transparent text-[13px] text-slate-700 outline-none" />
                  </div>
                </div>
              </div>

              {chargeError && <p className="text-[13px] text-red-500">{chargeError}</p>}

              <button onClick={handleVariableCharge} disabled={chargingLoading}
                className="w-full h-[52px] rounded-2xl bg-amber-500 text-white text-[16px] font-bold disabled:opacity-40 flex items-center justify-center gap-2">
                {chargingLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Zap className="h-5 w-5" /> Añadir a próxima factura</>}
              </button>

              <p className="text-[11px] text-slate-400 text-center">
                El cliente será cobrado en su próxima fecha de renovación
              </p>
            </div>
          </div>
        </>
      )}

      {/* Éxito cargo */}
      {chargeOk && (
        <div className="fixed inset-x-4 bottom-24 z-[100] flex items-center gap-3 rounded-2xl bg-amber-500 px-4 py-3.5 shadow-xl">
          <Zap className="h-5 w-5 text-white shrink-0" />
          <p className="text-white font-semibold text-[14px]">{chargeOk}</p>
          <button onClick={() => setChargeOk("")} className="ml-auto"><X className="h-4 w-4 text-white/70" /></button>
        </div>
      )}

      {/* Éxito */}
      {created && (
        <div className="fixed inset-x-4 bottom-20 z-[100] flex items-center gap-3 rounded-2xl bg-emerald-500 px-4 py-3.5 shadow-xl">
          <CheckCircle2 className="h-5 w-5 text-white shrink-0" />
          <p className="text-white font-semibold text-[14px]">Suscripción creada correctamente</p>
          <button onClick={() => setCreated(false)} className="ml-auto"><X className="h-4 w-4 text-white/70" /></button>
        </div>
      )}
    </div>
  );
}

function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-slate-400">{icon}</span>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Input({ placeholder, value, onChange, type = "text" }: {
  placeholder: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 transition" />
  );
}

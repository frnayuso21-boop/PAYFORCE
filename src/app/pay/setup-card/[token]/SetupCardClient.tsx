"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
 Elements,
 PaymentElement,
 useStripe,
 useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface InviteData {
 clientSecret: string;
 customerId: string;
 customer: { name: string; email: string };
 business: { name: string };
 expiresAt: string;
 token: string;
}

// CardForm 
function CardForm({ data }: { data: InviteData }) {
 const stripe = useStripe();
 const elements = useElements();
 const [accepted, setAccepted] = useState(false);
 const [state, setState] = useState<"idle"| "processing"| "done"| "error">("idle");
 const [errMsg, setErrMsg] = useState<string | null>(null);

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 if (!stripe || !elements || !accepted) return;
 setState("processing");
 setErrMsg(null);

 const { setupIntent, error } = await stripe.confirmSetup({
 elements,
 confirmParams: {
 return_url: `${window.location.origin}/pay/setup-card/success`,
 },
 redirect: "if_required",
 }) as { setupIntent?: { payment_method: string | { id: string } | null }; error?: { message?: string } };

 if (error) {
 setErrMsg(error.message ?? "Error al guardar la tarjeta");
 setState("error");
 return;
 }

 // Actualizar BD con el payment method
 const pmId = typeof setupIntent?.payment_method === "string"? setupIntent.payment_method
 : setupIntent?.payment_method?.id;

 if (pmId && data.customerId) {
 await fetch(`/api/subscriptions/customers/${data.customerId}`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json"},
 body: JSON.stringify({
 stripePaymentMethodId: pmId,
 status: "ACTIVE",
 inviteToken: data.token,
 }),
 }).catch(() => null);
 }

 setState("done");
 }

 if (state === "done") {
 return (
 <Card>
 <div style={{ textAlign: "center", padding: "32px 0"}}>
 <div style={{ fontSize: 52, marginBottom: 16 }}></div>
 <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: "0 0 10px"}}>
 ¡Tarjeta guardada correctamente!
 </h2>
 <p style={{ fontSize: 15, color: "#666", lineHeight: 1.6 }}>
 Sus próximos recibos se procesarán automáticamente de forma segura.
 Recibirá un aviso antes de cada cobro.
 </p>
 </div>
 </Card>
 );
 }

 return (
 <Card>
 <div style={s.bizBadge}>{data.business.name}</div>
 <h1 style={s.title}>Añada su tarjeta</h1>
 <p style={s.sub}>
 Hola, <strong>{data.customer.name.split("")[0]}</strong>. {data.business.name} ha
 actualizado su sistema de cobros. Por favor añada su tarjeta para procesar sus
 próximos recibos de forma segura.
 </p>

 <form onSubmit={handleSubmit}>
 <label style={s.label}>Datos de tarjeta</label>
 <div style={s.cardBox}>
 <PaymentElement
 options={{
 layout: "tabs",
 defaultValues: {
 billingDetails: {
 name: data.customer.name,
 email: data.customer.email,
 },
 },
 }}
 />
 </div>

 {/* Consentimiento obligatorio */}
 <div style={s.consentBox}>
 <label style={s.consentLabel}>
 <input
 type="checkbox"checked={accepted}
 onChange={e => setAccepted(e.target.checked)}
 style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0, marginTop: 2 }}
 />
 <span>
 Autorizo a <strong>{data.business.name}</strong> a realizar cargos variables en
 esta tarjeta correspondientes a mis facturas. Puedo cancelar en cualquier momento
 contactando con {data.business.name}.
 </span>
 </label>
 </div>

 {errMsg && <p style={s.err}>{errMsg}</p>}

 <button
 type="submit"disabled={!accepted || state === "processing"|| !stripe}
 style={{
 ...s.btn,
 opacity: (!accepted || state === "processing"|| !stripe) ? 0.5 : 1,
 cursor: (!accepted || state === "processing") ? "not-allowed": "pointer",
 }}
 >
 {state === "processing"? "Guardando tarjeta...": "Guardar tarjeta de forma segura "}
 </button>
 </form>

 <p style={s.legal}>
 Sus datos de pago están cifrados y nunca se almacenan en nuestros servidores.
 Gestionado de forma segura por <strong>Stripe</strong>.
 </p>
 </Card>
 );
}

// Shell 
export default function SetupCardClient({ token }: { token: string }) {
 const [data, setData] = useState<InviteData | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 fetch(`/api/subscriptions/invite/${token}`)
 .then(r => r.json())
 .then(d => {
 if (d.error) { setError(d.error); return; }
 setData({ ...d, token } as InviteData);
 })
 .catch(() => setError("No se pudo cargar el enlace"))
 .finally(() => setLoading(false));
 }, [token]);

 if (loading) {
 return (
 <Page>
 <Card>
 <div style={{ textAlign: "center", padding: "40px 0", color: "#888"}}>Cargando...</div>
 </Card>
 </Page>
 );
 }

 if (error) {
 return (
 <Page>
 <Card>
 <div style={{ textAlign: "center", padding: "32px 0"}}>
 <div style={{ fontSize: 48, marginBottom: 12 }}></div>
 <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 8 }}>
 Enlace no disponible
 </h2>
 <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
 {error === "Link expired"? "Este enlace ha caducado. Contacte con su proveedor para que le envíe uno nuevo.": error === "This link has already been used"? "Este enlace ya fue utilizado. Su tarjeta ya está guardada.": "Este enlace no es válido. Contacte con su proveedor."}
 </p>
 </div>
 </Card>
 </Page>
 );
 }

 if (!data) return null;

 return (
 <Page>
 <Elements stripe={stripePromise} options={{ clientSecret: data.clientSecret }}>
 <CardForm data={data} />
 </Elements>
 </Page>
 );
}

function Page({ children }: { children: React.ReactNode }) {
 return (
 <div style={{
 minHeight: "100dvh", background: "#F5F5F7",
 display: "flex", alignItems: "center", justifyContent: "center",
 padding: 16, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
 }}>
 {children}
 </div>
 );
}
function Card({ children }: { children: React.ReactNode }) {
 return (
 <div style={{
 background: "#fff", borderRadius: 20, padding: "36px 32px",
 width: "100%", maxWidth: 460,
 boxShadow: "0 4px 40px rgba(0,0,0,0.10)",
 }}>
 {children}
 </div>
 );
}

const s: Record<string, React.CSSProperties> = {
 bizBadge: {
 display: "inline-block", background: "#F0F0F0", borderRadius: 50,
 padding: "4px 12px", fontSize: 12, fontWeight: 600, color: "#555",
 marginBottom: 20,
 },
 title: { fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 10px", letterSpacing: "-0.03em"},
 sub: { fontSize: 14, color: "#666", lineHeight: 1.6, margin: "0 0 24px"},
 label: { display: "block", fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 },
 cardBox: {
 border: "1.5px solid #E0E0E0", borderRadius: 10,
 padding: "14px 12px", marginBottom: 20, background: "#FAFAFA",
 },
 consentBox: {
 background: "#F8F8FA", borderRadius: 10, padding: "14px 16px", marginBottom: 20,
 border: "1px solid #E8E8E8",
 },
 consentLabel: {
 display: "flex", gap: 10, alignItems: "flex-start",
 fontSize: 13, color: "#555", lineHeight: 1.5, cursor: "pointer",
 },
 err: {
 color: "#FF3B30", fontSize: 13, background: "#FFF0F0",
 padding: "10px 14px", borderRadius: 8, marginBottom: 16,
 },
 btn: {
 width: "100%", padding: "15px",
 background: "#000", color: "#fff",
 border: "none", borderRadius: 10,
 fontSize: 15, fontWeight: 600, marginBottom: 16,
 transition: "opacity 0.15s",
 },
 legal: { fontSize: 11, color: "#bbb", textAlign: "center", lineHeight: 1.5 },
};

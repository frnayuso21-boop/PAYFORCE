"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
 Elements,
 PaymentElement,
 useStripe,
 useElements,
} from "@stripe/react-stripe-js";
import { formatCurrency } from "@/lib/utils";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// CSS global 

const KEYFRAMES = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

 @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
 @keyframes pfPulse { 0%,100% { opacity:.3; transform:scale(.88) } 50% { opacity:1; transform:scale(1) } }
 @keyframes pfProgress { from { width:0% } to { width:100% } }
 @keyframes pfFadeIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
 @keyframes imgPulse { 0%,100% { opacity:.55; transform:scale(.94) } 50% { opacity:1; transform:scale(1) } }

 .pf-layout {
 display: grid;
 grid-template-columns: 1fr 1fr;
 max-width: 1000px;
 margin: 0 auto;
 min-height: 100vh;
 }
 .pf-left { padding: 48px 40px; }
 .pf-right { display: flex; flex-direction: column; }

 @media (max-width: 768px) {
 .pf-layout { grid-template-columns: 1fr; }
 .pf-left { padding: 32px 24px; }
 .pf-right { flex: 1; }
 }
`;

// Loading Screen 

function LoadingScreen({
 color, businessName, logoUrl,
}: {
 color: string; businessName: string; logoUrl?: string | null;
}) {
 return (
 <div style={{
 position: "fixed", inset: 0,
 background: color,
 display: "flex", flexDirection: "column",
 alignItems: "center", justifyContent: "center",
 gap: "24px", zIndex: 50,
 fontFamily: "Inter, sans-serif",
 }}>
 {/* Icono animado: logo merchant con pulse O hexágono */}
 {logoUrl ? (
 /* eslint-disable-next-line @next/next/no-img-element */
 <img
 src={logoUrl}
 alt={businessName}
 style={{
 height: "56px",
 maxWidth: "160px",
 objectFit: "contain",
 animation: "imgPulse 1.8s ease-in-out infinite",
 filter: "brightness(0) invert(1)",
 }}
 />
 ) : (
 <div style={{ position: "relative", width: "64px", height: "64px"}}>
 <svg width="64"height="64"viewBox="0 0 28 28"fill="none"style={{ opacity: 0.1 }}>
 <path d="M14 2L25.5 8.5V21.5L14 28L2.5 21.5V8.5L14 2Z"fill="white"/>
 </svg>
 <svg style={{
 position: "absolute", top: 0, left: 0,
 animation: "spin 1.8s linear infinite",
 transformOrigin: "center",
 }} width="64"height="64"viewBox="0 0 64 64"fill="none">
 <circle cx="32"cy="32"r="28"stroke="white"strokeWidth="1.5"strokeDasharray="40 136"strokeLinecap="round"opacity="0.5"/>
 </svg>
 <svg style={{
 position: "absolute", top: 0, left: 0,
 animation: "pfPulse 1.8s ease-in-out infinite",
 }} width="64"height="64"viewBox="0 0 28 28"fill="none">
 <path d="M14 2L25.5 8.5V21.5L14 28L2.5 21.5V8.5L14 2Z"fill="white"/>
 </svg>
 </div>
 )}

 {/* Nombre bajo el hexágono (solo si no hay logo) */}
 {!logoUrl && (
 <p style={{
 fontSize: "15px", fontWeight: 500, color: "#fff",
 letterSpacing: "0.08em", textTransform: "uppercase", margin: 0,
 }}>{businessName}</p>
 )}

 <p style={{
 fontSize: "11px", color: "rgba(255,255,255,0.35)",
 letterSpacing: "0.06em", textTransform: "uppercase", margin: 0,
 }}>Cargando pago seguro</p>

 {/* Barra de progreso */}
 <div style={{
 width: "80px", height: "2px",
 background: "rgba(255,255,255,0.1)",
 borderRadius: "2px", overflow: "hidden",
 }}>
 <div style={{
 height: "100%", background: "#fff", borderRadius: "2px",
 animation: "pfProgress 1.5s ease-in-out forwards",
 }} />
 </div>

 <p style={{
 position: "absolute", bottom: "20px",
 fontSize: "10px", color: "rgba(255,255,255,0.2)",
 letterSpacing: "0.06em", textTransform: "uppercase", margin: 0,
 }}>Procesado por PayForce</p>
 </div>
 );
}

// Columna izquierda (resumen) 

function SummaryColumn({
 businessName, logoUrl, color, amount, currency, description, customerName,
}: {
 businessName: string; logoUrl?: string | null; color: string;
 amount: number; currency: string; description?: string | null; customerName?: string | null;
}) {
 const amountFmt = formatCurrency(amount / 100, currency);

 return (
 <div
 className="pf-left"style={{
 background: color,
 display: "flex",
 flexDirection: "column",
 justifyContent: "space-between",
 fontFamily: "Inter, sans-serif",
 }}
 >
 {/* Contenido superior */}
 <div>
 {/* Logo o nombre del merchant */}
 <div style={{ marginBottom: "40px"}}>
 {logoUrl ? (
 /* eslint-disable-next-line @next/next/no-img-element */
 <img
 src={logoUrl}
 alt={businessName}
 style={{
 height: "36px", maxWidth: "160px",
 objectFit: "contain",
 filter: "brightness(0) invert(1)",
 }}
 />
 ) : (
 <p style={{
 fontSize: "22px", fontWeight: 700, color: "#fff",
 margin: 0, letterSpacing: "-0.5px",
 }}>{businessName}</p>
 )}
 </div>

 {/* Descripción */}
 {description && (
 <p style={{
 fontSize: "14px", color: "rgba(255,255,255,0.6)",
 margin: "0 0 28px",
 lineHeight: 1.5,
 }}>{description}</p>
 )}

 {customerName && (
 <div style={{
 fontSize: "13px", color: "rgba(255,255,255,0.45)",
 marginBottom: "20px",
 }}>
 Para: <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{customerName}</span>
 </div>
 )}

 {/* Separador */}
 <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.12)", marginBottom: "20px"}} />

 {/* Tabla de resumen */}
 <div style={{ display: "flex", flexDirection: "column", gap: "10px"}}>
 <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px"}}>
 <span style={{ color: "rgba(255,255,255,0.45)"}}>Subtotal</span>
 <span style={{ color: "rgba(255,255,255,0.75)"}}>{amountFmt}</span>
 </div>
 <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px"}}>
 <span style={{ color: "rgba(255,255,255,0.45)"}}>Comisiones</span>
 <span style={{ color: "rgba(255,255,255,0.75)"}}>0,00 €</span>
 </div>

 {/* Separador */}
 <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.12)", paddingTop: "10px"}}>
 <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 700 }}>
 <span style={{ color: "#fff"}}>Total</span>
 <span style={{ color: "#fff"}}>{amountFmt}</span>
 </div>
 </div>
 </div>
 </div>

 {/* Badges de seguridad */}
 <div style={{
 marginTop: "40px",
 display: "flex", flexDirection: "column", gap: "8px",
 }}>
 {[
 { icon: "", label: "Pago seguro SSL"},
 { icon: "", label: "PCI DSS Compliant"},
 { icon: "", label: "Encriptación 256-bit"},
 ].map(({ icon, label }) => (
 <div key={label} style={{
 display: "flex", alignItems: "center", gap: "8px",
 fontSize: "12px", color: "rgba(255,255,255,0.35)",
 }}>
 <span style={{ fontSize: "13px"}}>{icon}</span>
 {label}
 </div>
 ))}
 </div>
 </div>
 );
}

// Footer 

function CheckoutFooter() {
 return (
 <div style={{
 padding: "14px 40px",
 borderTop: "0.5px solid rgba(0,0,0,0.06)",
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 gap: "6px",
 background: "#fff",
 }}>
 <span style={{ fontSize: "11px", color: "#9CA3AF", letterSpacing: "0.04em"}}>
 Powered by
 </span>
 <svg width="12"height="12"viewBox="0 0 28 28"fill="none">
 <path d="M14 2L25.5 8.5V21.5L14 28L2.5 21.5V8.5L14 2Z"fill="#6B7280"/>
 </svg>
 <span style={{
 fontSize: "11px", fontWeight: 600, color: "#6B7280",
 letterSpacing: "0.06em", textTransform: "uppercase",
 }}>PayForce</span>
 <span style={{ fontSize: "11px", color: "#D1D5DB", margin: "0 6px"}}>·</span>
 <span style={{ fontSize: "11px", color: "#D1D5DB"}}>PCI DSS</span>
 <span style={{ fontSize: "11px", color: "#D1D5DB", margin: "0 6px"}}>·</span>
 <span style={{ fontSize: "11px", color: "#D1D5DB"}}>SSL 256-bit</span>
 </div>
 );
}

// Formulario de pago 

function CheckoutForm({
 token, amount, currency, customerEmail, color,
}: {
 token: string; amount: number; currency: string;
 customerEmail?: string | null; color: string;
}) {
 const stripe = useStripe();
 const elements = useElements();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const returnUrl =
 typeof window !== "undefined"? `${window.location.origin}/pay/${token}`: `/pay/${token}`;

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

 return (
 <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px"}}>
 <PaymentElement options={{
 layout: "tabs",
 defaultValues: { billingDetails: { email: customerEmail ?? ""} },
 }} />

 {error && (
 <div style={{
 display: "flex", alignItems: "flex-start", gap: "8px",
 background: "#FEF2F2", border: "0.5px solid #FECACA",
 borderRadius: "10px", padding: "12px 14px",
 fontSize: "13px", color: "#DC2626",
 }}>
 <span style={{ marginTop: "1px", fontSize: "14px", lineHeight: 1 }}></span>
 {error}
 </div>
 )}

 <button
 type="submit"disabled={!stripe || loading}
 style={{
 background: loading ? `${color}99`: color,
 color: "#fff",
 border: "none",
 borderRadius: "10px",
 padding: "14px 20px",
 fontSize: "15px",
 fontWeight: 600,
 cursor: loading ? "not-allowed": "pointer",
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 gap: "8px",
 transition: "opacity 0.2s",
 fontFamily: "Inter, sans-serif",
 letterSpacing: "-0.2px",
 width: "100%",
 }}
 >
 {loading ? (
 <>
 <span style={{
 width: "15px", height: "15px",
 border: "2px solid rgba(255,255,255,0.3)",
 borderTopColor: "#fff",
 borderRadius: "50%",
 animation: "spin 0.7s linear infinite",
 display: "inline-block",
 }} />
 Procesando…
 </>
 ) : (
 <>
 <svg width="14"height="14"viewBox="0 0 24 24"fill="none">
 <rect x="2"y="5"width="20"height="14"rx="2"stroke="white"strokeWidth="1.5"/>
 <path d="M2 10h20"stroke="white"strokeWidth="1.5"/>
 </svg>
 Pagar {formatCurrency(amount / 100, currency)}
 </>
 )}
 </button>
 </form>
 );
}

// Componente principal 

export interface PayCheckoutProps {
 clientSecret: string;
 token: string;
 amount: number;
 currency: string;
 description?: string | null;
 customerEmail?: string | null;
 customerName?: string | null;
 businessName: string;
 primaryColor?: string | null;
 logoUrl?: string | null;
}

export function PayCheckout({
 clientSecret,
 token,
 amount,
 currency,
 description,
 customerEmail,
 customerName,
 businessName,
 primaryColor,
 logoUrl,
}: PayCheckoutProps) {
 const [stage, setStage] = useState<"loading"| "checkout">("loading");
 const color = primaryColor || "#0A0A0A";

 useEffect(() => {
 const timer = setTimeout(() => setStage("checkout"), 1800);
 return () => clearTimeout(timer);
 }, []);

 return (
 <>
 <style>{KEYFRAMES}</style>

 {/* Loading */}
 {stage === "loading"&& (
 <LoadingScreen
 color={color}
 businessName={businessName}
 logoUrl={logoUrl}
 />
 )}

 {/* Checkout dos columnas */}
 {stage === "checkout"&& (
 <div style={{ minHeight: "100vh", background: "#F5F5F7"}}>
 <div
 className="pf-layout"style={{
 fontFamily: "Inter, sans-serif",
 animation: "pfFadeIn 0.4s ease both",
 }}
 >
 {/* COLUMNA IZQUIERDA — resumen */}
 <SummaryColumn
 businessName={businessName}
 logoUrl={logoUrl}
 color={color}
 amount={amount}
 currency={currency}
 description={description}
 customerName={customerName}
 />

 {/* COLUMNA DERECHA — formulario */}
 <div
 className="pf-right"style={{ background: "#fff"}}
 >
 {/* Contenido centrado y limitado a 480px */}
 <div style={{
 maxWidth: "480px",
 margin: "0 auto",
 width: "100%",
 padding: "48px 40px",
 flex: 1,
 display: "flex",
 flexDirection: "column",
 gap: "16px",
 }}>
 {/* Título */}
 <p style={{
 fontSize: "11px", fontWeight: 600, color: "#9CA3AF",
 letterSpacing: "0.06em", textTransform: "uppercase",
 margin: "0 0 4px",
 }}>
 Método de pago
 </p>

 {/* Stripe Elements */}
 <Elements
 stripe={stripePromise}
 options={{
 clientSecret,
 loader: "auto",
 appearance: {
 theme: "stripe",
 variables: {
 fontFamily: "Inter, sans-serif",
 borderRadius: "10px",
 colorPrimary: color,
 colorBackground: "#FFFFFF",
 colorText: "#111827",
 colorDanger: "#EF4444",
 spacingUnit: "4px",
 fontSizeBase: "14px",
 },
 rules: {
 ".Input": { padding: "12px 14px", fontSize: "14px", background: "#fff"},
 ".Input:focus": { boxShadow: `0 0 0 2px ${color}33`},
 ".Label": { fontWeight: "500", color: "#6B7280", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em"},
 ".Tab": { borderRadius: "8px", padding: "8px 12px"},
 ".Tab--selected": { backgroundColor: color, color: "#fff"},
 ".p-Logo": { display: "none"},
 ".p-Logo-img": { display: "none"},
 ".p-TermsText": { display: "none"},
 },
 },
 }}
 >
 <CheckoutForm
 token={token}
 amount={amount}
 currency={currency}
 customerEmail={customerEmail}
 color={color}
 />
 </Elements>
 </div>

 {/* Footer al fondo de la columna derecha */}
 <CheckoutFooter />
 </div>
 </div>
 </div>
 )}
 </>
 );
}

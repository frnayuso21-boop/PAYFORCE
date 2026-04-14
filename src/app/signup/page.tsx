"use client";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PayForceLogo } from "@/components/marketing/PayForceLogo";

// ─── Constantes ───────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: "ES", name: "España" },
  { code: "MX", name: "México" },
  { code: "AR", name: "Argentina" },
  { code: "CO", name: "Colombia" },
  { code: "CL", name: "Chile" },
  { code: "PE", name: "Perú" },
  { code: "BR", name: "Brasil" },
  { code: "US", name: "Estados Unidos" },
  { code: "GB", name: "Reino Unido" },
  { code: "DE", name: "Alemania" },
  { code: "FR", name: "Francia" },
  { code: "IT", name: "Italia" },
  { code: "PT", name: "Portugal" },
  { code: "NL", name: "Países Bajos" },
  { code: "BE", name: "Bélgica" },
  { code: "CH", name: "Suiza" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Suecia" },
  { code: "NO", name: "Noruega" },
  { code: "DK", name: "Dinamarca" },
  { code: "PL", name: "Polonia" },
  { code: "CA", name: "Canadá" },
  { code: "AU", name: "Australia" },
  { code: "JP", name: "Japón" },
  { code: "SG", name: "Singapur" },
  { code: "AE", name: "Emiratos Árabes Unidos" },
  { code: "OTHER", name: "Otro" },
];

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: "", color: "" };
  if (pw.length < 8)   return { score: 1, label: "Muy corta", color: "bg-red-400" };
  const hasUpper  = /[A-Z]/.test(pw);
  const hasLower  = /[a-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const score = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length;
  if (score <= 2) return { score: 2, label: "Débil",    color: "bg-amber-400" };
  if (score === 3) return { score: 3, label: "Buena",   color: "bg-blue-400"  };
  return             { score: 4, label: "Excelente", color: "bg-emerald-400" };
}

// ─── Google Logo SVG ──────────────────────────────────────────────────────────
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

// ─── Formulario de registro ───────────────────────────────────────────────────
function SignupForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const from         = searchParams.get("from") ?? "/app/dashboard";

  const [name,          setName]          = useState("");
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [country,       setCountry]       = useState("ES");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [showPass,      setShowPass]      = useState(false);
  const [error,         setError]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent,          setSent]          = useState(false);

  const supabase = createSupabaseClient();
  const strength = passwordStrength(password);

  // ── Google OAuth ─────────────────────────────────────────────────────────
  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    try {
      const origin      = typeof window !== "undefined" ? window.location.origin : "";
      const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(from)}`;
      const { error: sbError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl },
      });
      if (sbError) setError(sbError.message);
    } catch {
      setError("Error al conectar con Google.");
    } finally {
      setGoogleLoading(false);
    }
  }

  // ── Registro con email + contraseña ──────────────────────────────────────
  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const origin      = typeof window !== "undefined" ? window.location.origin : "";
      const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(from)}`;

      const { error: sbError } = await supabase.auth.signUp({
        email:    email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name:        name.trim(),
            country:          country,
            marketing_opt_in: marketingOptIn,
          },
          emailRedirectTo: callbackUrl,
        },
      });

      if (sbError) {
        if (sbError.message.includes("already registered")) {
          setError("Este email ya tiene una cuenta. Inicia sesión.");
        } else {
          setError(sbError.message);
        }
        return;
      }

      setSent(true);
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  // ── Pantalla post-registro ────────────────────────────────────────────────
  if (sent) {
    const isGmail = email.endsWith("@gmail.com");
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 text-center pt-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100">
            <Check className="h-7 w-7 text-emerald-500" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Revisa tu bandeja de entrada</h2>
            <p className="mt-1 text-sm text-slate-500">
              Enviamos un enlace de activación a{" "}
              <span className="font-semibold text-slate-700">{email}</span>
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3.5 text-sm text-slate-600 leading-relaxed">
          Abre el email y pulsa el enlace para activar tu cuenta. Puede tardar unos segundos en llegar.
        </div>

        {isGmail && (
          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            <GoogleLogo />
            Abrir Gmail
          </a>
        )}

        <p className="text-center text-xs text-slate-400">
          ¿Ya tienes la cuenta activa?{" "}
          <Link href="/login" className="font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900">
            Inicia sesión
          </Link>
        </p>
      </div>
    );
  }

  // ── Formulario principal ──────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50"
      >
        <GoogleLogo />
        {googleLoading ? "Conectando…" : "Continuar con Google"}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-100" />
        <span className="text-xs font-medium text-slate-400">o continúa con email</span>
        <div className="h-px flex-1 bg-slate-100" />
      </div>

      {/* Formulario email */}
      <form onSubmit={handleSignup} className="space-y-4">
        {/* Nombre */}
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Nombre
          </label>
          <input
            id="name"
            type="text"
            placeholder="Tu nombre o empresa"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email de trabajo
          </label>
          <input
            id="email"
            type="email"
            placeholder="tu@empresa.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Contraseña */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPass ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex flex-1 gap-0.5">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors duration-300",
                      strength.score >= level ? strength.color : "bg-slate-100",
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">{strength.label}</span>
            </div>
          )}
        </div>

        {/* País */}
        <div className="space-y-1.5">
          <label htmlFor="country" className="block text-sm font-medium text-slate-700">
            País
          </label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors appearance-none cursor-pointer"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Marketing opt-in */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition-colors hover:bg-slate-100/60">
          <div className="relative mt-0.5 flex-shrink-0">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="peer h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-1 focus:ring-slate-900/20 focus:ring-offset-0"
            />
          </div>
          <span className="text-[13px] leading-relaxed text-slate-600">
            Quiero recibir novedades, actualizaciones de producto y ofertas de PayForce por email.
          </span>
        </label>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 active:bg-slate-950 disabled:opacity-50"
        >
          {loading ? (
            "Creando cuenta…"
          ) : (
            <>
              Crear cuenta
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-[13px] text-slate-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-slate-800 underline underline-offset-2 hover:text-slate-900">
          Inicia sesión
        </Link>
      </p>

      <p className="text-center text-[11px] leading-relaxed text-slate-400">
        Al crear una cuenta aceptas los{" "}
        <Link href="/terms" className="underline underline-offset-1">Términos de servicio</Link>
        {" "}y la{" "}
        <Link href="/privacy" className="underline underline-offset-1">Política de privacidad</Link>.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")";

  const transactions = [
    { initials: "CM", name: "Carlos M.",  amount: "+€249,00",    time: "hace 2 min" },
    { initials: "MG", name: "Marta G.",   amount: "+€89,50",     time: "hace 5 min" },
    { initials: "TS", name: "Tech SL",    amount: "+€1.200,00",  time: "hace 8 min" },
  ];

  return (
    <main className="flex min-h-screen bg-white">

      {/* ── Panel izquierdo — branding (solo desktop) ────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[480px] lg:flex-col lg:justify-between lg:px-10 lg:py-12 relative overflow-hidden flex-shrink-0"
        style={{ background: "linear-gradient(155deg, #09080f 0%, #1c1035 45%, #0e1a28 100%)" }}
      >
        {/* Grano */}
        <div className="absolute inset-0 opacity-[0.30] pointer-events-none"
          style={{ backgroundImage: NOISE, backgroundSize: "180px", mixBlendMode: "overlay" }} />

        {/* Glow orbs */}
        <div className="absolute -top-24 -right-16 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(91,74,122,0.45) 0%, transparent 65%)" }} />
        <div className="absolute -bottom-16 -left-12 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(13,100,200,0.18) 0%, transparent 65%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(45,31,61,0.40) 0%, transparent 55%)" }} />

        {/* Logo */}
        <Link href="/home" className="relative z-10">
          <PayForceLogo variant="white" height={28} />
        </Link>

        {/* Tarjeta de actividad live */}
        <div className="relative z-10 rounded-2xl p-5"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            backdropFilter: "blur(16px)",
          }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[2px] text-white/35">Transacciones hoy</span>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-white/35">Live</span>
            </div>
          </div>
          <p className="text-[32px] text-white leading-none mb-4"
            style={{ fontWeight: 300, letterSpacing: "-0.03em" }}>
            €124.500
          </p>
          <div className="flex flex-col">
            {transactions.map((tx, i) => (
              <div key={tx.name}
                className="flex items-center gap-3 py-2.5"
                style={{ borderTop: i === 0 ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.05)" }}>
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white/60 flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  {tx.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white/65 truncate">{tx.name}</p>
                  <p className="text-[9px] text-white/28">{tx.time}</p>
                </div>
                <span className="text-[11px] text-emerald-400 flex-shrink-0">{tx.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Texto + bullets */}
        <div className="relative z-10 space-y-6">
          <div>
            <p className="text-[24px] font-semibold leading-snug text-white" style={{ letterSpacing: "-0.02em" }}>
              La infraestructura de pagos para tu negocio
            </p>
            <p className="mt-2.5 text-[13px] leading-relaxed text-white/45">
              Acepta pagos, gestiona facturación y controla tus cobros desde un solo panel.
            </p>
          </div>
          <ul className="space-y-2.5">
            {[
              "Sin comisiones ocultas",
              "Pagos en tiempo real",
              "Dashboard completo desde el día 1",
              "Soporte en español",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[13px] text-white/65">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: "rgba(13,223,200,0.12)", border: "1px solid rgba(13,223,200,0.25)" }}>
                  <Check className="h-3 w-3" style={{ color: "#0DDFC8" }} strokeWidth={3} />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-[11px] text-white/18">
          © {new Date().getFullYear()} PayForce. Todos los derechos reservados.
        </p>
      </div>

      {/* ── Panel derecho — formulario ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          {/* Logo en mobile */}
          <div className="mb-8 lg:hidden">
            <Link href="/home">
              <PayForceLogo variant="dark" height={28} />
            </Link>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Crea tu cuenta</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Empieza gratis, sin tarjeta de crédito
            </p>
          </div>

          <Suspense fallback={
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-11 w-full animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          }>
            <SignupForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

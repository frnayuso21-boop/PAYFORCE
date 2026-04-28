"use client";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams }    from "next/navigation";
import { Eye, EyeOff }                  from "lucide-react";
import { createSupabaseClient }          from "@/lib/supabase/client";
import Link                              from "next/link";
import { PayForceLogo }                  from "@/components/marketing/PayForceLogo";

// ─── Formulario de login ───────────────────────────────────────────────────────
function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const from         = searchParams.get("from") ?? "/app/dashboard";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const supabase = createSupabaseClient();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseConfigured =
    supabaseUrl.length > 0 &&
    !supabaseUrl.includes("TU_PROYECTO") &&
    !supabaseUrl.includes("placeholder");

  if (!supabaseConfigured) {
    return (
      <button
        onClick={() => router.push(from)}
        className="w-full rounded-2xl bg-slate-900 py-3.5 text-[15px] font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
      >
        Entrar al dashboard →
      </button>
    );
  }

  async function handleGoogleSignIn() {
    setError(""); setLoading(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: sbError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(from)}` },
      });
      if (sbError) setError(sbError.message);
    } catch { setError("Error al conectar con Google."); }
    finally   { setLoading(false); }
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const pre = await fetch("/api/auth/pre-login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!pre.ok) {
        const j = await pre.json().catch(() => ({})) as { error?: string };
        setError(j.error ?? "Demasiados intentos. Espera unos minutos.");
        return;
      }

      const { error: sbError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      });
      if (sbError) {
        void fetch("/api/auth/login-failed-audit", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        setError(sbError.message.includes("Invalid login credentials")
          ? "Email o contraseña incorrectos."
          : sbError.message);
        return;
      }

      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const needsSecondFactor =
        aalData?.nextLevel === "aal2" && aalData?.currentLevel !== "aal2";

      if (needsSecondFactor) {
        router.push(`/login/2fa?from=${encodeURIComponent(from)}`);
      } else {
        await fetch("/api/auth/session-audit", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ event: "LOGIN_SUCCESS" }),
        });
        router.push(from);
      }
      router.refresh();
    } catch { setError("Error de red. Inténtalo de nuevo."); }
    finally   { setLoading(false); }
  }

  return (
    <div className="space-y-5">

      {/* Título */}
      <div className="space-y-1">
        <h1 className="text-[24px] font-bold text-slate-900" style={{ letterSpacing: "-0.02em" }}>
          Iniciar sesión
        </h1>
        <p className="text-[14px] text-slate-400">Accede a tu panel de PayForce</p>
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 text-[14px] font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#4285F4" d="M44.5 20H24v8.5h11.7C34.1 33.7 29.6 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 6 1.1 8.2 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.9 0 20-7.9 20-21 0-1.3-.2-2.7-.5-4z"/>
          <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16.6 19.2 14 24 14c3.1 0 6 1.1 8.2 3l6-6C34.5 5.1 29.5 3 24 3 16 3 9.1 7.9 6.3 14.7z"/>
          <path fill="#FBBC05" d="M24 45c5.4 0 10.3-1.8 14.1-4.9l-6.5-5.3C29.6 36.4 27 37 24 37c-5.5 0-10.2-3.7-11.8-8.8l-7 5.4C8.9 40.9 16 45 24 45z"/>
          <path fill="#EA4335" d="M44.5 20H24v8.5h11.7c-.8 2.3-2.4 4.3-4.4 5.7l6.5 5.3C41.2 36.3 44.5 30.6 44.5 24c0-1.3-.2-2.7-.5-4z"/>
        </svg>
        Continuar con Google
      </button>

      {/* Separador */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-100" />
        <span className="text-[12px] text-slate-400">o con tu email</span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>

      {/* Formulario email + contraseña */}
      <form onSubmit={handleSignIn} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-[13px] font-medium text-slate-700">Email</label>
          <input
            id="email"
            type="email"
            placeholder="tu@empresa.com"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-[13px] font-medium text-slate-700">Contraseña</label>
            <Link href="/forgot-password" className="text-[12px] text-slate-400 hover:text-slate-600 transition">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-[14px] text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-2.5 text-[13px] text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-slate-900 py-3.5 text-[14px] font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Iniciar sesión"}
        </button>
      </form>

      <p className="text-center text-[13px] text-slate-400">
        ¿No tienes cuenta?{" "}
        <Link href="/signup" className="font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900 transition">
          Crear cuenta gratis
        </Link>
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")";

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

        {/* Mensaje central */}
        <div className="relative z-10 space-y-6">
          <div>
            <p className="text-[28px] font-semibold leading-snug text-white" style={{ letterSpacing: "-0.02em" }}>
              Bienvenido de nuevo.
            </p>
            <p className="mt-2.5 text-[14px] leading-relaxed text-white/45">
              Accede a tu panel de pagos, gestiona cobros y revisa tus transacciones en tiempo real.
            </p>
          </div>

          {/* Stats rápidas */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Uptime",    value: "99.99%"  },
              { label: "Latencia",  value: "< 200ms" },
              { label: "Divisas",   value: "135+"    },
              { label: "Países",    value: "50+"     },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
                <p className="text-[18px] text-white" style={{ fontWeight: 300, letterSpacing: "-0.02em" }}>{value}</p>
                <p className="text-[10px] text-white/35 mt-0.5 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[11px] text-white/18">
          © {new Date().getFullYear()} PayForce. Todos los derechos reservados.
        </p>
      </div>

      {/* ── Panel derecho — formulario ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">

          {/* Logo en mobile */}
          <div className="mb-8 lg:hidden">
            <Link href="/home">
              <PayForceLogo variant="dark" height={28} />
            </Link>
          </div>

          <Suspense fallback={
            <div className="py-8 text-center text-sm text-slate-400">
              Cargando…
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

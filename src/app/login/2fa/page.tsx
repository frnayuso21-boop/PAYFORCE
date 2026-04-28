"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { PayForceLogo } from "@/components/marketing/PayForceLogo";
import { createSupabaseClient } from "@/lib/supabase/client";
import { mfaChallengeAndVerify } from "@/lib/mfaChallengeVerify";

function OtpSix({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const focusLast = useCallback((len: number) => {
    setTimeout(() => refs.current[Math.min(Math.max(len - 1, 0), 5)]?.focus(), 0);
  }, []);

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      onChange(value.slice(0, i) + value.slice(i + 1));
      if (i > 0) refs.current[i - 1]?.focus();
    }
  }

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    const chars = raw.slice(0, 6 - i);
    const next = (value.slice(0, i) + chars + value.slice(i + chars.length)).slice(0, 6);
    onChange(next);
    focusLast(next.length);
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(p);
    focusLast(p.length);
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className="h-12 w-10 rounded-xl border-2 border-slate-200 bg-white text-center text-[20px] font-semibold text-slate-900 outline-none transition-all focus:border-slate-800 focus:ring-2 focus:ring-slate-100 disabled:opacity-50"
          style={{ caretColor: "transparent" }}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}

function TwoFaInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const from         = searchParams.get("from") ?? "/app/dashboard";

  const supabase = createSupabaseClient();

  const [code, setCode]         = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [backupInfo, setBackupInfo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sb = createSupabaseClient();
    (async () => {
      const { data, error: fe } = await sb.auth.mfa.listFactors();
      if (cancelled) return;
      if (fe) {
        setError("No se pudo cargar el segundo factor.");
        return;
      }
      const totp = data?.totp?.find((f) => f.status === "verified");
      if (!totp) {
        setError("No hay autenticador TOTP activo en esta cuenta.");
        return;
      }
      setFactorId(totp.id);
    })();
    return () => { cancelled = true; };
  }, []);

  const verify = useCallback(async (raw: string) => {
    const c = raw.replace(/\s/g, "");
    if (c.length !== 6 || !factorId) return;

    setError("");
    setLoading(true);
    try {
      const { error: ve } = await mfaChallengeAndVerify(supabase, factorId, c);
      if (ve) {
        setError("Código incorrecto. Inténtalo de nuevo.");
        setCode("");
        return;
      }

      await fetch("/api/auth/session-audit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ event: "MFA_SUCCESS" }),
      });

      router.push(from.startsWith("/") ? from : "/app/dashboard");
      router.refresh();
    } catch {
      setError("Error de verificación.");
      setCode("");
    } finally {
      setLoading(false);
    }
  }, [factorId, from, router, supabase]);

  useEffect(() => {
    if (code.length === 6 && !loading && factorId) {
      void verify(code);
    }
  }, [code, loading, factorId, verify]);

  return (
    <div className="w-full max-w-sm space-y-6">
      <Link href="/home" className="inline-block">
        <PayForceLogo variant="dark" height={28} />
      </Link>

      <div className="space-y-1">
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">
          Verificación en dos pasos
        </h1>
        <p className="text-[14px] text-slate-500">
          {backupInfo
            ? "Si generaste códigos de recuperación en tu proveedor de identidad, sigue sus instrucciones. En la mayoría de casos necesitarás tu app TOTP o ayuda de soporte."
            : "Introduce el código de 6 dígitos de tu aplicación autenticadora."}
        </p>
      </div>

      {!backupInfo && factorId && (
        <OtpSix value={code} onChange={setCode} disabled={loading} />
      )}

      {backupInfo && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <p className="text-[13px] text-amber-900">
            PayForce usa MFA nativo de Supabase (TOTP). Los códigos de un solo uso dependen de la configuración
            de tu proyecto; si no tienes acceso al autenticador,{" "}
            <a href="mailto:soporte@payforce.io" className="font-medium underline underline-offset-2">
              contacta con soporte
            </a>
            .
          </p>
        </div>
      )}

      {error && (
        <p className="text-[13px] text-red-600 rounded-xl bg-red-50 px-4 py-2.5">{error}</p>
      )}

      <button
        type="button"
        onClick={() => { setBackupInfo(!backupInfo); setCode(""); setError(""); }}
        className="text-[13px] text-slate-500 underline underline-offset-2 hover:text-slate-800"
      >
        {backupInfo ? "Volver al código del autenticador" : "Usar código de respaldo"}
      </button>
    </div>
  );
}

export default function Login2faPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <Suspense fallback={<div className="text-slate-400 text-sm">Cargando…</div>}>
        <TwoFaInner />
      </Suspense>
    </main>
  );
}

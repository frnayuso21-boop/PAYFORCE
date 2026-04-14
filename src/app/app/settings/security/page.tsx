"use client";

/**
 * /app/settings/security — Gestión de MFA TOTP.
 *
 * Estados posibles:
 *   · "loading"   — cargando factores desde Supabase
 *   · "disabled"  — sin MFA activo → puede activarlo
 *   · "enrolling" — enroll() en curso: muestra QR + campo para verificar
 *   · "enabled"   — factor verificado activo → puede desactivarlo
 */

import { useState, useEffect, FormEvent } from "react";
import {
  ShieldCheck, ShieldOff, Smartphone, KeyRound, Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { createSupabaseClient } from "@/lib/supabase/client";

type PageState = "loading" | "disabled" | "enrolling" | "enabled";

interface EnrollData {
  factorId:  string;
  qrCode:    string;   // SVG string
  secret:    string;   // manual entry
}

export default function SecurityPage() {
  const supabase = createSupabaseClient();

  const [state,       setState]       = useState<PageState>("loading");
  const [enrollData,  setEnrollData]  = useState<EnrollData | null>(null);
  const [activeId,    setActiveId]    = useState<string | null>(null); // factorId del factor verificado
  const [code,        setCode]        = useState("");
  const [copied,      setCopied]      = useState(false);
  const [error,       setError]       = useState("");
  const [working,     setWorking]     = useState(false);

  // ── Cargar estado inicial ────────────────────────────────────────────────
  useEffect(() => {
    loadFactors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFactors() {
    setState("loading");
    setError("");
    const { data, error: err } = await supabase.auth.mfa.listFactors();
    if (err || !data) {
      setError("Error al cargar la configuración de seguridad.");
      setState("disabled");
      return;
    }
    const verified = data.totp.find((f) => f.status === "verified");
    if (verified) {
      setActiveId(verified.id);
      setState("enabled");
    } else {
      setState("disabled");
    }
  }

  // ── Paso 1: iniciar enrollment ───────────────────────────────────────────
  async function handleStartEnroll() {
    setError("");
    setWorking(true);
    try {
      // Limpiar factores no verificados (enrollments incompletos)
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors) {
        for (const f of factors.totp) {
          if ((f.status as string) === "unverified") {
            await supabase.auth.mfa.unenroll({ factorId: f.id });
          }
        }
      }

      const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "PayForce Authenticator",
      });

      if (enrollErr || !data || data.type !== "totp") {
        setError(enrollErr?.message ?? "Error al iniciar la activación MFA.");
        return;
      }

      setEnrollData({
        factorId: data.id,
        qrCode:   data.totp.qr_code,
        secret:   data.totp.secret,
      });
      setState("enrolling");
      setCode("");
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setWorking(false);
    }
  }

  // ── Paso 2: verificar y activar ──────────────────────────────────────────
  async function handleConfirmEnroll(e: FormEvent) {
    e.preventDefault();
    if (!enrollData) return;
    setError("");
    setWorking(true);

    try {
      // Crear challenge
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: enrollData.factorId,
      });
      if (challengeErr || !challenge) {
        setError("Error al crear el challenge MFA.");
        return;
      }

      // Verificar código
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId:   enrollData.factorId,
        challengeId: challenge.id,
        code:        code.trim(),
      });

      if (verifyErr) {
        setError(
          verifyErr.message.includes("Invalid")
            ? "Código incorrecto. Comprueba que tu app esté sincronizada y vuelve a intentarlo."
            : verifyErr.message,
        );
        setCode("");
        return;
      }

      // Éxito — recargar factores
      await loadFactors();
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setWorking(false);
    }
  }

  // ── Desactivar MFA ───────────────────────────────────────────────────────
  async function handleUnenroll() {
    if (!activeId) return;
    if (!confirm("¿Seguro que quieres desactivar la verificación en dos pasos? Tu cuenta quedará menos protegida.")) return;
    setError("");
    setWorking(true);
    try {
      const { error: unenrollErr } = await supabase.auth.mfa.unenroll({ factorId: activeId });
      if (unenrollErr) {
        setError(unenrollErr.message);
        return;
      }
      setActiveId(null);
      setState("disabled");
    } catch {
      setError("Error al desactivar MFA.");
    } finally {
      setWorking(false);
    }
  }

  // ── Copiar secret ────────────────────────────────────────────────────────
  async function handleCopy() {
    if (!enrollData?.secret) return;
    await navigator.clipboard.writeText(enrollData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Seguridad</h1>
        <p className="mt-1 text-sm text-slate-400">
          Gestiona la verificación en dos pasos de tu cuenta
        </p>
      </div>

      {/* ── Panel principal ──────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-100 bg-white p-6 space-y-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-widest text-slate-400">
          Autenticación en dos pasos (2FA)
        </h2>

        {/* LOADING */}
        {state === "loading" && (
          <p className="text-sm text-slate-400">Cargando configuración…</p>
        )}

        {/* ERROR GLOBAL */}
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        {/* DISABLED — sin MFA activo */}
        {state === "disabled" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-100 p-4">
              <ShieldOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Verificación en dos pasos desactivada
                </p>
                <p className="mt-0.5 text-xs text-amber-600">
                  Actívala para proteger tu cuenta con un segundo factor de autenticación.
                </p>
              </div>
            </div>
            <Button onClick={handleStartEnroll} disabled={working} className="gap-2">
              <Smartphone className="h-4 w-4" />
              {working ? "Preparando…" : "Activar verificación en dos pasos"}
            </Button>
          </div>
        )}

        {/* ENROLLING — mostrar QR y verificar */}
        {state === "enrolling" && enrollData && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-100 p-4">
              <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
              <div className="text-sm text-blue-800 space-y-1">
                <p className="font-medium">Configura tu app de autenticación</p>
                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Abre Google Authenticator, Authy o 1Password</li>
                  <li>Escanea el código QR de abajo</li>
                  <li>Introduce el código de 6 dígitos que te muestre la app</li>
                </ol>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                dangerouslySetInnerHTML={{
                  __html: enrollData.qrCode,
                }}
                style={{ width: 200, height: 200 }}
              />
              <p className="text-xs text-slate-400">
                ¿No puedes escanear el QR?
              </p>

              {/* Secret manual */}
              <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <KeyRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="flex-1 font-mono text-xs tracking-widest text-slate-600 break-all">
                  {enrollData.secret}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  title="Copiar"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Verificar código */}
            <form onSubmit={handleConfirmEnroll} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="enroll-code">
                  Introduce el código de tu app para confirmar
                </Label>
                <Input
                  id="enroll-code"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={working || code.length < 6}
                  className="gap-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {working ? "Activando…" : "Confirmar y activar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setState("disabled"); setEnrollData(null); setCode(""); setError(""); }}
                  disabled={working}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ENABLED — MFA activo */}
        {state === "enabled" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-emerald-800">
                  Verificación en dos pasos activada
                </p>
                <p className="mt-0.5 text-xs text-emerald-600">
                  Tu cuenta está protegida con TOTP. Se te pedirá el código de tu app en cada inicio de sesión.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleUnenroll}
              disabled={working}
              className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <ShieldOff className="h-4 w-4" />
              {working ? "Desactivando…" : "Desactivar verificación en dos pasos"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

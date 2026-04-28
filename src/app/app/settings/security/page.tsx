"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck, ShieldOff, Shield, Smartphone,
  Copy, CheckCircle2, AlertTriangle, X, Loader2,
  Eye, EyeOff,
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { mfaChallengeAndVerify } from "@/lib/mfaChallengeVerify";

function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const refs  = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

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
    onChange((value.slice(0, i) + chars + value.slice(i + chars.length)).slice(0, 6));
    setTimeout(() => refs.current[Math.min(i + chars.length, 5)]?.focus(), 0);
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(p);
    setTimeout(() => refs.current[Math.min(p.length, 5)]?.focus(), 0);
  }

  return (
    <div className="flex items-center gap-2.5 flex-wrap">
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
        />
      ))}
    </div>
  );
}

type Step = "idle" | "enrolling" | "confirming" | "done";

export default function SecurityPage() {
  const supabase = createSupabaseClient();

  const [twoFAEnabled, setTwoFAEnabled] = useState<boolean | null>(null);
  const [loading,      setLoading]      = useState(true);

  const [step,         setStep]         = useState<Step>("idle");
  const [enrollData,   setEnrollData]   = useState<{
    qrCode: string;
    secret: string;
    factorId: string;
  } | null>(null);
  const [confirmCode,  setConfirmCode]  = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [disabling,    setDisabling]    = useState(false);
  const [disableError, setDisableError] = useState("");

  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => { void loadStatus(); }, []);

  async function loadStatus() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verified = data?.totp?.filter((f) => f.status === "verified") ?? [];
      setTwoFAEnabled(verified.length > 0);
    } catch {
      setTwoFAEnabled(false);
    } finally {
      setLoading(false);
    }
  }

  async function startEnroll() {
    setStep("enrolling");
    setEnrollData(null);
    setConfirmCode("");
    setConfirmError("");

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer:     "PayForce",
      });
      if (error) throw error;
      if (!data?.totp?.qr_code || !data.totp.secret || !data.id) {
        throw new Error("Respuesta incompleta del servidor");
      }
      setEnrollData({
        qrCode:   data.totp.qr_code,
        secret:   data.totp.secret,
        factorId: data.id,
      });
      setStep("confirming");
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Error al iniciar configuración");
      setStep("idle");
    }
  }

  const confirmEnroll = useCallback(async (code: string) => {
    if (!enrollData || code.length !== 6) return;
    setConfirmLoading(true);
    setConfirmError("");

    try {
      const { error: ve } = await mfaChallengeAndVerify(supabase, enrollData.factorId, code);
      if (ve) {
        setConfirmError("Código incorrecto");
        setConfirmCode("");
        return;
      }

      const sync = await fetch("/api/auth/2fa/sync", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ enabled: true }),
      });
      if (!sync.ok) {
        const j = await sync.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? "Error al sincronizar");
      }

      setTwoFAEnabled(true);
      setStep("done");
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Error al verificar");
    } finally {
      setConfirmLoading(false);
    }
  }, [enrollData, supabase]);

  useEffect(() => {
    if (step === "confirming" && confirmCode.length === 6 && !confirmLoading && enrollData) {
      void confirmEnroll(confirmCode);
    }
  }, [step, confirmCode, confirmLoading, enrollData, confirmEnroll]);

  async function disableTwoFA() {
    if (!confirm("¿Desactivar el 2FA? Tu cuenta quedará menos protegida.")) return;
    setDisabling(true);
    setDisableError("");

    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const factors = data?.totp?.filter((f) => f.status === "verified") ?? [];
      for (const f of factors) {
        const { error: ue } = await supabase.auth.mfa.unenroll({ factorId: f.id });
        if (ue) throw ue;
      }

      const sync = await fetch("/api/auth/2fa/sync", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ enabled: false }),
      });
      if (!sync.ok) {
        const j = await sync.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? "Error al sincronizar");
      }

      setTwoFAEnabled(false);
      setStep("idle");
      setEnrollData(null);
    } catch (err) {
      setDisableError(err instanceof Error ? err.message : "Error al desactivar");
    } finally {
      setDisabling(false);
    }
  }

  function copySecret() {
    if (!enrollData) return;
    navigator.clipboard.writeText(enrollData.secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] px-6 py-8">
      <div className="mx-auto max-w-2xl space-y-6">

        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">Seguridad</h1>
          <p className="mt-1 text-[13px] text-[#6e6e73]">
            Autenticación en dos pasos (TOTP) con Supabase MFA y registro de actividad.
          </p>
          <Link
            href="/dashboard/security"
            className="mt-3 inline-block text-[13px] font-medium text-[#0071e3] hover:underline"
          >
            Ver actividad reciente en seguridad →
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                twoFAEnabled ? "bg-emerald-50" : "bg-slate-100"
              }`}>
                {twoFAEnabled
                  ? <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  : <Shield className="h-5 w-5 text-slate-400" />
                }
              </div>
              <div>
                <p className="text-[15px] font-semibold text-slate-900">Autenticación en dos pasos</p>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  Google Authenticator, Authy u otra app compatible (TOTP).
                </p>
              </div>
            </div>
            <div className="shrink-0 ml-4">
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
              ) : (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  twoFAEnabled
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${twoFAEnabled ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {twoFAEnabled ? "Activado" : "Desactivado"}
                </span>
              )}
            </div>
          </div>

          <div className="px-6 py-5">
            {loading ? (
              <div className="space-y-3">
                <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ) : twoFAEnabled && step !== "idle" && step !== "done" ? null : twoFAEnabled ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-[13px] text-emerald-800">
                    Tu cuenta está protegida con MFA de Supabase (TOTP).
                  </p>
                </div>
                {disableError && (
                  <p className="text-[13px] text-red-600 rounded-xl bg-red-50 px-4 py-3">{disableError}</p>
                )}
                <button
                  onClick={() => void disableTwoFA()}
                  disabled={disabling}
                  className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {disabling
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <ShieldOff className="h-3.5 w-3.5" />
                  }
                  Desactivar 2FA
                </button>
              </div>
            ) : step === "confirming" && enrollData ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-semibold text-slate-900">Configura tu autenticador</p>
                  <button type="button" onClick={() => { setStep("idle"); setEnrollData(null); }}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">1</span>
                    <p className="text-[13px] font-medium text-slate-700">Escanea el código QR</p>
                  </div>
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                    <div className="shrink-0 rounded-2xl border-4 border-slate-100 p-2 bg-white shadow-sm overflow-hidden w-[180px] h-[180px]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- data URL del QR de Supabase */}
                      <img
                        src={enrollData.qrCode}
                        alt="Código QR 2FA"
                        width={180}
                        height={180}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50">
                        <Smartphone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <p className="text-[12px] text-slate-500">
                          Abre <strong className="text-slate-700">Google Authenticator</strong> o <strong className="text-slate-700">Authy</strong> y escanea el código.
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                          Clave manual
                        </p>
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <code className={`flex-1 text-[12px] font-mono text-slate-700 break-all ${showSecret ? "" : "select-none tracking-widest"}`}>
                            {showSecret ? enrollData.secret : "•".repeat(Math.min(enrollData.secret.length, 32))}
                          </code>
                          <button type="button" onClick={() => setShowSecret(!showSecret)}
                            className="text-slate-400 hover:text-slate-600 transition shrink-0">
                            {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          <button type="button" onClick={copySecret}
                            className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition shrink-0">
                            {copied
                              ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Copiado</>
                              : <><Copy className="h-3.5 w-3.5" />Copiar</>
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">2</span>
                    <p className="text-[13px] font-medium text-slate-700">Introduce el código de 6 dígitos (se verifica al completar)</p>
                  </div>
                  <OtpInput value={confirmCode} onChange={setConfirmCode} disabled={confirmLoading} />
                  {confirmError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <p className="text-[12px] text-red-700">{confirmError}</p>
                    </div>
                  )}
                  {confirmLoading && (
                    <p className="text-[12px] text-slate-500 flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando…
                    </p>
                  )}
                </div>
              </div>
            ) : step === "done" ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-2 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                    <ShieldCheck className="h-7 w-7 text-emerald-600" />
                  </div>
                  <p className="text-[16px] font-semibold text-slate-900">2FA activado</p>
                  <p className="text-[13px] text-slate-500">
                    En los próximos inicios de sesión se te pedirá un código de tu app autenticadora.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setStep("idle"); void loadStatus(); }}
                  className="w-full rounded-xl bg-slate-900 py-2.5 text-[13px] font-semibold text-white hover:bg-slate-800"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[13px] text-slate-500">
                  Protege tu cuenta con TOTP gestionado por Supabase Auth (sin secretos almacenados en servidores PayForce).
                </p>
                <button
                  type="button"
                  onClick={() => void startEnroll()}
                  disabled={step === "enrolling"}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-60"
                >
                  {step === "enrolling"
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <ShieldCheck className="h-3.5 w-3.5" />
                  }
                  Activar 2FA
                </button>
              </div>
            )}
          </div>
        </div>

        {!twoFAEnabled && step === "idle" && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
            <p className="text-[13px] font-semibold text-slate-800 mb-3">Aplicaciones compatibles</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { name: "Google Authenticator", platform: "iOS / Android" },
                { name: "Authy",                platform: "iOS / Android / Desktop" },
                { name: "1Password",            platform: "Multiplataforma" },
              ].map((app) => (
                <div key={app.name} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <p className="text-[12px] font-medium text-slate-800">{app.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{app.platform}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

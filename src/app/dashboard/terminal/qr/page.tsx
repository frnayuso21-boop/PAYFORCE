"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";
import {
  QrCode, Loader2, CheckCircle2, RotateCcw, ArrowLeft,
} from "lucide-react";
import Link from "next/link";

// ─── helpers ──────────────────────────────────────────────────────────────────

function centsFromInput(raw: string): number {
  const n = parseFloat(raw.replace(",", "."));
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function formatMoney(cents: number, cur = "EUR") {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: cur }).format(cents / 100);
}

// ─── tipos ────────────────────────────────────────────────────────────────────

type Phase = "form" | "qr" | "paid";

interface LinkInfo {
  token:    string;
  url:      string;
  amount:   number;
  currency: string;
}

// ─── Logo PayForce (hexágono) para el centro del QR ──────────────────────────

function PayforceLogo({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      className="drop-shadow-sm"
    >
      <path
        d="M14 2L25.5 8.5V21.5L14 28L2.5 21.5V8.5L14 2Z"
        fill="#0A0A0A"
      />
      <path
        d="M10 10h5.5c1.9 0 3 1 3 2.6 0 1.7-1.1 2.7-3 2.7H12v2.7H10V10zm2 1.8v1.8h3.3c.7 0 1.1-.3 1.1-.9s-.4-.9-1.1-.9H12z"
        fill="white"
      />
    </svg>
  );
}

// ─── Pulso de espera animado ──────────────────────────────────────────────────

function WaitingPulse() {
  return (
    <div className="flex items-center gap-2 text-amber-600">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
      </span>
      <span className="text-[13px] font-medium">Esperando pago…</span>
    </div>
  );
}

// ─── Pantalla de éxito ────────────────────────────────────────────────────────

function SuccessScreen({
  amount,
  currency,
  onReset,
}: {
  amount: number;
  currency: string;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
      {/* Círculo animado */}
      <div className="relative flex h-28 w-28 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/25" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 ring-4 ring-emerald-200">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        </div>
      </div>

      <div>
        <p className="text-[15px] font-semibold text-slate-500">Pago recibido</p>
        <p className="mt-1 text-[42px] font-bold tracking-tight text-slate-900 leading-none">
          {formatMoney(amount, currency)}
        </p>
      </div>

      <p className="text-[13px] text-slate-400">
        El cobro se ha procesado correctamente.
      </p>

      <button
        onClick={onReset}
        className="flex items-center gap-2 rounded-2xl bg-slate-900 px-7 py-3.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-slate-700 active:scale-95"
      >
        <RotateCcw className="h-4 w-4" />
        Nuevo cobro
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function QRPaymentPage() {
  const [amountStr,   setAmountStr]   = useState("");
  const [description, setDescription] = useState("");
  const [phase,       setPhase]       = useState<Phase>("form");
  const [linkInfo,    setLinkInfo]    = useState<LinkInfo | null>(null);
  const [qrDataUrl,   setQrDataUrl]   = useState<string | null>(null);
  const [busy,        setBusy]        = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef  = useRef<HTMLAudioElement | null>(null);

  const cents = centsFromInput(amountStr);
  const canGenerate = cents >= 50 && description.trim().length > 0;

  // ── Limpiar polling al desmontar ──────────────────────────────────────────
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── Polling de estado ─────────────────────────────────────────────────────
  const startPolling = useCallback((token: string, amount: number, currency: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/payment-links/${token}/status`);
        if (!res.ok) return;
        const data = await res.json() as { status: string; amount: number; currency: string };

        if (data.status === "paid") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          // Reproducir sonido de éxito
          try {
            const ctx  = new AudioContext();
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type      = "sine";
            osc.frequency.setValueAtTime(523, ctx.currentTime);          // C5
            osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);   // E5
            osc.frequency.setValueAtTime(784, ctx.currentTime + 0.30);   // G5
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.8);
          } catch { /* AudioContext no disponible */ }

          setLinkInfo((prev) => prev ? { ...prev, amount: data.amount, currency: data.currency } : prev);
          setPhase("paid");
        }
      } catch { /* silencio en errores de polling */ }
    }, 3000);
  }, []);

  // ── Generar QR ────────────────────────────────────────────────────────────
  const generate = useCallback(async () => {
    if (!canGenerate) return;
    setBusy(true);
    setError(null);

    try {
      // 1. Crear payment link
      const res = await fetch("/api/payment-links", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount:      cents,
          currency:    "eur",
          description: description.trim(),
        }),
      });
      const data = await res.json() as {
        token?: string; url?: string;
        amount?: number; currency?: string; error?: string;
      };
      if (!res.ok || !data.token || !data.url) {
        throw new Error(data.error ?? "No se pudo crear el link");
      }

      // 2. Generar QR
      const qr = await QRCode.toDataURL(data.url, {
        width:  300,
        margin: 2,
        color:  { dark: "#0A0A0A", light: "#FFFFFF" },
        errorCorrectionLevel: "H",  // nivel alto para dejar espacio al logo
      });

      setLinkInfo({
        token:    data.token,
        url:      data.url,
        amount:   data.amount ?? cents,
        currency: data.currency ?? "eur",
      });
      setQrDataUrl(qr);
      setPhase("qr");

      // 3. Iniciar polling
      startPolling(data.token, data.amount ?? cents, data.currency ?? "eur");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al generar el QR");
    } finally {
      setBusy(false);
    }
  }, [canGenerate, cents, description, startPolling]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setPhase("form");
    setLinkInfo(null);
    setQrDataUrl(null);
    setAmountStr("");
    setDescription("");
    setError(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-4 shadow-sm">
        <Link
          href="/dashboard/terminal"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900">
            <QrCode className="h-4 w-4 text-white" />
          </div>
          <span className="text-[16px] font-semibold text-slate-900 tracking-tight">Cobro por QR</span>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex flex-1 flex-col items-center justify-start px-4 py-6 md:py-10">
        <div className="w-full max-w-sm">

          {/* ── FASE ÉXITO ─────────────────────────────────────── */}
          {phase === "paid" && linkInfo && (
            <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
              <SuccessScreen
                amount={linkInfo.amount}
                currency={linkInfo.currency}
                onReset={reset}
              />
            </div>
          )}

          {/* ── FASE QR ────────────────────────────────────────── */}
          {phase === "qr" && linkInfo && qrDataUrl && (
            <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 flex flex-col items-center gap-5">

                {/* Importe */}
                <div className="text-center">
                  <p className="text-[12px] font-semibold uppercase tracking-widest text-slate-400">Importe a cobrar</p>
                  <p className="mt-1 text-[38px] font-bold tracking-tight text-slate-900 leading-none tabular-nums">
                    {formatMoney(linkInfo.amount, linkInfo.currency)}
                  </p>
                  {description && (
                    <p className="mt-2 text-[13px] text-slate-500 line-clamp-1">{description}</p>
                  )}
                </div>

                {/* QR con logo centrado */}
                <div className="relative rounded-2xl border border-slate-100 bg-white p-3 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="QR de pago"
                    width={280}
                    height={280}
                    className="rounded-xl"
                  />
                  {/* Logo flotante en el centro */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full bg-white p-1.5 shadow-md">
                      <PayforceLogo size={36} />
                    </div>
                  </div>
                </div>

                {/* URL del link */}
                <p className="text-center text-[11px] font-mono text-slate-400 break-all leading-relaxed">
                  {linkInfo.url}
                </p>

                {/* Estado de espera */}
                <div className="w-full rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-center justify-center">
                  <WaitingPulse />
                </div>

                <p className="text-center text-[11px] text-slate-400 leading-relaxed">
                  El estado se comprueba automáticamente cada 3 segundos.
                  <br />
                  Cuando el cliente pague aparecerá la confirmación.
                </p>

                {/* Cancelar */}
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Cancelar y volver
                </button>
              </div>
            </div>
          )}

          {/* ── FASE FORMULARIO ────────────────────────────────── */}
          {phase === "form" && (
            <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
              {/* Cabecera del card */}
              <div className="px-6 pt-6 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900">
                    <QrCode className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold text-slate-900 leading-tight">Genera el QR</h2>
                    <p className="text-[12px] text-slate-400 mt-0.5">El cliente lo escanea y paga al instante</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Importe */}
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Importe <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400 text-xl font-medium select-none">€</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 pl-10 pr-4 py-4 text-3xl font-bold text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 tabular-nums"
                    />
                  </div>
                  {cents > 0 && cents < 50 && (
                    <p className="mt-1.5 text-[11px] text-amber-500">Mínimo 0,50 €</p>
                  )}
                  {cents >= 50 && (
                    <p className="mt-1.5 text-[12px] font-semibold text-emerald-600">
                      {formatMoney(cents)}
                    </p>
                  )}
                </div>

                {/* Concepto */}
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Concepto <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Cuota mensual mayo"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3 text-[13px] text-rose-600">
                    {error}
                  </div>
                )}

                {/* Botón generar */}
                <button
                  type="button"
                  disabled={!canGenerate || busy}
                  onClick={() => void generate()}
                  className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-slate-900 py-4 text-[15px] font-semibold text-white shadow-sm transition hover:bg-slate-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy
                    ? <><Loader2 className="h-5 w-5 animate-spin" />Creando link…</>
                    : <><QrCode  className="h-5 w-5" />Generar QR</>
                  }
                </button>

                {/* Info */}
                <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3.5 space-y-1.5">
                  {[
                    "Se crea un link de pago único",
                    "El cliente escanea y paga con tarjeta",
                    "Recibes confirmación inmediata en pantalla",
                  ].map((tip) => (
                    <p key={tip} className="flex items-start gap-2 text-[12px] text-slate-500 leading-relaxed">
                      <span className="mt-0.5 text-slate-300">·</span>
                      {tip}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Audio element oculto (por si acaso necesitamos un archivo de audio) */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

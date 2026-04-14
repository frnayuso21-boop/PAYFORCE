"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWindowSize } from "@/hooks/useWindowSize";
import { Delete, CheckCircle2, Loader2, ArrowLeft, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "keypad" | "nfc" | "processing" | "success" | "declined";
type NfcState = "waiting" | "detected" | "reading";

const KEYS = ["1","2","3","4","5","6","7","8","9",".", "0","⌫"];

function formatDisplay(raw: string): string {
  if (!raw || raw === "0") return "0,00";
  const digits = raw.replace(".", "");
  const num    = parseInt(digits, 10) / 100;
  return num.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function rawToEuros(raw: string): number {
  return parseInt((raw || "0").replace(".", ""), 10) / 100;
}
function rawToCents(raw: string): number {
  return Math.round(rawToEuros(raw) * 100);
}

/* ── Icono NFC SVG ────────────────────────────────────────────────────────── */
function NfcIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M10 24 C10 16 16 10 24 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.3"/>
      <path d="M7  24 C7  14.5 14.5 7 24 7"  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.2"/>
      <path d="M13 24 C13 17.4 17.4 13 24 13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5"/>
      <path d="M16 24 C16 19.6 19.6 16 24 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
      <path d="M19 24 C19 21.2 21.2 19 24 19 L24 38 C18 38 14 31 14 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <rect x="22" y="16" width="4" height="22" rx="2" fill="currentColor"/>
    </svg>
  );
}

/* ── Ondas NFC animadas ───────────────────────────────────────────────────── */
function NfcWaves({ active }: { active: boolean }) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Ondas externas */}
      {[0,1,2].map((i) => (
        <div
          key={i}
          className={cn(
            "absolute rounded-full border transition-all duration-500",
            active ? "border-white/20 animate-ping" : "border-white/10"
          )}
          style={{
            width:  `${(i + 2) * 64}px`,
            height: `${(i + 2) * 64}px`,
            animationDuration: `${1.4 + i * 0.4}s`,
            animationDelay:    `${i * 0.3}s`,
          }}
        />
      ))}
      {/* Círculo central */}
      <div className={cn(
        "relative z-10 flex h-36 w-36 items-center justify-center rounded-full border-2 transition-all duration-500",
        active
          ? "border-white/40 bg-white/10"
          : "border-white/20 bg-white/5"
      )}>
        <NfcIcon size={52} className={cn("transition-colors duration-300", active ? "text-white" : "text-white/50")} />
      </div>
    </div>
  );
}

/* ── Icono tarjeta ───────────────────────────────────────────────────────── */
function CardIcon() {
  return (
    <svg width="80" height="52" viewBox="0 0 80 52" fill="none">
      <rect x="1" y="1" width="78" height="50" rx="7" fill="#1e293b" stroke="white" strokeWidth="1.5" strokeOpacity="0.3"/>
      <rect x="8" y="14" width="20" height="14" rx="3" fill="#f59e0b" opacity="0.9"/>
      <rect x="8" y="34" width="30" height="4" rx="2" fill="white" opacity="0.3"/>
      <rect x="8" y="40" width="20" height="4" rx="2" fill="white" opacity="0.2"/>
      {/* NFC en tarjeta */}
      <path d="M58 22 C58 18 61 16 64 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      <path d="M56 24 C56 17 60 13 66 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <path d="M54 26 C54 16 59 10 68 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
    </svg>
  );
}

export default function TapToPayPage() {
  const router     = useRouter();
  const { width }  = useWindowSize();

  // Solo disponible en móvil — redirige a dashboard en desktop
  useEffect(() => {
    if (width !== undefined && width >= 768) {
      router.replace("/app/dashboard");
    }
  }, [width, router]);

  const [phase,       setPhase]       = useState<Phase>("keypad");
  const [nfcState,    setNfcState]    = useState<NfcState>("waiting");
  const [raw,         setRaw]         = useState("000");
  const [description, setDescription] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [linkToken,   setLinkToken]   = useState("");
  const [paidAmount,  setPaidAmount]  = useState(0);
  const [simulating,  setSimulating]  = useState(false);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const simRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Teclado ──────────────────────────────────────────────────────────── */
  function handleKey(k: string) {
    if (k === "⌫") { setRaw((p) => p.length <= 1 ? "0" : p.slice(0, -1)); return; }
    if (k === ".") return;
    setRaw((p) => { const n = p === "0" ? k : p + k; return n.length > 8 ? p : n; });
  }

  /* ── Crear cobro ──────────────────────────────────────────────────────── */
  async function handleCharge() {
    const cents = rawToCents(raw);
    if (cents < 50) { setError("El importe mínimo es 0,50 €"); return; }
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/payment-links", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          amount:      cents,
          currency:    "eur",
          description: description || "Cobro presencial",
          maxUses:     1,
          metadata:    { source: "tap-to-pay" },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setLinkToken(data.token as string);
      setPaidAmount(data.amount as number);
      setNfcState("waiting");
      setPhase("nfc");
      startPolling(data.token as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  /* ── Polling real ─────────────────────────────────────────────────────── */
  const startPolling = useCallback((token: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/payment-links/${token}/status`);
        const data = await res.json();
        if (data.status === "paid") {
          clearInterval(pollRef.current!);
          triggerSuccess();
        }
      } catch { /* ignora */ }
    }, 2500);
  }, []); // eslint-disable-line

  /* ── Demo: simular lectura NFC ────────────────────────────────────────── */
  function simulateNfc() {
    if (simulating) return;
    setSimulating(true);
    setNfcState("detected");
    simRef.current = setTimeout(() => {
      setNfcState("reading");
      simRef.current = setTimeout(() => {
        setPhase("processing");
        simRef.current = setTimeout(() => {
          triggerSuccess();
        }, 1800);
      }, 1200);
    }, 800);
  }

  function triggerSuccess() {
    if (pollRef.current) clearInterval(pollRef.current);
    setSimulating(false);
    setPhase("success");
  }

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (simRef.current)  clearTimeout(simRef.current);
  }, []);

  /* ── Reset ────────────────────────────────────────────────────────────── */
  function reset() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (simRef.current)  clearTimeout(simRef.current);
    setPhase("keypad");
    setRaw("000");
    setDescription("");
    setLinkToken("");
    setError("");
    setSimulating(false);
    setNfcState("waiting");
  }

  /* ══════════════════════════════════════════════════════════════════════════
     FASE: TECLADO
  ══════════════════════════════════════════════════════════════════════════ */
  if (phase === "keypad") {
    return (
      <div className="flex flex-col min-h-screen bg-[#0a0a0f] text-white select-none">
        <div className="flex items-center justify-between px-5 pt-12 pb-3">
          <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 active:bg-white/20">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-[13px] font-semibold tracking-widest text-white/50 uppercase">Cobro presencial</span>
          <div className="w-9" />
        </div>

        {/* Importe */}
        <div className="flex flex-col items-center justify-center flex-1 pb-2">
          <div className="flex items-start gap-1 mb-3">
            <span className="mt-3 text-[22px] font-light text-white/40">€</span>
            <span className={cn(
              "font-bold tabular-nums leading-none transition-all duration-150",
              rawToEuros(raw) === 0 ? "text-[60px] text-white/20" : "text-[60px] text-white"
            )}>
              {formatDisplay(raw)}
            </span>
          </div>
          <input
            type="text"
            placeholder="Concepto (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-52 rounded-2xl bg-white/8 px-4 py-2.5 text-center text-[14px] text-white placeholder:text-white/25 outline-none focus:bg-white/12 transition"
            maxLength={60}
          />
          {error && <p className="mt-3 text-[13px] text-red-400">{error}</p>}
        </div>

        {/* Teclado */}
        <div className="px-5 pb-4">
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            {KEYS.map((k) => (
              <button
                key={k}
                onClick={() => handleKey(k)}
                className={cn(
                  "flex h-[66px] items-center justify-center rounded-2xl text-[28px] font-medium transition-all active:scale-95",
                  k === "⌫" ? "bg-white/6 text-white/50" : "bg-white/10 text-white active:bg-white/18"
                )}
              >
                {k === "⌫" ? <Delete className="h-6 w-6" /> : k}
              </button>
            ))}
          </div>

          <button
            onClick={handleCharge}
            disabled={loading || rawToCents(raw) < 50}
            className="w-full h-[58px] rounded-2xl bg-white text-[#0a0a0f] text-[17px] font-bold active:scale-[0.98] disabled:opacity-30 transition-all flex items-center justify-center gap-2.5"
          >
            {loading
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <>
                  <NfcIcon size={20} className="text-[#0a0a0f]" />
                  Cobrar {rawToEuros(raw) > 0 ? `€${formatDisplay(raw)}` : ""}
                </>
            }
          </button>
        </div>
        <div className="pb-8" />
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════════
     FASE: NFC — Esperando tarjeta
  ══════════════════════════════════════════════════════════════════════════ */
  if (phase === "nfc") {
    const isDetected = nfcState === "detected" || nfcState === "reading";
    const statusText = {
      waiting:  "Acerca una tarjeta o dispositivo",
      detected: "Tarjeta detectada...",
      reading:  "Leyendo...",
    }[nfcState];

    return (
      <div className="flex flex-col min-h-screen bg-[#0a0a0f] text-white select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-12 pb-3">
          <button onClick={reset} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 active:bg-white/20">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full transition-colors", isDetected ? "bg-emerald-400" : "bg-white/30 animate-pulse")} />
            <span className="text-[13px] font-semibold tracking-widest text-white/50 uppercase">
              {isDetected ? "Leyendo" : "Listo"}
            </span>
          </div>
          <div className="w-9" />
        </div>

        {/* Centro */}
        <div className="flex flex-col items-center justify-center flex-1 gap-8 px-6">

          {/* Importe */}
          <div className="text-center">
            <p className="text-[13px] text-white/30 uppercase tracking-widest mb-1">Total a cobrar</p>
            <p className="text-[52px] font-bold tabular-nums leading-none">
              €{formatDisplay(String(paidAmount))}
            </p>
            {description ? (
              <p className="mt-2 text-[14px] text-white/40">{description}</p>
            ) : null}
          </div>

          {/* Animación NFC */}
          <div
            className="cursor-pointer active:scale-95 transition-transform"
            onClick={simulateNfc}
          >
            <NfcWaves active={isDetected} />
          </div>

          {/* Estado */}
          <div className="flex flex-col items-center gap-3">
            <p className={cn(
              "text-[16px] font-medium transition-all duration-300",
              isDetected ? "text-emerald-400" : "text-white/60"
            )}>
              {statusText}
            </p>

            {/* Icono de tarjeta con efecto de acercamiento */}
            <div className={cn(
              "transition-all duration-500",
              isDetected ? "opacity-100 translate-y-0 scale-105" : "opacity-40 translate-y-2 scale-95"
            )}>
              <CardIcon />
            </div>

            <p className="text-[11px] text-white/20 text-center max-w-[200px]">
              Acepta tarjeta contactless, Apple Pay, Google Pay
            </p>
          </div>

          {/* Demo button */}
          {!simulating && (
            <button
              onClick={simulateNfc}
              className="mt-2 rounded-full border border-white/15 px-6 py-2.5 text-[13px] text-white/40 active:bg-white/5 transition-all"
            >
              ▶ Simular lectura (demo)
            </button>
          )}
        </div>
        <div className="pb-10" />
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════════
     FASE: PROCESANDO
  ══════════════════════════════════════════════════════════════════════════ */
  if (phase === "processing") {
    return (
      <div className="flex flex-col min-h-screen bg-[#0a0a0f] text-white items-center justify-center gap-6 select-none">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-white/10 animate-spin [animation-duration:1.5s]
            [border-top-color:white]" />
          <NfcIcon size={40} className="text-white/60" />
        </div>
        <div className="text-center">
          <p className="text-[20px] font-semibold text-white">Procesando pago</p>
          <p className="mt-1 text-[14px] text-white/40">€{formatDisplay(String(paidAmount))}</p>
        </div>
        <p className="text-[12px] text-white/20">No retires la tarjeta...</p>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════════
     FASE: DECLINED
  ══════════════════════════════════════════════════════════════════════════ */
  if (phase === "declined") {
    return (
      <div className="flex flex-col min-h-screen bg-[#0a0a0f] text-white items-center justify-center px-6 gap-5 select-none">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500/15">
          <XCircle className="h-12 w-12 text-red-400" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-[24px] font-bold">Pago rechazado</p>
          <p className="mt-1 text-[14px] text-white/40">La tarjeta fue denegada</p>
        </div>
        <button onClick={reset} className="mt-4 w-full max-w-xs h-[54px] rounded-2xl bg-white text-[#0a0a0f] text-[16px] font-bold active:scale-[0.98]">
          Reintentar
        </button>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════════
     FASE: ÉXITO
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f] text-white items-center justify-center px-6 select-none">
      <div className="flex flex-col items-center gap-5 text-center">
        {/* Éxito animado */}
        <div className="relative flex h-32 w-32 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/15" />
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping [animation-duration:2s]" />
          <CheckCircle2 className="relative z-10 h-14 w-14 text-emerald-400" strokeWidth={1.5} />
        </div>

        <div>
          <p className="text-[42px] font-bold leading-none mb-1">
            €{formatDisplay(String(paidAmount))}
          </p>
          <p className="text-[22px] font-semibold text-emerald-400">¡Cobrado!</p>
          {description && (
            <p className="mt-2 text-[13px] text-white/35">{description}</p>
          )}
        </div>

        {/* Ticket mini */}
        <div className="w-full max-w-xs rounded-2xl bg-white/6 border border-white/10 px-5 py-4 text-left mt-2">
          <div className="flex justify-between text-[13px] mb-2">
            <span className="text-white/40">Método</span>
            <span className="text-white/70 flex items-center gap-1.5">
              <NfcIcon size={13} className="text-white/50" />
              Tarjeta contactless
            </span>
          </div>
          <div className="flex justify-between text-[13px] mb-2">
            <span className="text-white/40">Estado</span>
            <span className="text-emerald-400 font-medium">Aprobado</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-white/40">Fecha</span>
            <span className="text-white/60">{new Date().toLocaleString("es-ES", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</span>
          </div>
        </div>

        <button
          onClick={reset}
          className="w-full max-w-xs h-[54px] rounded-2xl bg-white text-[#0a0a0f] text-[16px] font-bold active:scale-[0.98] transition-all"
        >
          Nuevo cobro
        </button>
        <button onClick={() => router.push("/app/dashboard")} className="text-[13px] text-white/30 active:text-white/60">
          Ir al dashboard
        </button>
      </div>
    </div>
  );
}

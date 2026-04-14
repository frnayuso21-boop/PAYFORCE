"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { QrCode, Copy, CheckCircle, RefreshCw, Share2, Maximize2, X, Download } from "lucide-react";
import QRCode from "qrcode";

type Phase = "input" | "display" | "success";

const KEYS = [
  ["1","2","3"],
  ["4","5","6"],
  ["7","8","9"],
  [".","0","⌫"],
];

function fmtCents(c: number) {
  return (c / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export default function QrPaymentPage() {
  const [phase,      setPhase]      = useState<Phase>("input");
  const [amount,     setAmount]     = useState("");
  const [concept,    setConcept]    = useState("");
  const [qrDataUrl,  setQrDataUrl]  = useState("");
  const [payUrl,     setPayUrl]     = useState("");
  const [linkToken,  setLinkToken]  = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [copied,     setCopied]     = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const imgRef  = useRef<HTMLImageElement>(null);

  function pressKey(v: string) {
    if (v === "⌫") { setAmount((a) => a.slice(0, -1)); return; }
    if (v === "." && amount.includes(".")) return;
    if (v === "." && amount === "")       { setAmount("0."); return; }
    const next = amount + v;
    if ((next.split(".")[1]?.length ?? 0) > 2) return;
    setAmount(next);
  }

  const euros  = parseFloat(amount || "0");
  const cents  = Math.round(euros * 100);
  const canPay = cents >= 50;

  async function generate() {
    if (!canPay) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/payment-links", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ amount: cents, currency: "eur", description: concept || "Pago por QR" }),
      });
      const d = await r.json();

      if (!r.ok) {
        setError(d.error ?? "Error al crear el enlace de pago");
        return;
      }

      const url = d.url   as string;
      const tok = d.token as string;

      if (!url || !tok) {
        setError("La API no devolvió una URL válida. Revisa la consola.");
        return;
      }

      setPayUrl(url);
      setLinkToken(tok);

      const dataUrl = await QRCode.toDataURL(url, {
        width:   400,
        margin:  2,
        color:   { dark: "#0f172a", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      setQrDataUrl(dataUrl);
      setPhase("display");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const poll = useCallback(async () => {
    if (!linkToken) return;
    try {
      const r = await fetch(`/api/payment-links/${linkToken}/status`);
      if (!r.ok) return;
      const d = await r.json();
      if (d.status === "paid") {
        if (pollRef.current) clearInterval(pollRef.current);
        setPhase("success");
      }
    } catch { /* error de red transitorio */ }
  }, [linkToken]);

  useEffect(() => {
    if (phase !== "display" || !linkToken) return;
    pollRef.current = setInterval(poll, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [phase, linkToken, poll]);

  async function copy() {
    try { await navigator.clipboard.writeText(payUrl); } catch { /* fallback */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: "Enlace de pago", url: payUrl }); return; }
      catch { /* cancelado */ }
    }
    copy();
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const a    = document.createElement("a");
    a.href     = qrDataUrl;
    a.download = `qr-pago-${cents}cts.png`;
    a.click();
  }

  function reset() {
    setPhase("input");
    setAmount("");
    setConcept("");
    setQrDataUrl("");
    setPayUrl("");
    setLinkToken("");
    setFullscreen(false);
    if (pollRef.current) clearInterval(pollRef.current);
  }

  /* ─── ÉXITO ──────────────────────────────────────────────────────────────── */
  if (phase === "success") return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fb] p-8 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 mb-6">
        <CheckCircle className="h-12 w-12 text-emerald-500" strokeWidth={1.5} />
      </div>
      <p className="text-[32px] font-bold text-slate-900">{fmtCents(cents)}</p>
      <p className="text-[18px] font-semibold text-emerald-600 mt-1">¡Pago recibido!</p>
      {concept && <p className="text-[13px] text-slate-400 mt-1">{concept}</p>}
      <button onClick={reset}
        className="mt-8 rounded-2xl bg-slate-900 px-8 py-3.5 text-[14px] font-bold text-white hover:bg-slate-700 transition">
        Nuevo cobro
      </button>
    </div>
  );

  /* ─── MOSTRAR QR ─────────────────────────────────────────────────────────── */
  if (phase === "display") return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fb] p-8">
        <div className="w-full max-w-sm">
          <div className="mb-5 text-center">
            <p className="text-[13px] text-slate-400 mb-0.5">El cliente escanea con su cámara</p>
            <p className="text-[28px] font-bold text-slate-900">{fmtCents(cents)}</p>
            {concept && <p className="text-[13px] text-slate-500 mt-0.5">{concept}</p>}
          </div>

          <div className="relative rounded-3xl bg-white p-6 shadow-lg border border-slate-200 mb-5 flex flex-col items-center">
            <img ref={imgRef} src={qrDataUrl} alt="QR de pago"
              className="w-full max-w-[320px] rounded-2xl" />
            <button onClick={() => setFullscreen(true)}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition">
              <Maximize2 className="h-4 w-4 text-slate-500" />
            </button>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[12px] text-slate-400">Esperando pago…</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 mb-3">
            <button onClick={copy}
              className={`flex flex-col items-center gap-1 rounded-2xl py-3 text-[11px] font-semibold transition ${
                copied ? "bg-emerald-100 text-emerald-700" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}>
              {copied ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              {copied ? "Copiado" : "Copiar URL"}
            </button>
            <button onClick={share}
              className="flex flex-col items-center gap-1 rounded-2xl bg-white border border-slate-200 py-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition">
              <Share2 className="h-5 w-5" />
              Compartir
            </button>
            <button onClick={downloadQr}
              className="flex flex-col items-center gap-1 rounded-2xl bg-white border border-slate-200 py-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition">
              <Download className="h-5 w-5" />
              Descargar
            </button>
          </div>

          <button onClick={reset}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-[13px] text-slate-400 hover:bg-slate-50 transition">
            Cancelar y nuevo cobro
          </button>
        </div>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
          <button onClick={() => setFullscreen(false)}
            className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition">
            <X className="h-5 w-5 text-slate-600" />
          </button>
          <p className="text-[14px] text-slate-400 mb-2">Escanea para pagar</p>
          <p className="text-[32px] font-bold text-slate-900 mb-6">{fmtCents(cents)}</p>
          <img src={qrDataUrl} alt="QR" className="w-[80vmin] max-w-[420px] rounded-2xl" />
          {concept && <p className="mt-4 text-[14px] text-slate-400">{concept}</p>}
          <div className="mt-5 flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[13px] text-slate-400">Esperando confirmación de pago…</span>
          </div>
        </div>
      )}
    </>
  );

  /* ─── INTRODUCIR IMPORTE ─────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#f8f9fb] p-8">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold text-slate-900 flex items-center gap-2">
          <QrCode className="h-5 w-5 text-slate-400" /> Cobro por QR
        </h1>
        <p className="text-[13px] text-slate-400 mt-0.5">Genera un QR — el cliente lo escanea y paga al instante</p>
      </div>

      <div className="mx-auto max-w-[320px]">
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center mb-3 shadow-sm">
          <p className="text-[12px] text-slate-400 mb-1 uppercase tracking-wide">Importe a cobrar</p>
          <p className="text-[44px] font-bold text-slate-900 leading-none min-h-[52px]">
            {amount
              ? `${amount} €`
              : <span className="text-slate-200">0,00 €</span>}
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 mb-4 shadow-sm">
          <input value={concept} onChange={(e) => setConcept(e.target.value)}
            placeholder="Concepto (opcional)"
            className="w-full text-[13px] outline-none placeholder:text-slate-300 text-slate-800" />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {KEYS.flat().map((v) => (
            <button key={v} onClick={() => pressKey(v)}
              className="flex h-14 items-center justify-center rounded-2xl bg-white border border-slate-200 text-[18px] font-semibold text-slate-800 hover:bg-slate-50 active:scale-95 transition-all shadow-sm">
              {v}
            </button>
          ))}
        </div>

        <button onClick={generate} disabled={loading || !canPay}
          className="w-full rounded-2xl bg-slate-900 py-4 text-[15px] font-bold text-white hover:bg-slate-700 disabled:opacity-40 transition flex items-center justify-center gap-2">
          {loading
            ? <><RefreshCw className="h-5 w-5 animate-spin" /> Generando…</>
            : <><QrCode className="h-5 w-5" /> Generar QR</>}
        </button>

        {error && (
          <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5">
            <p className="text-[13px] font-semibold text-red-700 mb-0.5">No se pudo generar el QR</p>
            <p className="text-[12px] text-red-500 leading-snug">{error}</p>
            {error.includes("cuenta de cobros") && (
              <a href="/app/connect/onboarding"
                className="mt-2.5 flex items-center gap-1 text-[12px] font-semibold text-red-700 underline underline-offset-2">
                Activar cuenta de cobros →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

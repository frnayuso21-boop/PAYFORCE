"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { HexLogo }  from "@/components/icons/HexLogo";
import { formatCurrency } from "@/lib/utils";

interface Props {
  amount:        number;
  currency:      string;
  description?:  string | null;
  businessName?: string;
  customerName?: string | null;
  paymentId?:    string | null;
}

export function PaySuccess({ amount, currency, description, customerName, paymentId }: Props) {
  const [phase, setPhase] = useState<"hex" | "check" | "done">("hex");

  useEffect(() => {
    // hex aparece → 400ms después empieza el tick → 700ms después todo visible
    const t1 = setTimeout(() => setPhase("check"), 400);
    const t2 = setTimeout(() => setPhase("done"),  1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 px-4">
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-10 text-center shadow-2xl"
        style={{ animation: "slideUp 0.45s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        {/* ── Icono hexágono + tick ── */}
        <div className="relative mx-auto mb-7 flex h-24 w-24 items-center justify-center">

          {/* Halo exterior pulsante */}
          {phase === "done" && (
            <span
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
          )}

          {/* Hexágono verde */}
          <div
            style={{
              transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
              transform:  phase === "hex" ? "scale(0.6)" : "scale(1)",
              opacity:    phase === "hex" ? 0 : 1,
            }}
          >
            <HexLogo size={96} className="text-emerald-500" />
          </div>

          {/* Tick SVG animado encima del hexágono */}
          <svg
            viewBox="0 0 48 48"
            width={44}
            height={44}
            fill="none"
            className="absolute inset-0 m-auto"
            style={{ pointerEvents: "none" }}
          >
            <polyline
              points="10,26 20,36 38,16"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                strokeDasharray:  50,
                strokeDashoffset: phase === "check" || phase === "done" ? 0 : 50,
                transition:       "stroke-dashoffset 0.45s cubic-bezier(0.4,0,0.2,1) 0.1s",
              }}
            />
          </svg>
        </div>

        {/* ── Textos ── */}
        <div
          style={{
            opacity:    phase === "done" ? 1 : 0,
            transform:  phase === "done" ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s",
          }}
        >
          {customerName && (
            <p className="mb-1 text-[13px] text-slate-400">Gracias, {customerName}</p>
          )}
          <p className="text-[32px] font-extrabold tabular-nums text-slate-900 leading-tight">
            {formatCurrency(amount / 100, currency)}
          </p>
          <p className="mt-1 text-[17px] font-semibold text-emerald-500">¡Pago completado!</p>
          {description && (
            <p className="mt-2 text-[13px] text-slate-400 leading-snug">{description}</p>
          )}
          <p className="mt-3 text-[12px] text-slate-400">
            Recibirás un correo de confirmación en breve.
          </p>

          {paymentId && (
            <a
              href={`/api/invoices/${paymentId}`}
              download
              className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-700 hover:bg-emerald-100 transition"
            >
              <FileText className="h-4 w-4" />
              Descargar factura
            </a>
          )}

          {/* Footer */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-300">
            <HexLogo size={12} className="text-slate-300" />
            <span>Pago seguro · PayForce</span>
          </div>
        </div>
      </div>

      {/* Animaciones CSS */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1);    opacity: 0.6; }
          50%       { transform: scale(1.15); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}

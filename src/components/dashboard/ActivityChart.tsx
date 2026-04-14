"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

export interface ChartPoint {
  date:  string;  // "YYYY-MM-DD"
  total: number;  // céntimos (bruto)
  net?:  number;  // céntimos (neto = bruto - fees)
}

const DAY_LABELS: Record<number, string> = {
  0: "Dom", 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb",
};
const MONTH_SHORT: Record<number, string> = {
  0:"ene",1:"feb",2:"mar",3:"abr",4:"may",5:"jun",
  6:"jul",7:"ago",8:"sep",9:"oct",10:"nov",11:"dic",
};

function dateLabel(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}
function dayLabel(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return DAY_LABELS[d.getDay()] ?? dateStr.slice(5);
}
function formatDateLong(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

const BLUE       = "#3b82f6";
const BLUE_LIGHT = "#60a5fa";
const BLUE_AREA  = "rgba(59,130,246,0.10)";

export function ActivityChart({ series }: { series: ChartPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!series.length) return null;

  /* ── dimensiones ── */
  const W = 600; const H = 140;
  const pL = 6;  const pR = 6; const pT = 10; const pB = 20;
  const cW = W - pL - pR;
  const cH = H - pT - pB;
  const n  = series.length;

  const allZero = series.every(s => s.total === 0);
  const maxVal  = allZero ? 1 : Math.max(...series.map(s => s.total));

  /* coordenadas: cuando todo es 0 la línea queda pegada al fondo */
  const xs = series.map((_, i) => pL + (i / (n - 1)) * cW);
  const ys = series.map(s =>
    allZero ? pT + cH : pT + cH - (s.total / maxVal) * cH
  );

  /* path suavizado */
  const curve = xs.map((x, i) => {
    if (i === 0) return `M ${x} ${ys[i]}`;
    const dx = (xs[i] - xs[i - 1]) * 0.45;
    return `C ${xs[i-1]+dx} ${ys[i-1]}, ${x-dx} ${ys[i]}, ${x} ${ys[i]}`;
  }).join(" ");
  const area = curve + ` L ${xs[n-1]} ${pT+cH} L ${xs[0]} ${pT+cH} Z`;

  /* etiquetas eje X: mostramos sólo las primeras y últimas + alguna intermedia */
  const showLabel = (i: number) =>
    i === 0 || i === n - 1 || i === Math.floor(n / 2);

  return (
    <div className="relative select-none">
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", overflow: "visible", cursor: allZero ? "default" : "crosshair" }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="ac-area-blue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={BLUE} stopOpacity="0.18" />
            <stop offset="100%" stopColor={BLUE} stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* Área de relleno (sólo con datos) */}
        {!allZero && <path d={area} fill="url(#ac-area-blue)" />}

        {/* Línea — azul siempre, plana al fondo si no hay datos */}
        <path
          d={curve}
          fill="none"
          stroke={BLUE}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={allZero ? 0.55 : 1}
        />

        {/* Línea vertical hover */}
        {hovered !== null && !allZero && (
          <line
            x1={xs[hovered]} y1={pT}
            x2={xs[hovered]} y2={pT + cH}
            stroke={BLUE} strokeWidth="1" strokeDasharray="3 3" opacity="0.35"
          />
        )}

        {/* Etiquetas eje X */}
        {series.map((pt, i) => (
          showLabel(i) && (
            <text
              key={pt.date}
              x={xs[i]} y={H - 2}
              textAnchor={i === 0 ? "start" : i === n-1 ? "end" : "middle"}
              fontSize="8.5"
              fontFamily="system-ui, sans-serif"
              fill={hovered === i ? BLUE : "#94a3b8"}
              fontWeight={hovered === i ? "600" : "400"}
            >
              {dateLabel(pt.date) || dayLabel(pt.date)}
            </text>
          )
        ))}

        {/* Puntos interactivos */}
        {!allZero && series.map((pt, i) => (
          <g key={pt.date}>
            <rect
              x={xs[i] - 22} y={pT} width={44} height={cH}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
            />
            {(pt.total > 0 || i === n - 1) && (
              <circle
                cx={xs[i]} cy={ys[i]}
                r={hovered === i ? 5 : i === n-1 ? 4 : 0}
                fill={BLUE_LIGHT}
                stroke="white" strokeWidth="2"
                style={{ transition: "r 0.12s" }}
              />
            )}
          </g>
        ))}
      </svg>

      {/* Tooltip con bruto y neto */}
      {hovered !== null && !allZero && series[hovered].total > 0 && (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            bottom: `calc(100% - ${(ys[hovered] / H) * 100}% + 18px)`,
            left:  xs[hovered] / W > 0.82 ? "auto"
                 : `max(0px, calc(${(xs[hovered] / W) * 100}% - 62px))`,
            right: xs[hovered] / W > 0.82 ? 4 : "auto",
          }}
        >
          <div
            className="rounded-xl shadow-xl overflow-hidden"
            style={{
              background: "#0f172a",
              border: "1px solid rgba(59,130,246,0.25)",
              whiteSpace: "nowrap",
              minWidth: 148,
            }}
          >
            {/* Fecha */}
            <div className="px-3 pt-2.5 pb-1.5 border-b border-white/[0.06]">
              <p className="text-[10px] text-slate-400 capitalize">
                {formatDateLong(series[hovered].date)}
              </p>
            </div>
            {/* Valores */}
            <div className="px-3 py-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-6">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block" />
                  Volumen bruto
                </span>
                <span className="text-[12px] font-bold text-white tabular-nums">
                  {formatCurrency(series[hovered].total / 100)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
                  Volumen neto
                </span>
                <span className="text-[12px] font-semibold text-emerald-400 tabular-nums">
                  {formatCurrency(
                    series[hovered].net != null
                      ? series[hovered].net! / 100
                      : (series[hovered].total * 0.96 - 40) / 100
                  )}
                </span>
              </div>
            </div>
          </div>
          {/* Flecha */}
          <div style={{
            width: 0, height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "5px solid #0f172a",
            marginLeft: xs[hovered] / W > 0.82 ? "auto" : 14,
            marginRight: xs[hovered] / W > 0.82 ? 14 : "auto",
          }} />
        </div>
      )}

      {/* Sin datos */}
      {allZero && (
        <p className="mt-1.5 text-center text-[11px] text-slate-300">
          Los datos aparecerán cuando proceses tu primer pago
        </p>
      )}
    </div>
  );
}

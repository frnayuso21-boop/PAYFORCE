import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { TerminalAnimated } from "./TerminalAnimated";
import { DashboardOverviewClient } from "./DashboardOverviewClient";

/* ─── Terminal card: código API ─────────────────────────────────────────── */
function TerminalCard() {
  type Seg = { color: string; text: string };
  const lines: { num: number; segs: Seg[] }[] = [
    { num: 1,  segs: [{ color: "#6272a4", text: "import" }, { color: "#f8f8f2", text: " { Ingestion } " }, { color: "#6272a4", text: "from" }, { color: "#f1fa8c", text: " '@payforce/ingestion'" }, { color: "#f8f8f2", text: ";" }] },
    { num: 2,  segs: [{ color: "#6272a4", text: "import" }, { color: "#f8f8f2", text: " { PayForce } " }, { color: "#6272a4", text: "from" }, { color: "#f1fa8c", text: " '@payforce/sdk'" }, { color: "#f8f8f2", text: ";" }] },
    { num: 3,  segs: [{ color: "#6272a4", text: "import" }, { color: "#f8f8f2", text: " { generateText } " }, { color: "#6272a4", text: "from" }, { color: "#f1fa8c", text: " 'ai'" }, { color: "#f8f8f2", text: ";" }] },
    { num: 4,  segs: [] },
    { num: 5,  segs: [{ color: "#6272a4", text: "const" }, { color: "#f8f8f2", text: " pf = " }, { color: "#6272a4", text: "new" }, { color: "#8be9fd", text: " PayForce" }, { color: "#f8f8f2", text: "({ apiKey: " }, { color: "#bd93f9", text: "process" }, { color: "#f8f8f2", text: ".env." }, { color: "#8be9fd", text: "PF_SECRET_KEY" }, { color: "#f8f8f2", text: " })" }] },
    { num: 6,  segs: [{ color: "#f8f8f2", text: "  ." }, { color: "#50fa7b", text: "strategy" }, { color: "#f8f8f2", text: "(" }, { color: "#6272a4", text: "new" }, { color: "#8be9fd", text: " PayStrategy" }, { color: "#f8f8f2", text: "(" }, { color: "#8be9fd", text: "payforce" }, { color: "#f8f8f2", text: '("auto")))' }] },
    { num: 7,  segs: [{ color: "#f8f8f2", text: "  ." }, { color: "#50fa7b", text: "ingest" }, { color: "#f8f8f2", text: '("payforce-payments");' }] },
    { num: 8,  segs: [] },
    { num: 9,  segs: [{ color: "#6272a4", text: "export async function" }, { color: "#50fa7b", text: " POST" }, { color: "#f8f8f2", text: "(req: " }, { color: "#8be9fd", text: "Request" }, { color: "#f8f8f2", text: ") {" }] },
    { num: 10, segs: [{ color: "#f8f8f2", text: "  " }, { color: "#6272a4", text: "const" }, { color: "#f8f8f2", text: " { amount, currency, method } = " }, { color: "#6272a4", text: "await" }, { color: "#f8f8f2", text: " req." }, { color: "#50fa7b", text: "json" }, { color: "#f8f8f2", text: "();" }] },
    { num: 11, segs: [] },
    { num: 12, segs: [{ color: "#f8f8f2", text: "  " }, { color: "#6272a4", text: "const" }, { color: "#f8f8f2", text: " payment = " }, { color: "#6272a4", text: "await" }, { color: "#f8f8f2", text: " pf." }, { color: "#8be9fd", text: "payments" }, { color: "#f8f8f2", text: "." }, { color: "#50fa7b", text: "create" }, { color: "#f8f8f2", text: "({" }] },
    { num: 13, segs: [{ color: "#f8f8f2", text: "    amount," }, ] },
    { num: 14, segs: [{ color: "#f8f8f2", text: "    currency," }] },
    { num: 15, segs: [{ color: "#f8f8f2", text: "    method," }] },
    { num: 16, segs: [{ color: "#f8f8f2", text: "  });" }] },
    { num: 17, segs: [] },
    { num: 18, segs: [{ color: "#f8f8f2", text: "  " }, { color: "#6272a4", text: "return" }, { color: "#f8f8f2", text: " Response." }, { color: "#50fa7b", text: "json" }, { color: "#f8f8f2", text: "({ payment });" }] },
    { num: 19, segs: [{ color: "#f8f8f2", text: "}" }] },
  ];

  const events = [
    { label: "PAGO",      merchant: "merchant_91", amount: "€349,00",  tokens: "1.2s" },
    { label: "PAGO",      merchant: "merchant_22", amount: "€89,00",   tokens: "0.8s" },
    { label: "REEMBOLSO", merchant: "merchant_91", amount: "€49,00",   tokens: "1.1s" },
    { label: "PAGO",      merchant: "merchant_07", amount: "€1.200,00",tokens: "0.9s" },
    { label: "PAGO",      merchant: "merchant_33", amount: "€220,00",  tokens: "1.4s" },
    { label: "PAGO",      merchant: "merchant_14", amount: "€75,00",   tokens: "0.7s" },
  ];

  return (
    <div className="relative w-full overflow-hidden flex"
      style={{
        background: "#1a1a2e",
        boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
        minHeight: 420,
        borderRadius: "48px",
      }}>

      {/* ── Panel izquierdo: terminal ── */}
      <div className="flex flex-col flex-1 min-w-0"
        style={{
          background: "#1e1e2e",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
        }}>

        {/* Barra */}
        <div className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#181825" }}>
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full" style={{ background: "#ff5f57" }} />
            <div className="h-3 w-3 rounded-full" style={{ background: "#febc2e" }} />
            <div className="h-3 w-3 rounded-full" style={{ background: "#28c840" }} />
          </div>
          <span className="text-[11px] font-medium ml-2" style={{ color: "rgba(255,255,255,0.40)" }}>
            Terminal &nbsp;<span style={{ color: "rgba(255,255,255,0.20)" }}>nvim</span>&nbsp; src/api/payments.ts
          </span>
        </div>

        {/* Código */}
        <div className="px-4 py-4 text-[12px] leading-[2] overflow-x-auto flex-1">
          {lines.map((l) => (
            <div key={l.num} className="flex gap-4 min-w-0">
              <span className="shrink-0 select-none tabular-nums text-right"
                style={{ color: "rgba(255,255,255,0.18)", minWidth: 18, fontSize: 11 }}>
                {l.num}
              </span>
              <span className="whitespace-pre">
                {l.segs.length === 0
                  ? <span>&nbsp;</span>
                  : l.segs.map((s, si) => (
                    <span key={si} style={{ color: s.color }}>{s.text}</span>
                  ))}
              </span>
            </div>
          ))}
          <div className="flex gap-4 mt-1">
            <span style={{ minWidth: 18 }} />
            <div className="h-[14px] w-[7px] rounded-sm animate-pulse" style={{ background: "#bd93f9", opacity: 0.8 }} />
          </div>
        </div>

        {/* curl */}
        <div className="px-4 py-3 text-[11px]"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#181825", fontFamily: "inherit" }}>
          <span style={{ color: "#6272a4" }}>curl -X POST </span>
          <span style={{ color: "#f1fa8c" }}>https://api.payforce.io/v1/payments </span>
          <span style={{ color: "#6272a4" }}>\ </span>
          <br />
          <span style={{ color: "#6272a4" }}>{"  "}-H </span>
          <span style={{ color: "#f1fa8c" }}>"Authorization: Bearer $PF_SECRET_KEY"</span>
        </div>
      </div>

      {/* ── Panel derecho: cobros en vivo ── */}
      <div className="flex flex-col w-[42%] shrink-0"
        style={{ background: "#16213e" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-[12px] font-semibold" style={{ color: "#f8f8f2" }}>Cobros en vivo</span>
          <span className="text-[11px] tabular-nums" style={{ color: "rgba(255,255,255,0.35)" }}>
            {events.reduce((s) => s + 1, 0)} · hoy
          </span>
        </div>

        {/* Columnas */}
        <div className="flex justify-between px-4 py-1.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {["Tipo", "Merchant", "Importe", "Lat."].map(h => (
            <span key={h} className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>{h}</span>
          ))}
        </div>

        {/* Filas */}
        <div className="flex-1 overflow-hidden">
          {events.map((e, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="text-[9px] font-bold rounded px-1.5 py-0.5"
                style={{
                  background: e.label === "PAGO" ? "rgba(80,250,123,0.12)" : "rgba(255,184,108,0.12)",
                  color: e.label === "PAGO" ? "#50fa7b" : "#ffb86c",
                }}>
                {e.label}
              </span>
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>{e.merchant}</span>
              <span className="text-[10px] font-semibold tabular-nums" style={{ color: "#f8f8f2" }}>{e.amount}</span>
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.30)" }}>{e.tokens}</span>
            </div>
          ))}
        </div>

        {/* Footer merchant */}
        <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: "rgba(189,147,249,0.25)", color: "#bd93f9" }}>P</div>
              <span className="text-[11px] font-medium" style={{ color: "#f8f8f2" }}>PayForce Systems</span>
            </div>
            <span className="text-[9px] rounded px-1.5 py-0.5" style={{ background: "rgba(80,250,123,0.15)", color: "#50fa7b" }}>Pro</span>
          </div>
          <div className="text-[10px] mb-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>Volumen del periodo · <span style={{ color: "#f8f8f2" }}>€24.830,00</span></div>
          <div className="w-full rounded-full h-1.5 mt-1.5" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-1.5 rounded-full" style={{ width: "68%", background: "linear-gradient(90deg, #bd93f9, #50fa7b)" }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>Comisión acumulada</span>
            <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.45)" }}>€994,00</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Hexágono (igual que el real) ──────────────────────────────────────── */
function HexIcon() {
  return (
    <svg viewBox="0 0 32 32" width={28} height={28} fill="none">
      <polygon points="16,1.5 29,8.75 29,23.25 16,30.5 3,23.25 3,8.75" fill="#1a1a1a" />
    </svg>
  );
}

/* ─── Dashboard mockup: diseño limpio centrado en el gráfico ─────────────── */
function DashboardOverview() {
  const uid    = "ds2";
  const values = [32, 58, 44, 76, 65, 52, 100];
  const days   = ["Lun","Mar","Mié","Jue","Vie","Sáb","Hoy"];
  const max    = Math.max(...values);

  const navItems = [
    { icon: "▦", label: "Inicio",       active: true  },
    { icon: "↑↓", label: "Pagos",       active: false },
    { icon: "⬡", label: "TITAN 1.4.1", active: false },
    { icon: "⬜", label: "QR / Links",   active: false },
    { icon: "⚙", label: "Ajustes",     active: false },
  ];

  const payments = [
    { desc: "Arista Móvil S.L.",  amount: "€1.200,00", status: "Completado", ok: true  },
    { desc: "TechStartup GmbH",   amount: "€450,00",   status: "Completado", ok: true  },
    { desc: "Freelance Pro",      amount: "€89,00",    status: "Completado", ok: true  },
    { desc: "Global Store Inc.",  amount: "€3.400,00", status: "Procesando", ok: false },
    { desc: "Marta García",       amount: "€220,00",   status: "Completado", ok: true  },
  ];

  return (
    <div className="w-full overflow-hidden flex"
      style={{
        background: "#f8fafc",
        boxShadow: "0 32px 80px rgba(0,0,0,0.28)",
        minHeight: 420,
        fontFamily: "system-ui, -apple-system, sans-serif",
        borderRadius: "48px",
      }}>

      {/* ── Sidebar ── */}
      <div className="flex flex-col shrink-0 py-4 px-3 gap-1"
        style={{ width: 140, background: "#0f172a", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

        {/* Logo */}
        <div className="flex items-center gap-2 px-2 mb-4">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>P</div>
          <span className="text-[11px] font-semibold text-white/80">PayForce</span>
        </div>

        {navItems.map(n => (
          <div key={n.label} className="flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer"
            style={{
              background: n.active ? "rgba(99,102,241,0.18)" : "transparent",
              color: n.active ? "#a5b4fc" : "rgba(255,255,255,0.38)",
            }}>
            <span className="text-[11px]">{n.icon}</span>
            <span className="text-[10px] font-medium">{n.label}</span>
          </div>
        ))}

        {/* Badge TITAN */}
        <div className="mt-auto mx-1 rounded-lg p-2"
          style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}>
          <p className="text-[8px] font-bold text-purple-400 mb-0.5">TITAN 1.4.1</p>
          <p className="text-[7px] text-white/30">Sin alertas activas</p>
          <div className="h-1 w-full rounded-full mt-1.5" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-1 rounded-full" style={{ width: "12%", background: "#4ade80" }} />
          </div>
        </div>
      </div>

      {/* ── Contenido principal ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid #e8ecf1", background: "#ffffff" }}>
          <div>
            <p className="text-[12px] font-semibold text-slate-900">Inicio</p>
            <p className="text-[9px] text-slate-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
              Live · Abr 2026
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] rounded-full px-2.5 py-1 text-slate-500"
              style={{ border: "1px solid #e2e8f0" }}>Exportar</span>
            <span className="text-[9px] rounded-full px-2.5 py-1 text-white font-semibold"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>+ Cobro</span>
          </div>
        </div>

        <div className="p-3 flex flex-col gap-2.5 overflow-hidden">

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Volumen",      value: "€48.290", trend: "+12%",  up: true  },
              { label: "Transac.",     value: "3.841",   trend: "+8%",   up: true  },
              { label: "Fees",         value: "€1.932",  trend: "+11%",  up: true  },
              { label: "Balance",      value: "€12.480", trend: "libre", up: false },
            ].map(k => (
              <div key={k.label} className="rounded-xl p-2.5 bg-white"
                style={{ border: "1px solid #f1f5f9" }}>
                <p className="text-[8px] text-slate-400 truncate">{k.label}</p>
                <p className="text-[14px] font-bold text-slate-900 tabular-nums leading-tight mt-0.5">{k.value}</p>
                <p className="text-[8px] mt-0.5" style={{ color: k.up ? "#16a34a" : "#6366f1" }}>{k.trend}</p>
              </div>
            ))}
          </div>

          {/* Gráfico */}
          <div className="rounded-xl p-3 bg-white" style={{ border: "1px solid #f1f5f9" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-slate-800">Ingresos · últimos 7 días</p>
              <span className="text-[8px] font-bold text-emerald-600">▲ +18.3%</span>
            </div>
            {(() => {
              const W = 420; const H = 80;
              const pL = 4; const pR = 4; const pT = 10; const pB = 14;
              const cW = W - pL - pR; const cH = H - pT - pB;
              const n = values.length;
              const xs = values.map((_, i) => pL + (i / (n - 1)) * cW);
              const ys = values.map(v => pT + cH - (v / max) * cH);
              const curve = xs.map((x, i) => {
                if (i === 0) return `M ${x} ${ys[i]}`;
                const dx = (xs[i] - xs[i-1]) * 0.45;
                return `C ${xs[i-1]+dx} ${ys[i-1]}, ${x-dx} ${ys[i]}, ${x} ${ys[i]}`;
              }).join(" ");
              const area = curve + ` L ${xs[n-1]} ${pT+cH} L ${xs[0]} ${pT+cH} Z`;
              return (
                <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
                  <defs>
                    <linearGradient id={`lg-${uid}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#8b5cf6"/>
                    </linearGradient>
                    <linearGradient id={`ag-${uid}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15"/><stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d={area} fill={`url(#ag-${uid})`}/>
                  <path d={curve} fill="none" stroke={`url(#lg-${uid})`} strokeWidth="2" strokeLinecap="round"/>
                  {days.map((d, i) => (
                    <text key={i} x={xs[i]} y={H - 1} textAnchor="middle" fontSize="7"
                      fill={i === n-1 ? "#6366f1" : "#94a3b8"} fontWeight={i === n-1 ? "700" : "400"}
                      fontFamily="system-ui">
                      {d}
                    </text>
                  ))}
                  <circle cx={xs[n-1]} cy={ys[n-1]} r="4" fill="#6366f1" stroke="white" strokeWidth="2"/>
                </svg>
              );
            })()}
          </div>

          {/* Pagos recientes */}
          <div className="rounded-xl overflow-hidden bg-white" style={{ border: "1px solid #f1f5f9" }}>
            <div className="flex items-center justify-between px-3 py-2"
              style={{ borderBottom: "1px solid #f8fafc" }}>
              <p className="text-[10px] font-semibold text-slate-800">Pagos recientes</p>
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            {payments.map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5"
                style={{ borderTop: i > 0 ? "1px solid #f8fafc" : "none" }}>
                <div className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: p.ok ? "#22c55e" : "#3b82f6" }} />
                <p className="flex-1 text-[9px] text-slate-600 truncate">{p.desc}</p>
                <span className="text-[8px] rounded-full px-1.5 py-0.5 shrink-0"
                  style={{
                    background: p.ok ? "#f0fdf4" : "#eff6ff",
                    color: p.ok ? "#15803d" : "#1d4ed8",
                  }}>{p.status}</span>
                <p className="text-[9px] font-bold text-slate-900 tabular-nums shrink-0">{p.amount}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Mockup link de pago ───────────────────────────────────────────────── */

/* ─── Checkout / Payment methods visual ─────────────────────────────────── */
function PaymentCheckoutVisual() {
  const methods = [
    {
      label: "Apple Pay",
      bg: "#000", color: "#fff",
      logo: (
        <svg viewBox="0 0 814 1000" height="16" width="14" fill="white">
          <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-194.3 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
        </svg>
      ),
    },
    {
      label: "Google Pay",
      bg: "#fff", color: "#3c4043",
      border: "#dadce0",
      logo: (
        <svg viewBox="0 0 272 96" height="14" width="36" fill="none">
          <text x="0" y="72" fontFamily="Arial" fontSize="72" fontWeight="500">
            <tspan fill="#4285F4">G</tspan><tspan fill="#EA4335">o</tspan>
            <tspan fill="#FBBC05">o</tspan><tspan fill="#34A853">g</tspan>
            <tspan fill="#EA4335">l</tspan><tspan fill="#4285F4">e</tspan>
          </text>
        </svg>
      ),
    },
    {
      label: "Bizum",
      bg: "#00ADEF", color: "#fff",
      logo: <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: "-0.5px" }}>bizum</span>,
    },
  ];

  const cards = [
    { name: "Visa",       color: "#1A1F71" },
    { name: "Mastercard", color: "#EB001B" },
    { name: "Amex",       color: "#2E77BC" },
    { name: "SEPA",       color: "#003087" },
  ];

  return (
    <div className="w-full overflow-hidden flex"
      style={{
        background: "#ffffff",
        boxShadow: "0 32px 80px rgba(0,0,0,0.28)",
        minHeight: 400,
        borderRadius: "100px 100px 32px 32px",
      }}>

      {/* ── Panel izquierdo — resumen pedido ── */}
      <div className="flex flex-col justify-between p-5 shrink-0"
        style={{ width: "40%", background: "#0f172a" }}>
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center font-bold text-white text-[11px]"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>P</div>
            <span className="text-[12px] font-semibold text-white/80">PayForce</span>
          </div>

          {/* Merchant */}
          <p className="text-[9px] uppercase tracking-widest text-white/30 mb-2">Solicitud de pago</p>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-slate-900 text-[15px] bg-white">A</div>
            <div>
              <p className="text-[14px] font-bold text-white leading-tight">Arista Móvil S.L.</p>
              <p className="text-[10px] text-white/35">te solicita un pago</p>
            </div>
          </div>

          {/* Importe */}
          <div className="rounded-xl px-4 py-4 mb-4"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <p className="text-[9px] text-white/35 mb-0.5">Total a pagar</p>
            <p className="text-[36px] font-extrabold tabular-nums text-white leading-none">
              €349<span className="text-[20px] text-white/50">,00</span>
            </p>
            <p className="text-[10px] text-white/40 mt-1">Plan Anual · PayForce Pro</p>
          </div>

          {/* Desglose */}
          <div className="space-y-1.5 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            {[["Subtotal","€349,00"],["IVA (21%)","—"],["Total","€349,00"]].map(([l,v],i) => (
              <div key={l} className="flex justify-between text-[10px]"
                style={{ fontWeight: i === 2 ? 700 : 400, color: i === 2 ? "white" : "rgba(255,255,255,0.40)" }}>
                <span>{l}</span><span>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SSL */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px]" style={{ color: "rgba(255,255,255,0.22)" }}>
          <span>🔒 SSL 256-bit</span><span>·</span><span>3D Secure</span><span>·</span><span>PCI DSS</span>
        </div>
      </div>

      {/* ── Panel derecho — métodos de pago ── */}
      <div className="flex-1 flex flex-col p-5 gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Elige cómo pagar</p>

        {/* Express methods */}
        <div className="flex flex-col gap-2">
          {methods.map(m => (
            <button key={m.label}
              className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-[12px] font-semibold transition-all"
              style={{
                background: m.bg,
                color: m.color,
                border: m.border ? `1px solid ${m.border}` : "none",
                boxShadow: m.label === "Apple Pay" ? "0 2px 8px rgba(0,0,0,0.25)" : "0 1px 3px rgba(0,0,0,0.08)",
              }}>
              {m.logo}
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px" style={{ background: "#f1f5f9" }} />
          <span className="text-[9px] text-slate-400">o con tarjeta</span>
          <div className="flex-1 h-px" style={{ background: "#f1f5f9" }} />
        </div>

        {/* Card form */}
        <div className="flex flex-col gap-2">
          <div className="rounded-t-xl border px-3 py-2.5 flex items-center justify-between"
            style={{ borderColor: "#e2e8f0", borderBottom: "none" }}>
            <span className="text-[11px] text-slate-400 font-mono tracking-wider">1234 5678 9012 3456</span>
            <div className="flex gap-1">
              {cards.slice(0,2).map(c => (
                <div key={c.name} className="h-4 w-6 rounded-sm" style={{ background: c.color, opacity: 0.8 }} />
              ))}
            </div>
          </div>
          <div className="flex rounded-b-xl border overflow-hidden"
            style={{ borderColor: "#e2e8f0", borderTop: "1px solid #f8fafc" }}>
            <div className="flex-1 px-3 py-2 border-r" style={{ borderColor: "#f1f5f9" }}>
              <span className="text-[11px] text-slate-400 font-mono">12 / 28</span>
            </div>
            <div className="flex-1 px-3 py-2">
              <span className="text-[11px] text-slate-400 font-mono">···</span>
            </div>
          </div>
        </div>

        {/* Logos aceptados */}
        <div className="flex items-center gap-2 flex-wrap">
          {cards.map(c => (
            <div key={c.name} className="rounded px-2 py-1 text-[8px] font-bold"
              style={{ background: c.color === "#EB001B" ? "transparent" : "#f8fafc", color: c.color,
                border: "1px solid #e8ecf1" }}>
              {c.name === "Mastercard"
                ? <div className="flex -space-x-1"><div className="h-3 w-3 rounded-full bg-red-500 opacity-90"/><div className="h-3 w-3 rounded-full bg-orange-400 opacity-90"/></div>
                : c.name}
            </div>
          ))}
          <div className="rounded px-2 py-1 text-[8px] font-bold text-blue-600 bg-blue-50 border border-blue-100">SEPA</div>
          <div className="rounded px-2 py-1 text-[8px] font-bold border" style={{ color: "#00ADEF", borderColor: "#e0f5fd" }}>bizum</div>
        </div>

        {/* Botón pagar */}
        <button className="w-full rounded-xl py-3 text-[13px] font-bold text-white mt-auto"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}>
          Pagar €349,00
        </button>
      </div>
    </div>
  );
}

/* ─── GradientBg para las cards showcase ───────────────────────────────── */
function GradientBg({ variant }: { variant: "purple" | "blue" | "orange" }) {
  const gradients = {
    purple: "radial-gradient(ellipse 80% 80% at 70% 50%, #444 0%, #222 40%, #111 70%, #000 100%)",
    blue:   "radial-gradient(ellipse 80% 80% at 30% 50%, #1D4ED8 0%, #1e1b4b 40%, #0a0a14 100%)",
    orange: "radial-gradient(ellipse 80% 80% at 70% 50%, #d97706 0%, #92400e 40%, #0a0a14 100%)",
  };

  return (
    <div className="absolute inset-0" style={{ background: gradients[variant] }}>
      {/* grano */}
      <div className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "180px",
          mixBlendMode: "overlay",
        }} />
    </div>
  );
}

/* ─── Fila de showcase — layout centrado estilo polar.sh ────────────────── */
interface ShowcaseRowProps {
  tag:       string;
  title:     string;
  body:      string;
  checks?:   string[];
  href:      string;
  visual:    React.ReactNode;
  cardShape?: "all" | "curveTop";
  /** unused but kept for compat */ flip?: boolean;
  gradient?: "purple" | "blue" | "orange";
  noPadding?: boolean;
}

function ShowcaseRow({ tag, title, body, checks = [], href, visual, cardShape = "all" }: ShowcaseRowProps) {
  const radius = cardShape === "curveTop" ? "100px 100px 40px 40px" : "48px";

  return (
    <div className="flex flex-col items-center gap-8 md:gap-10">

      {/* ── Texto centrado ── */}
      <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto">
        {tag && (
          <span className="inline-block rounded-full px-3 py-1 text-[10px] tracking-[2px] uppercase md:text-[11px] md:tracking-[3px]"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}>
            {tag}
          </span>
        )}
        <h3 className="text-[36px] leading-tight text-white md:text-[56px]"
          style={{ letterSpacing: "-0.03em", fontWeight: 400 }}>
          {title.split("\n").map((line, i) => (
            <span key={i}>{line}{i < title.split("\n").length - 1 && <br />}</span>
          ))}
        </h3>
        <p className="text-[16px] leading-relaxed md:text-[18px]" style={{ color: "rgba(255,255,255,0.45)" }}>
          {body}
        </p>
        {checks.length > 0 && (
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-1">
            {checks.map(c => (
              <span key={c} className="flex items-center gap-1.5 text-[13px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#34d399" }} />{c}
              </span>
            ))}
          </div>
        )}
        <Link href={href}
          className="mt-1 inline-flex items-center gap-1.5 text-[13px] transition-opacity hover:opacity-60"
          style={{ color: "#a78bfa" }}>
          Saber más <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── Visual centrado full-width ── */}
      <div className="relative overflow-hidden w-full"
        style={{ borderRadius: radius, boxShadow: "0 40px 100px rgba(0,0,0,0.6)" }}>
        {visual}
      </div>

    </div>
  );
}

/* ─── Componente principal ──────────────────────────────────────────────── */
export function DashboardShowcase() {
  return (
    <section
      className="relative px-4 pt-16 pb-0 md:px-12 md:pt-24 overflow-hidden"
      style={{ background: "#000000" }}
    >
      {/* ── Capas decorativas ────────────────────────────────────────── */}


      {/* 2. Grano fino encima */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.80' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "160px", mixBlendMode: "soft-light",
        }} />

      {/* 3. Glow violeta vibrante — top-right */}
      <div className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 55% 45% at 88% 8%, rgba(130,50,255,0.55) 0%, transparent 60%)" }} />

      {/* 4. Glow indigo — bottom-left */}
      <div className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 50% 45% at 8% 92%, rgba(50,80,230,0.35) 0%, transparent 55%)" }} />

      {/* 5. Aurora central — barrido diagonal */}
      <div className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 130% 40% at 50% 50%, rgba(100,40,200,0.14) 0%, transparent 70%)" }} />

      {/* 6. Teal accent — top-center (sutil) */}
      <div className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 30% at 50% 0%, rgba(13,210,185,0.09) 0%, transparent 65%)" }} />

      {/* Difuminado superior — funde con el hero */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 z-10"
        style={{ height: 180, background: "linear-gradient(to bottom, #04020e 0%, transparent 100%)" }} />

      <div className="mx-auto max-w-5xl flex flex-col gap-24 md:gap-36 relative z-0 pt-28 pb-24 md:pb-36">

        {/* Fila 1 — SDK Terminal */}
        <ShowcaseRow
          tag="API & SDK"
          title={"Conecta en\nminutos, no días"}
          body="Una sola API unifica todos los métodos de pago: tarjeta, Bizum, Apple Pay, SEPA y más. Sin integraciones separadas, sin complicaciones."
          checks={[
            "SDK oficial en TypeScript, Python y PHP",
            "Webhooks en tiempo real con firma HMAC",
            "Documentación interactiva con ejemplos",
          ]}
          href="/solutions"
          visual={<TerminalAnimated />}
          cardShape="all"
        />

        {/* Fila 2 — Dashboard analytics */}
        <ShowcaseRow
          tag="Analytics"
          title={"Dashboard en\ntiempo real"}
          body="Monitoriza cada transacción, detecta anomalías y consulta métricas de rendimiento desde un panel centralizado con datos en vivo."
          checks={[
            "Métricas de conversión y volumen por hora",
            "Alertas inteligentes ante fraude o caídas",
            "Exportación a CSV, PDF y Zapier",
          ]}
          href="/solutions"
          visual={<DashboardOverviewClient />}
          cardShape="all"
        />

        {/* Fila 3 — Checkout */}
        <ShowcaseRow
          tag="LINK DE PAGO"
          title={"Checkout listo\nen segundos"}
          body="Tus clientes pagan con Apple Pay, Google Pay, Bizum, tarjeta o SEPA sin ninguna integración. Comparte un link y cobra al instante."
          checks={[
            "Apple Pay, Google Pay y Bizum nativos",
            "Tarjeta, SEPA y transferencia en un solo link",
            "Sin código: actívalo desde el dashboard",
          ]}
          href="/solutions"
          visual={<PaymentCheckoutVisual />}
          cardShape="curveTop"
        />

      </div>
    </section>
  );
}

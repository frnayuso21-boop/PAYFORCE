"use client";

import React, {
  useState, useEffect, useRef, useCallback,
} from "react";
import { MotoAddCardModal } from "@/components/subscriptions/MotoAddCardModal";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface SubscriptionCustomer {
  id: string; name: string; email: string;
  externalReference: string | null; amount: number | null;
  currency: string; status: string;
  stripePaymentMethodId: string | null;
  lastChargeAt: string | null; lastChargeAmount: number | null;
}
interface ParseRecord {
  name: string; email: string | null; reference: string;
  amount: number; amountFormatted: string; iban: string | null;
  found: boolean; hasCard: boolean; customerId: string | null; status: string | null;
}
interface ParseResult {
  totalRecords: number; totalAmount: number; totalAmountFormatted: string;
  withCard: number; withoutCard: number; notFound: number;
  records: ParseRecord[];
}
interface BatchJob {
  id: string; filename: string; totalCount: number;
  successCount: number; failedCount: number; noCardCount: number;
  status: string; createdAt: string; processedAt: string | null;
}
interface BatchExecuteResult {
  batchJobId: string; total: number; success: number; failed: number;
  totalCharged: number; totalChargedFormatted: string;
  failedList: { name: string; reference: string; amount: number; reason: string }[];
}

function fmt(cents: number | null | undefined, cur = "eur") {
  if (cents == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: cur }).format(cents / 100);
}

const STATUS_CFG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  ACTIVE:       { label: "Activo",      dot: "#34C759", bg: "#F0FDF4", text: "#15803D" },
  PENDING_CARD: { label: "Sin tarjeta", dot: "#F59E0B", bg: "#FFFBEB", text: "#B45309" },
  FAILED:       { label: "Fallido",     dot: "#EF4444", bg: "#FEF2F2", text: "#B91C1C" },
  CANCELLED:    { label: "Cancelado",   dot: "#9CA3AF", bg: "#F9FAFB", text: "#6B7280" },
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SubscriptionsPage() {
  const [tab, setTab] = useState<"customers" | "xml" | "history" | "settings">("customers");

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Suscripciones</h1>
          <p style={s.subtitle}>Cobro masivo con tarjeta guardada — reemplaza domiciliaciones SEPA</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {([
          { key: "customers", label: "Clientes" },
          { key: "xml",       label: "Cobro por XML" },
          { key: "history",   label: "Historial" },
          { key: "settings",  label: "Configuración" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ ...s.tab, ...(tab === t.key ? s.tabActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={s.content}>
        {tab === "customers" && <TabCustomers />}
        {tab === "xml"       && <TabXML />}
        {tab === "history"   && <TabHistory />}
        {tab === "settings"  && <TabSettings />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — CLIENTES
// ══════════════════════════════════════════════════════════════════════════════
const EMPTY_FORM = {
  name: "", email: "", externalReference: "",
  serviceName: "", bankDescriptor: "",
  amount: "", trialDays: "",
};

function TabCustomers() {
  const [customers,  setCustomers]  = useState<SubscriptionCustomer[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [inviting,   setInviting]   = useState<string | null>(null);
  const [modal,      setModal]      = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [priceType,  setPriceType]  = useState<"fixed" | "variable">("fixed");
  const [frequency,  setFrequency]  = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [focusField, setFocusField] = useState<string | null>(null);
  const [creating,   setCreating]   = useState(false);
  const [createErr,  setCreateErr]  = useState<string | null>(null);
  const [toast,      setToast]      = useState<string | null>(null);
  const [motoFor,    setMotoFor]    = useState<SubscriptionCustomer | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/subscriptions/customers")
      .then(async r => {
        const text = await r.text();
        if (!text) throw new Error(`Respuesta vacía (HTTP ${r.status})`);
        return JSON.parse(text);
      })
      .then(d => setCustomers(d.data ?? []))
      .catch(err => {
        console.error("Error cargando clientes:", err);
        showToast("⚠️ No se pudieron cargar los clientes. Revisa la consola.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openModal() {
    setForm(EMPTY_FORM);
    setPriceType("fixed");
    setFrequency("monthly");
    setCreateErr(null);
    setModal(true);
  }

  async function invite(customerId: string) {
    setInviting(customerId);
    const res = await fetch("/api/subscriptions/invite", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId }),
    });
    setInviting(null);
    if (res.ok) showToast("Invitación enviada por email");
    else showToast("Error al enviar la invitación");
  }

  async function inviteAllPending() {
    const pending = customers.filter(c => c.status === "PENDING_CARD").map(c => c.id);
    if (!pending.length) return;
    const res = await fetch("/api/subscriptions/invite/batch", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerIds: pending }),
    });
    const d = await res.json();
    showToast(`${d.sent} invitaciones enviadas`);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateErr(null);
    setCreating(true);
    const res = await fetch("/api/subscriptions/customers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:              form.name,
        email:             form.email,
        externalReference: form.externalReference || undefined,
        amount: form.amount && priceType === "fixed"
          ? Math.round(parseFloat(form.amount.replace(",", ".")) * 100)
          : undefined,
      }),
    });
    const d = await res.json();
    setCreating(false);
    if (!res.ok) { setCreateErr(d.error ?? "Error al crear el cliente"); return; }
    setModal(false);
    load();
    showToast("Cliente creado correctamente");
  }

  // helpers for focus-aware input style
  function inp(key: string): React.CSSProperties {
    return focusField === key ? m.inputFocus : m.input;
  }
  function bind(key: keyof typeof EMPTY_FORM) {
    return {
      value:       form[key],
      onChange:    (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [key]: e.target.value })),
      onFocus:     () => setFocusField(key),
      onBlur:      () => setFocusField(null),
    };
  }

  const withCard    = customers.filter(c => c.stripePaymentMethodId).length;
  const withoutCard = customers.filter(c => !c.stripePaymentMethodId).length;

  return (
    <div>
      {motoFor && (
        <MotoAddCardModal
          customer={{ id: motoFor.id, name: motoFor.name, email: motoFor.email }}
          onClose={() => setMotoFor(null)}
          onSaved={() => {
            load();
            showToast("Tarjeta guardada (MOTO)");
          }}
        />
      )}
      {toast && <div style={s.toast}>{toast}</div>}

      {/* Contadores */}
      <div style={s.statsRow}>
        {[
          { label: "Total clientes", value: customers.length, color: "#0A0A0A" },
          { label: "Con tarjeta",    value: withCard,         color: "#15803D" },
          { label: "Sin tarjeta",    value: withoutCard,      color: "#B45309" },
        ].map(st => (
          <div key={st.label} style={s.statCard}>
            <div style={{ ...s.statValue, color: st.color }}>{st.value}</div>
            <div style={s.statLabel}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button style={s.btnPrimary} onClick={openModal}>+ Nueva suscripción</button>
        {withoutCard > 0 && (
          <button style={s.btnSecondary} onClick={inviteAllPending}>
            Invitar pendientes ({withoutCard})
          </button>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <SkeletonTable rows={4} cols={6} />
      ) : customers.length === 0 ? (
        <Empty icon="👤" title="Sin clientes" sub="Añade un cliente o importa desde XML" />
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Nombre", "Email", "Referencia", "Importe", "Último cobro", "Estado", "Acciones"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => {
                const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.PENDING_CARD;
                return (
                  <tr key={c.id} style={s.tr}>
                    <td style={s.td}><strong>{c.name}</strong></td>
                    <td style={{ ...s.td, color: "#6B7280", fontSize: 13 }}>{c.email}</td>
                    <td style={{ ...s.td, fontFamily: "monospace", fontSize: 12, color: "#6B7280" }}>
                      {c.externalReference ?? "—"}
                    </td>
                    <td style={s.td}>{c.amount ? fmt(c.amount, c.currency) : "—"}</td>
                    <td style={{ ...s.td, fontSize: 13, color: "#6B7280" }}>
                      {c.lastChargeAt
                        ? `${new Date(c.lastChargeAt).toLocaleDateString("es-ES")} · ${fmt(c.lastChargeAmount, c.currency)}`
                        : "—"}
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: cfg.bg, color: cfg.text }}>
                        <span style={{ ...s.dot, background: cfg.dot }} />
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          style={s.btnMoto}
                          onClick={() => setMotoFor(c)}
                        >
                          Añadir tarjeta manualmente
                        </button>
                        {c.status === "PENDING_CARD" && (
                          <button style={s.btnXS} onClick={() => invite(c.id)} disabled={inviting === c.id}>
                            {inviting === c.id ? "Enviando..." : "Invitar"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal nueva suscripción ─────────────────────────────────────────── */}
      {modal && (
        <Overlay onClose={() => setModal(false)}>
          <div style={m.shell}>
            {/* Header */}
            <div style={m.header}>
              <span style={m.headerTitle}>Nueva suscripción</span>
              <button style={m.closeBtn} onClick={() => setModal(false)} aria-label="Cerrar">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} style={m.body}>

              {/* ── Sección 1 — Identificación ─────────────────────────────── */}
              <div style={m.row2}>
                <Field label="Nombre completo" required>
                  <input type="text" placeholder="Juan García" required {...bind("name")} style={inp("name")} />
                </Field>
                <Field label="Email" required>
                  <input type="email" placeholder="juan@empresa.com" required {...bind("email")} style={inp("email")} />
                </Field>
              </div>
              <Field label="Referencia / ID cliente">
                <input type="text" placeholder="Ej: CLI-001" {...bind("externalReference")} style={inp("externalReference")} />
              </Field>

              <div style={m.divider} />

              {/* ── Sección 2 — Producto ───────────────────────────────────── */}
              <div style={m.sectionLabel}>Producto</div>
              <Field label="Nombre del servicio">
                <input type="text" placeholder="Suscripción mensual Pro" {...bind("serviceName")} style={inp("serviceName")} />
              </Field>
              <Field label="Descriptor bancario">
                <input
                  type="text" maxLength={22}
                  placeholder="MIEMPRESA·SUSCRIPCION"
                  {...bind("bankDescriptor")}
                  style={inp("bankDescriptor")}
                />
                <p style={m.hint}>Texto que verá el cliente en su banco. Máx 22 caracteres.</p>
              </Field>

              <div style={m.divider} />

              {/* ── Sección 3 — Facturación ────────────────────────────────── */}
              <div style={m.sectionLabel}>Facturación</div>

              {/* Tabs tipo precio */}
              <div style={m.typeTabs}>
                {(["fixed", "variable"] as const).map(t => (
                  <button
                    key={t} type="button"
                    style={{ ...m.typeTab, ...(priceType === t ? m.typeTabActive : {}) }}
                    onClick={() => setPriceType(t)}
                  >
                    {t === "fixed" ? "Precio fijo" : "Variable por XML"}
                  </button>
                ))}
              </div>

              {priceType === "fixed" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Campo importe con € */}
                  <Field label="Importe">
                    <div style={m.amountWrap}>
                      <span style={m.amountPrefix}>€</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        {...bind("amount")}
                        style={{ ...inp("amount"), paddingLeft: 36, borderRadius: 6 }}
                      />
                    </div>
                  </Field>

                  {/* Frecuencia */}
                  <Field label="Frecuencia">
                    <div style={m.pills}>
                      {([
                        { key: "weekly",  label: "Semanal"  },
                        { key: "monthly", label: "Mensual"  },
                        { key: "yearly",  label: "Anual"    },
                      ] as const).map(p => (
                        <button
                          key={p.key} type="button"
                          style={{ ...m.pill, ...(frequency === p.key ? m.pillActive : {}) }}
                          onClick={() => setFrequency(p.key)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Días de prueba gratuita">
                    <input type="number" min={0} placeholder="0" {...bind("trialDays")} style={inp("trialDays")} />
                  </Field>
                </div>
              ) : (
                <div style={m.infoBlock}>
                  <div style={m.infoBar} />
                  <p style={m.infoText}>
                    El importe se determinará cada mes al subir el archivo XML de cobros.
                    No se requiere configurar un precio fijo.
                  </p>
                </div>
              )}

              <div style={m.divider} />

              {/* ── Sección 4 — Cliente ────────────────────────────────────── */}
              <div style={m.sectionLabel}>Cliente</div>
              <div style={m.infoBlock}>
                <div style={m.infoBar} />
                <p style={m.infoText}>
                  El cliente recibirá un email para guardar su tarjeta de forma segura.
                  Hasta entonces su estado aparecerá como "Sin tarjeta".
                </p>
              </div>

              {createErr && (
                <div style={m.errorBox}>{createErr}</div>
              )}

              {/* ── Footer ─────────────────────────────────────────────────── */}
              <div style={m.footer}>
                <button type="button" style={m.btnCancel} onClick={() => setModal(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ ...m.btnSubmit, opacity: creating ? 0.65 : 1 }}
                  disabled={creating}
                >
                  {creating ? "Creando..." : "Crear suscripción"}
                </button>
              </div>
            </form>
          </div>
        </Overlay>
      )}
    </div>
  );
}

// ── Modal field wrapper ────────────────────────────────────────────────────────
function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label style={m.label}>
        {label}{required && <span style={{ color: "#EF4444", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Modal styles ──────────────────────────────────────────────────────────────
const BASE_INPUT: React.CSSProperties = {
  height: 44, width: "100%", boxSizing: "border-box",
  border: "1px solid #D1D5DB", borderRadius: 6,
  padding: "0 12px", fontSize: 14,
  color: "#0A0A0A", background: "#fff",
  outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
  fontFamily: "inherit",
};

const m: Record<string, React.CSSProperties> = {
  shell:       { background: "#fff", borderRadius: 8, width: "100%", maxWidth: 520, maxHeight: "92dvh", overflowY: "auto", boxShadow: "0 2px 16px rgba(0,0,0,0.12)" },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 32px 20px", borderBottom: "1px solid #E5E7EB" },
  headerTitle: { fontSize: 16, fontWeight: 600, color: "#0A0A0A", letterSpacing: "-0.01em" },
  closeBtn:    { background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 },
  body:        { padding: "28px 32px", display: "flex", flexDirection: "column", gap: 16 },
  row2:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  label:       { fontSize: 11, fontWeight: 500, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6, display: "block" },
  input:       { ...BASE_INPUT },
  inputFocus:  { ...BASE_INPUT, borderColor: "#0570DE", boxShadow: "0 0 0 3px rgba(5,112,222,0.12)" },
  hint:        { margin: "6px 0 0", fontSize: 12, color: "#9CA3AF", lineHeight: 1.4 },
  divider:     { height: 1, background: "#E5E7EB", margin: "4px 0" },
  sectionLabel:{ fontSize: 11, fontWeight: 500, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" },

  typeTabs:     { display: "flex", borderBottom: "1px solid #E5E7EB", gap: 0, marginBottom: 4 },
  typeTab:      { padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#6B7280", borderBottom: "2px solid transparent", marginBottom: -1, transition: "color 0.1s, border-color 0.1s" },
  typeTabActive:{ color: "#0A0A0A", borderBottomColor: "#0A0A0A", fontWeight: 600 },

  amountWrap:   { position: "relative" },
  amountPrefix: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#6B7280", pointerEvents: "none", userSelect: "none" },

  pills:       { display: "flex", gap: 6 },
  pill:        { padding: "6px 14px", fontSize: 13, fontWeight: 500, color: "#6B7280", background: "#fff", border: "1px solid #D1D5DB", borderRadius: 4, cursor: "pointer", transition: "all 0.1s" },
  pillActive:  { background: "#0A0A0A", color: "#fff", borderColor: "#0A0A0A" },

  infoBlock:   { display: "flex", gap: 12, alignItems: "flex-start" },
  infoBar:     { width: 4, minWidth: 4, borderRadius: 2, background: "#0570DE", alignSelf: "stretch" },
  infoText:    { fontSize: 13, color: "#6B7280", lineHeight: 1.6, margin: 0 },

  errorBox:    { padding: "10px 14px", border: "1px solid #FECACA", borderRadius: 6, background: "#FEF2F2", fontSize: 13, color: "#B91C1C" },

  footer:      { display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8 },
  btnCancel:   { padding: "10px 18px", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#6B7280" },
  btnSubmit:   { padding: "10px 24px", background: "#0570DE", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "opacity 0.15s" },
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — COBRO POR XML
// ══════════════════════════════════════════════════════════════════════════════
type XmlPhase = "upload" | "parsed" | "executing" | "done";

// ── Datos de demo: simula haber subido el XML de 100 clientes ─────────────────
const DEMO_NAMES = [
  ["Cristina","Moreno Romero"],["Sergio","Soler Fuster"],["Alberto","Pascual Segura"],
  ["Laura","García López"],["Miguel","Martínez Sánchez"],["Ana","González Fernández"],
  ["Carlos","Rodríguez Pérez"],["Elena","López Gómez"],["Juan","Fernández Díaz"],
  ["María","Sánchez Martín"],["Pedro","Pérez Jiménez"],["Isabel","Gómez Ruiz"],
  ["Antonio","Martín Hernández"],["Carmen","Jiménez Moreno"],["Francisco","Ruiz Muñoz"],
  ["Rosa","Hernández Álvarez"],["Manuel","Moreno Navarro"],["Lucía","Muñoz Torres"],
  ["Jesús","Álvarez Domínguez"],["Marta","Romero Gil"],["David","Navarro Vázquez"],
  ["Pilar","Torres Serrano"],["José","Domínguez Ramos"],["Nuria","Gil Blanco"],
  ["Alejandro","Vázquez Castro"],["Cristina","Serrano Suárez"],["Daniel","Ramos Ortega"],
  ["Sara","Blanco Rubio"],["Pablo","Castro Molina"],["Patricia","Suárez Delgado"],
  ["Sergio","Ortega Ortiz"],["Raquel","Rubio Ramírez"],["Alberto","Molina Vargas"],
  ["Silvia","Delgado Iglesias"],["Javier","Ortiz Santana"],["Mónica","Ramírez Medina"],
  ["Roberto","Vargas Castillo"],["Beatriz","Iglesias Guerrero"],["Fernando","Santana Reyes"],
  ["Natalia","Medina Calvo"],["Óscar","Castillo Santos"],["Verónica","Guerrero Peña"],
  ["Diego","Reyes Cruz"],["Amparo","Calvo Flores"],["Rubén","Santos León"],
  ["Alicia","Peña Herrera"],["Víctor","Cruz Vega"],["Yolanda","Flores Cano"],
  ["Iván","León Cabrera"],["Rocío","Herrera Prieto"],["Marcos","Vega Silva"],
  ["Susana","Cano Cortés"],["Álvaro","Cabrera Aguilar"],["Nuria","Prieto Fuentes"],
  ["Diego","Silva Lorenzo"],["Beatriz","Cortés Benítez"],["Óscar","Aguilar Acosta"],
  ["Verónica","Fuentes Ibáñez"],["Fernando","Lorenzo Pascual"],["Natalia","Benítez Garrido"],
  ["Roberto","Acosta Mora"],["Javier","Ibáñez Moya"],["Silvia","Pascual Parra"],
  ["Raquel","Garrido Pino"],["Pablo","Mora Crespo"],["Patricia","Moya Gallardo"],
  ["Sara","Parra Herrero"],["Daniel","Pino Bravo"],["Alejandro","Crespo Rivero"],
  ["Cristina","Gallardo Soto"],["Nuria","Herrero Vicente"],["José","Bravo Montoya"],
  ["Pilar","Rivero Vera"],["Marta","Soto Alonso"],["David","Vicente Arias"],
  ["Lucía","Montoya Nieto"],["Francisco","Vera Pedraza"],["Carmen","Alonso Cardona"],
  ["Antonio","Arias Lara"],["Isabel","Nieto Bermúdez"],["Juan","Pedraza Hidalgo"],
  ["Elena","Cardona Marcos"],["Carlos","Lara Espinosa"],["Ana","Bermúdez Carrasco"],
  ["Laura","Hidalgo Valero"],["Sergio","Marcos Piñeiro"],["Alberto","Espinosa Coronado"],
  ["Cristina","Carrasco Caballero"],["Daniel","Valero Aguirre"],["Sara","Piñeiro Pacheco"],
  ["Pablo","Coronado Segura"],["Patricia","Caballero Durán"],["Sergio","Aguirre Montes"],
  ["Raquel","Pacheco Casado"],["Alberto","Segura Vergara"],["Silvia","Durán Esteve"],
  ["Javier","Montes Palacios"],["Mónica","Casado Iborra"],["Roberto","Vergara Fuster"],
  ["Beatriz","Esteve Soler"],["Fernando","Palacios Reyes"],
];
const PRICES = [
  29.99,39.99,49.99,59.99,69.99,79.99,89.99,99.99,120,150,180,200,250,
  85.50,92.75,110,45,55,65,75,130,160,210,300,35,42.50,67.80,88.20,115,145,
];
function pickPrice(i: number) { return PRICES[i % PRICES.length]; }
function fmtDemo(eur: number) {
  return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(eur);
}

// 68 con tarjeta, 20 sin tarjeta (found), 12 no encontrados
function buildDemoResult(): ParseResult {
  const records: ParseRecord[] = DEMO_NAMES.map(([pila, ape], i) => {
    const n    = i + 1;
    const name = `${pila} ${ape}`;
    const ref  = `CLI-${String(n).padStart(4,"0")}`;
    const amtEur = pickPrice(i);
    const amount = Math.round(amtEur * 100);
    const found   = n <= 88;          // 88 en BD, 12 no encontrados
    const hasCard = found && n <= 68; // 68 con tarjeta
    return {
      name, email: `${pila.toLowerCase()}${n}@gmail.com`,
      reference: ref, amount, amountFormatted: fmtDemo(amtEur),
      iban: `ES${35 + (i % 60)}${String(1000+i).padStart(20,"0")}`,
      found, hasCard,
      customerId: found ? `cust_demo_${n}` : null,
      status: hasCard ? "ACTIVE" : found ? "PENDING_CARD" : null,
    };
  });
  const totalAmount = records.reduce((s,r) => s + r.amount, 0);
  return {
    totalRecords: 100, totalAmount,
    totalAmountFormatted: fmtDemo(totalAmount / 100),
    withCard: 68, withoutCard: 20, notFound: 12, records,
  };
}

function TabXML() {
  const [phase,         setPhase]         = useState<XmlPhase>("upload");
  const [parseResult,   setParseResult]   = useState<ParseResult | null>(null);
  const [execResult,    setExecResult]    = useState<BatchExecuteResult | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [loadingLabel,  setLoadingLabel]  = useState("");
  const [confirm,       setConfirm]       = useState(false);
  const [dragging,      setDragging]      = useState(false);
  const [toast,         setToast]         = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  // ── Parseo XML en el cliente (DOMParser nativo — sin subir el archivo) ──────
  function parseXmlLocally(xml: string): Array<{
    name: string; reference: string; amount: number;
    iban?: string; email?: string;
  }> | null {
    const doc = new DOMParser().parseFromString(xml, "text/xml");

    // DOMParser devuelve <parsererror> en lugar de lanzar excepción
    if (doc.querySelector("parsererror") || doc.documentElement?.tagName === "parsererror") {
      return null; // señal de que hay que usar el servidor como fallback
    }

    // getElementsByTagNameNS("*", tag) funciona con cualquier namespace (SEPA, etc.)
    const byTag = (el: Element | Document, tag: string) =>
      (el.getElementsByTagNameNS("*", tag)[0]?.textContent ?? "").trim();

    const pickFirst = (el: Element, ...tags: string[]) => {
      for (const t of tags) {
        const v = byTag(el, t);
        if (v) return v;
      }
      return "";
    };

    // Localizar bloques de transacción por etiquetas habituales SEPA / genéricas
    const TX_TAGS = ["DrctDbtTxInf","CdtTrfTxInf","Transaction","Transaccion","Item","Record","Entry","PmtInf"];
    let txEls: Element[] = [];
    for (const tag of TX_TAGS) {
      const found = Array.from(doc.getElementsByTagNameNS("*", tag));
      if (found.length) { txEls = found; break; }
    }

    // Fallback genérico: hijos directos del primer hijo del root
    if (!txEls.length) {
      const child = doc.documentElement?.firstElementChild;
      if (child) txEls = Array.from(child.children);
    }

    return txEls
      .map(tx => {
        const name  = pickFirst(tx, "Nm","Name","Nombre","NombreDeudor");
        const ref   = pickFirst(tx, "MndtId","EndToEndId","Ref","Reference","Id","ExternalRef");
        const amtRaw = pickFirst(tx, "InstdAmt","Amt","TtlInttdAmt","Amount","Importe");
        const iban  = byTag(tx, "IBAN")  || undefined;
        const email = pickFirst(tx, "EmailAdr","Email","Mail") || undefined;
        const amount = Math.round(parseFloat(amtRaw.replace(",", ".")) * 100) || 0;
        return { name, reference: ref, amount, iban, email };
      })
      .filter(r => r.reference && r.amount > 0);
  }

  async function parseFile(file: File) {
    setLoadingLabel("Leyendo XML...");
    setLoading(true);
    try {
      const xml = await file.text();
      setLoadingLabel("Procesando registros...");

      let raw = parseXmlLocally(xml);

      // Fallback al servidor si el parser cliente falla o no encuentra nada
      if (!raw || !raw.length) {
        setLoadingLabel("Analizando en servidor...");
        const fd = new FormData();
        fd.append("file", file);
        const res  = await fetch("/api/subscriptions/xml/parse", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) { showToast(`❌ ${data.error ?? "Error al procesar XML"}`); return; }
        setParseResult(data as ParseResult);
        setPhase("parsed");
        return;
      }

      // 2. Solo enviar referencias al servidor (payload mínimo)
      setLoadingLabel(`Cruzando ${raw.length} registros con la BD...`);
      const refs = [...new Set(raw.map(r => r.reference))];
      const res  = await fetch("/api/subscriptions/xml/crossref", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ references: refs }),
      });
      const { map } = await res.json() as {
        map: Record<string, { customerId: string; hasCard: boolean; status: string }>;
      };

      // 3. Construir resultado localmente
      const fmtEur = (c: number) =>
        new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(c / 100);

      const records: ParseRecord[] = raw.map(r => {
        const hit = map[r.reference];
        return {
          name:            r.name,
          email:           r.email ?? null,
          reference:       r.reference,
          amount:          r.amount,
          amountFormatted: fmtEur(r.amount),
          iban:            r.iban ?? null,
          found:           !!hit,
          hasCard:         hit?.hasCard ?? false,
          customerId:      hit?.customerId ?? null,
          status:          hit?.status ?? null,
        };
      });

      const totalAmount = raw.reduce((s, r) => s + r.amount, 0);
      setParseResult({
        totalRecords:        records.length,
        totalAmount,
        totalAmountFormatted: fmtEur(totalAmount),
        withCard:    records.filter(r => r.hasCard).length,
        withoutCard: records.filter(r => r.found && !r.hasCard).length,
        notFound:    records.filter(r => !r.found).length,
        records,
      });
      setPhase("parsed");
    } catch (e) {
      showToast("❌ Error al procesar el archivo XML");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".xml")) parseFile(file);
  }

  async function importNew() {
    if (!parseResult) return;
    const newRecs = parseResult.records.filter(r => !r.found);
    if (!newRecs.length) { showToast("No hay clientes nuevos que importar"); return; }
    setLoadingLabel("Importando clientes nuevos...");
    setLoading(true);
    const res = await fetch("/api/subscriptions/xml/import", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: newRecs }),
    });
    const d = await res.json();
    setLoading(false);
    showToast(`✅ ${d.imported} importados, ${d.skipped} omitidos`);
    if (fileRef.current?.files?.[0]) parseFile(fileRef.current.files[0]);
  }

  async function invitePending() {
    if (!parseResult) return;
    const ids = parseResult.records.filter(r => r.found && !r.hasCard && r.customerId).map(r => r.customerId!);
    if (!ids.length) { showToast("No hay clientes pendientes con tarjeta"); return; }
    const res = await fetch("/api/subscriptions/invite/batch", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerIds: ids }),
    });
    const d = await res.json();
    showToast(`✅ ${d.sent} invitaciones enviadas`);
  }

  async function executeCharges() {
    if (!parseResult) return;
    setConfirm(false);
    setPhase("executing");
    setLoadingLabel("Procesando cobros...");
    setLoading(true);
    const withCard = parseResult.records.filter(r => r.hasCard);
    const res = await fetch("/api/subscriptions/batch/execute", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: withCard }),
    });
    const d = await res.json();
    setLoading(false);
    if (!res.ok) { showToast(`❌ ${d.error}`); setPhase("parsed"); return; }
    setExecResult(d as BatchExecuteResult);
    setPhase("done");
  }

  async function instantPayout() {
    const res = await fetch("/api/subscriptions/payout/instant", { method: "POST" });
    const d   = await res.json();
    if (res.ok) showToast(`✅ Payout solicitado: ${d.amountFormatted} llegarán en minutos`);
    else showToast(`❌ ${d.error}`);
  }

  async function downloadReport() {
    if (!execResult?.batchJobId) return;
    window.open(`/api/billing/batch/${execResult.batchJobId}/report?format=csv`, "_blank");
  }

  return (
    <div>
      {toast && <div style={s.toast}>{toast}</div>}

      {/* FASE 1 — Upload */}
      {phase === "upload" && (
        <div>
          <div
            style={{
              ...s.dropzone,
              borderColor: dragging ? "#000" : "#D1D5DB",
              background:  dragging ? "#F0F0F0" : "#FAFAFA",
            }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
            <p style={{ fontWeight: 600, fontSize: 16, color: "#111", margin: "0 0 6px" }}>
              Arrastra tu XML SEPA aquí
            </p>
            <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
              o haz clic para seleccionar un archivo pain.008
            </p>
            <input
              ref={fileRef} type="file" accept=".xml" hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); }}
            />
          </div>
          {loading && <LoadingBar label={loadingLabel} />}
        </div>
      )}

      {/* FASE 2 — Resumen parsed */}
      {(phase === "parsed" || phase === "executing") && parseResult && (
        <div>
          {/* Resumen box */}
          <div style={s.summaryBox}>
            <div style={s.summaryGrid}>
              <SummaryCell label="Total clientes" value={String(parseResult.totalRecords)} />
              <SummaryCell label="Total importe"  value={parseResult.totalAmountFormatted} />
              <SummaryCell label="Con tarjeta ✅" value={String(parseResult.withCard)} color="#15803D" />
              <SummaryCell label="Sin tarjeta ⚠️" value={String(parseResult.withoutCard)} color="#B45309" />
              <SummaryCell label="No encontrados" value={String(parseResult.notFound)} color="#888" />
            </div>
          </div>

          {/* Acciones */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {parseResult.notFound > 0 && (
              <button style={s.btnSecondary} onClick={importNew} disabled={loading}>
                Importar {parseResult.notFound} clientes nuevos
              </button>
            )}
            {parseResult.withoutCard > 0 && (
              <button style={s.btnSecondary} onClick={invitePending} disabled={loading}>
                Enviar invitación a {parseResult.withoutCard} sin tarjeta
              </button>
            )}
            {parseResult.withCard > 0 && (
              <button style={s.btnPrimary} onClick={() => setConfirm(true)} disabled={loading || phase === "executing"}>
                Ejecutar {parseResult.withCard} cobros
              </button>
            )}
            <button style={s.btnGhost} onClick={() => { setPhase("upload"); setParseResult(null); }}>
              Subir otro XML
            </button>
          </div>

          {loading && <LoadingBar label={loadingLabel} />}

          {/* Tabla detallada */}
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Nombre", "Referencia", "Importe", "Estado"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parseResult.records.map((r, i) => {
                  const st = r.hasCard
                    ? { label: "✅ Lista",      bg: "#F0FDF4", text: "#15803D" }
                    : r.found
                      ? { label: "⚠️ Sin tarjeta", bg: "#FFFBEB", text: "#B45309" }
                      : { label: "❓ No encontrado", bg: "#F9FAFB", text: "#6B7280" };
                  return (
                    <tr key={i} style={s.tr}>
                      <td style={s.td}>{r.name}</td>
                      <td style={{ ...s.td, fontFamily: "monospace", fontSize: 12, color: "#666" }}>{r.reference}</td>
                      <td style={{ ...s.td, fontWeight: 600 }}>{r.amountFormatted}</td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: st.bg, color: st.text }}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Modal confirmación */}
          {confirm && (
            <Overlay onClose={() => setConfirm(false)}>
              <div style={{ ...s.modal, maxWidth: 400 }}>
                <div style={s.modalHeader}>
                  <span style={s.modalTitle}>Confirmar cobros</span>
                  <button style={s.closeBtn} onClick={() => setConfirm(false)}>✕</button>
                </div>
                <div style={{ padding: "28px 28px 24px" }}>
                  <p style={{ fontSize: 15, color: "#444", lineHeight: 1.6, marginBottom: 24 }}>
                    Vas a cobrar{" "}
                    <strong>{fmt(parseResult.records.filter(r => r.hasCard).reduce((s, r) => s + r.amount, 0))}</strong>{" "}
                    a <strong>{parseResult.withCard} clientes</strong> mediante cargo off-session.
                    Esta operación es irrevocable.
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button style={{ ...s.btnPrimary, flex: 1 }} onClick={executeCharges}>Confirmar y cobrar</button>
                    <button style={{ ...s.btnSecondary, flex: 1 }} onClick={() => setConfirm(false)}>Cancelar</button>
                  </div>
                </div>
              </div>
            </Overlay>
          )}
        </div>
      )}

      {/* FASE 3 — Resultado */}
      {phase === "done" && execResult && (
        <div>
          <div style={{ ...s.summaryBox, marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Resultado del cobro</h3>
            <div style={s.summaryGrid}>
              <SummaryCell label="✅ Cobrados"   value={String(execResult.success)} color="#15803D" />
              <SummaryCell label="Total cobrado" value={execResult.totalChargedFormatted} color="#15803D" />
              <SummaryCell label="❌ Fallidos"   value={String(execResult.failed)}  color="#B91C1C" />
            </div>
          </div>

          {execResult.failedList.length > 0 && (
            <div style={{ ...s.tableWrap, marginBottom: 20 }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #F0F0F0", fontWeight: 700, fontSize: 14, color: "#B91C1C" }}>
                Cobros fallidos
              </div>
              <table style={s.table}>
                <thead>
                  <tr>{["Nombre", "Referencia", "Importe", "Motivo"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {execResult.failedList.map((f, i) => (
                    <tr key={i} style={s.tr}>
                      <td style={s.td}>{f.name}</td>
                      <td style={{ ...s.td, fontFamily: "monospace", fontSize: 12 }}>{f.reference}</td>
                      <td style={{ ...s.td, fontWeight: 600 }}>{fmt(f.amount)}</td>
                      <td style={{ ...s.td, fontSize: 12, color: "#B91C1C" }}>{f.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Instant payout */}
          <div style={{ ...s.summaryBox, background: "#000", color: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>⚡ Instant Payout</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                  Recibe {execResult.totalChargedFormatted} en tu cuenta bancaria en minutos
                </div>
              </div>
              <button style={{ ...s.btnPrimary, background: "#fff", color: "#000", minWidth: 180 }} onClick={instantPayout}>
                Recibir ahora
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button style={s.btnSecondary} onClick={downloadReport}>⬇ Descargar reporte CSV</button>
            <button style={s.btnGhost} onClick={() => { setPhase("upload"); setParseResult(null); setExecResult(null); }}>
              Nuevo cobro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — HISTORIAL
// ══════════════════════════════════════════════════════════════════════════════
function TabHistory() {
  const [jobs,    setJobs]    = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscriptions/batch/history")
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => setJobs(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonTable rows={3} cols={5} />;
  if (!jobs.length) return <Empty icon="📋" title="Sin historial" sub="Los cobros ejecutados aparecerán aquí" />;

  return (
    <div style={s.tableWrap}>
      <table style={s.table}>
        <thead>
          <tr>
            {["Archivo", "Fecha", "Total", "✅ Cobrados", "❌ Fallidos", "⚠️ Sin tarjeta", "Estado", ""].map(h => (
              <th key={h} style={s.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map(j => (
            <tr key={j.id} style={s.tr}>
              <td style={{ ...s.td, fontFamily: "monospace", fontSize: 12 }}>{j.filename}</td>
              <td style={{ ...s.td, fontSize: 13, color: "#888" }}>
                {new Date(j.createdAt).toLocaleDateString("es-ES")}
              </td>
              <td style={s.td}>{j.totalCount}</td>
              <td style={{ ...s.td, color: "#15803D", fontWeight: 600 }}>{j.successCount}</td>
              <td style={{ ...s.td, color: "#B91C1C" }}>{j.failedCount}</td>
              <td style={{ ...s.td, color: "#B45309" }}>{j.noCardCount}</td>
              <td style={s.td}>
                <span style={{
                  ...s.badge,
                  background: j.status === "COMPLETED" ? "#F0FDF4" : j.status === "PROCESSING" ? "#EFF6FF" : "#F9FAFB",
                  color:      j.status === "COMPLETED" ? "#15803D" : j.status === "PROCESSING" ? "#1D4ED8" : "#6B7280",
                }}>
                  {j.status}
                </span>
              </td>
              <td style={s.td}>
                <a
                  href={`/api/billing/batch/${j.id}/report?format=csv`}
                  style={{ fontSize: 12, color: "#6366F1", fontWeight: 600, textDecoration: "none" }}
                >
                  CSV
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — CONFIGURACIÓN
// ══════════════════════════════════════════════════════════════════════════════
function TabSettings() {
  const [reminderDay, setReminderDay] = useState("1");
  const [saved,       setSaved]       = useState(false);

  return (
    <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 24 }}>
      <Section title="Día de cobro mensual">
        <p style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
          Día del mes en que se intentará procesar los cobros automáticamente.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="number" min={1} max={28}
            value={reminderDay}
            onChange={e => setReminderDay(e.target.value)}
            style={{ ...s.input, width: 80, textAlign: "center" }}
          />
          <span style={{ fontSize: 14, color: "#666" }}>de cada mes</span>
        </div>
      </Section>

      <Section title="Email de invitación">
        <p style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
          Personaliza el asunto del email que reciben los clientes para guardar su tarjeta.
        </p>
        <input
          defaultValue="Actualización sistema de cobros"
          style={s.input}
          placeholder="Asunto del email"
        />
      </Section>

      <Section title="Variables de entorno necesarias">
        <div style={{ background: "#1E1E2E", borderRadius: 10, padding: "14px 16px" }}>
          {[
            "RESEND_API_KEY=re_xxxxxxxxxxxx",
            "EMAIL_FROM=Cobros <cobros@tudominio.com>",
            "NEXT_PUBLIC_APP_URL=https://tudominio.com",
          ].map(line => (
            <div key={line} style={{ fontFamily: "monospace", fontSize: 12, color: "#A6E3A1", marginBottom: 4 }}>
              {line}
            </div>
          ))}
        </div>
      </Section>

      <button
        style={{ ...s.btnPrimary, alignSelf: "flex-start" }}
        onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
      >
        {saved ? "✅ Guardado" : "Guardar configuración"}
      </button>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────
function SummaryCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: color ?? "#111" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "20px 24px" }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: "0 0 14px" }}>{title}</h3>
      {children}
    </div>
  );
}

function LoadingBar({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", color: "#666", fontSize: 14 }}>
      <div style={{
        width: 18, height: 18, border: "2px solid rgba(0,0,0,0.1)",
        borderTop: "2px solid #000", borderRadius: "50%",
        animation: "spin 0.7s linear infinite", flexShrink: 0,
      }} />
      {label}
    </div>
  );
}

function Empty({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px", color: "#888" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 600, color: "#111", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{sub}</div>
    </div>
  );
}

function SkeletonTable({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div style={s.tableWrap}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: "flex", gap: 12, padding: "14px 16px", borderBottom: "1px solid #F0F0F0" }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} style={{ flex: c === 0 ? 2 : 1, height: 14, background: "#F0F0F0", borderRadius: 4, animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page:       { padding: "32px 28px", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", maxWidth: 1100, margin: "0 auto" },
  header:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  title:      { fontSize: 24, fontWeight: 700, margin: 0, color: "#111" },
  subtitle:   { fontSize: 13, color: "#888", marginTop: 4 },
  tabs:       { display: "flex", gap: 2, borderBottom: "2px solid #F0F0F0", marginBottom: 28 },
  tab:        { padding: "10px 18px", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#888", borderBottomWidth: 2, borderBottomStyle: "solid", borderBottomColor: "transparent", marginBottom: -2, transition: "all 0.15s" },
  tabActive:  { color: "#111", fontWeight: 700, borderBottomColor: "#000" },
  content:    {},
  statsRow:   { display: "flex", gap: 12, marginBottom: 20 },
  statCard:   { flex: 1, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: "16px 20px", textAlign: "center" },
  statValue:  { fontSize: 28, fontWeight: 700, lineHeight: 1 },
  statLabel:  { fontSize: 12, color: "#888", marginTop: 6 },
  tableWrap:  { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, overflow: "hidden" },
  table:      { width: "100%", borderCollapse: "collapse" },
  th:         { padding: "11px 16px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", borderBottom: "1px solid #F3F4F6", background: "#FAFAFA" },
  tr:         { borderBottom: "1px solid #F9FAFB" },
  td:         { padding: "13px 16px", fontSize: 14, color: "#111" },
  badge:      { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 50, fontSize: 12, fontWeight: 600 },
  dot:        { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
  btnPrimary: { padding: "10px 18px", background: "#000", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" },
  btnSecondary:{ padding: "10px 18px", background: "#fff", color: "#000", border: "1.5px solid #000", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" },
  btnGhost:   { padding: "10px 18px", background: "transparent", color: "#888", border: "1px solid #E5E7EB", borderRadius: 8, fontWeight: 500, cursor: "pointer", fontSize: 14 },
  btnMoto:    { padding: "6px 12px", background: "#1D4ED8", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: 12 },
  btnXS:      { padding: "5px 12px", background: "#000", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: 12 },
  dropzone:   { border: "2px dashed", borderRadius: 16, padding: "60px 32px", textAlign: "center", cursor: "pointer", transition: "all 0.15s", marginBottom: 20 },
  summaryBox: { background: "#F8F8FA", border: "1px solid #E5E7EB", borderRadius: 16, padding: "20px 24px", marginBottom: 20 },
  summaryGrid:{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "space-around" },
  modal:      { background: "#fff", borderRadius: 18, width: "100%", maxWidth: 540, maxHeight: "90dvh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
  modalHeader:{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px", borderBottom: "1px solid #F3F4F6" },
  modalTitle: { fontWeight: 700, fontSize: 17, color: "#111" },
  closeBtn:   { background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#888" },
  input:      { padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, color: "#111", background: "#fff", width: "100%", boxSizing: "border-box" },
  toast:      { position: "fixed", bottom: 24, right: 24, background: "#111", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 2000, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" },
};

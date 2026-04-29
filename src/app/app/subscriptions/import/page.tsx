"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Upload, FileSpreadsheet, ArrowLeft, Download,
  CheckCircle2, AlertTriangle, XCircle, Loader2,
  Users, ChevronRight, Send,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ImportRecord {
  name:            string;
  email:           string | null;
  phone:           string | null;
  reference:       string;
  amount:          number;
  amountFormatted: string;
  iban:            string | null;
  found:           boolean;
  hasCard:         boolean;
  customerId:      string | null;
  status:          string | null;
}

interface ParseResult {
  totalRecords:         number;
  totalAmount:          number;
  totalAmountFormatted: string;
  withCard:             number;
  withoutCard:          number;
  notFound:             number;
  records:              ImportRecord[];
  sourceFile:           string;
}

type Phase = "upload" | "preview" | "done";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rowStatus(r: ImportRecord): { icon: React.ReactNode; label: string; color: string } {
  if (r.found && r.hasCard)  return { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Con tarjeta",  color: "text-emerald-600 bg-emerald-50" };
  if (r.found && !r.hasCard) return { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "Sin tarjeta", color: "text-amber-600 bg-amber-50"   };
  if (!r.email)              return { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "Sin email",   color: "text-amber-600 bg-amber-50"   };
  return                            { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Listo",       color: "text-emerald-600 bg-emerald-50" };
}

// ─── Zona de drop ─────────────────────────────────────────────────────────────

function DropZone({ onFile, loading }: { onFile: (f: File) => void; loading: boolean }) {
  const [drag, setDrag]  = useState(false);
  const inputRef         = useRef<HTMLInputElement>(null);

  const accept = ".xlsx,.xls,.csv,.xml";

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => !loading && inputRef.current?.click()}
      className={`
        flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed
        cursor-pointer transition-all duration-200 px-6 py-12
        ${drag
          ? "border-indigo-400 bg-indigo-50"
          : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50"
        }
        ${loading ? "pointer-events-none opacity-60" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />

      {loading ? (
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
      ) : (
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${drag ? "bg-indigo-100" : "bg-white border border-slate-200"}`}>
          <Upload className={`h-7 w-7 ${drag ? "text-indigo-500" : "text-slate-400"}`} />
        </div>
      )}

      <div className="text-center">
        <p className="text-[15px] font-semibold text-slate-700">
          {loading ? "Procesando archivo…" : "Arrastra tu archivo aquí"}
        </p>
        <p className="mt-1 text-[13px] text-slate-400">
          {loading ? "Un momento por favor" : "o haz clic para seleccionar"}
        </p>
        {!loading && (
          <div className="mt-3 flex items-center justify-center gap-2">
            {[".xlsx", ".csv", ".xml"].map((ext) => (
              <span key={ext} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-mono font-medium text-slate-500">
                {ext}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function SubscriptionsImportPage() {
  const [phase,       setPhase]       = useState<Phase>("upload");
  const [result,      setResult]      = useState<ParseResult | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [confirming,  setConfirming]  = useState(false);
  const [doneResult,  setDoneResult]  = useState<{ imported: number; invitesSent: number; errors: number } | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [sendInvites, setSendInvites] = useState(true);
  const [search,      setSearch]      = useState("");

  const filtered = (result?.records ?? []).filter((r) =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Descargar plantilla ───────────────────────────────────────────────────
  const downloadTemplate = useCallback(async () => {
    const res = await fetch("/api/subscriptions/import");
    if (!res.ok) return;
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "plantilla-clientes.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ── Upload + parse ────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/subscriptions/import", { method: "POST", body: fd });
      const data = await res.json() as ParseResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al procesar el archivo");
      setResult(data);
      setPhase("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Confirmar importación ─────────────────────────────────────────────────
  const confirmImport = useCallback(async () => {
    if (!result) return;
    setConfirming(true);
    setError(null);
    try {
      const newRecords = result.records.filter((r) => !r.found);
      const res = await fetch("/api/subscriptions/import/confirm", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ records: newRecords, sendInvites }),
      });
      const data = await res.json() as { imported?: number; invitesSent?: number; errors?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al importar");
      setDoneResult({ imported: data.imported ?? 0, invitesSent: data.invitesSent ?? 0, errors: data.errors ?? 0 });
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setConfirming(false);
    }
  }, [result, sendInvites]);

  const reset = () => { setPhase("upload"); setResult(null); setDoneResult(null); setError(null); setSearch(""); };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-100 bg-white px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/app/subscriptions"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600">
                <FileSpreadsheet className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-[15px] font-semibold text-slate-900 leading-tight">
                  Importar clientes
                </h1>
                <p className="text-[11px] text-slate-400">Excel, CSV o XML SEPA</p>
              </div>
            </div>
          </div>

          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Plantilla .xlsx
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">

        {/* ── FASE UPLOAD ────────────────────────────────────────── */}
        {phase === "upload" && (
          <div className="space-y-6">
            {/* Drop zone */}
            <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6">
              <DropZone onFile={handleFile} loading={loading} />
              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-[13px] text-rose-600">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* Formatos */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormatCard
                title="Excel / CSV"
                subtitle="Formato más común"
                cols={["Nombre", "Email", "Teléfono", "Importe", "Concepto", "MandatoId (opcional)"]}
                tip="Las columnas pueden estar en cualquier orden. Los nombres se detectan automáticamente en español e inglés."
              />
              <FormatCard
                title="XML SEPA"
                subtitle="pain.008 y formatos similares"
                cols={["MndtId / EndToEndId", "Nm (Nombre deudor)", "InstdAmt (Importe)", "IBAN (opcional)", "EmailAdr (opcional)"]}
                tip="Se detectan automáticamente los bloques DrctDbtTxInf, Transaction, etc."
              />
            </div>
          </div>
        )}

        {/* ── FASE PREVIEW ───────────────────────────────────────── */}
        {phase === "preview" && result && (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[13px] font-medium text-slate-500">{result.sourceFile}</p>
                  <p className="mt-1 text-[22px] font-bold text-slate-900 leading-none">
                    {result.totalRecords} clientes detectados
                  </p>
                  <p className="mt-1 text-[14px] font-semibold text-indigo-600">
                    Total: {result.totalAmountFormatted}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <StatChip icon="✅" value={result.notFound} label="Nuevos" color="emerald" />
                  <StatChip icon="⚠️" value={result.withoutCard} label="Sin tarjeta" color="amber" />
                  <StatChip icon="💳" value={result.withCard} label="Con tarjeta" color="indigo" />
                </div>
              </div>
            </div>

            {/* Opciones de importación */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={sendInvites}
                  onChange={(e) => setSendInvites(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-indigo-600"
                />
                <div>
                  <p className="text-[14px] font-medium text-slate-800">Enviar invitación de tarjeta automáticamente</p>
                  <p className="text-[12px] text-slate-400 mt-0.5">
                    Los clientes nuevos con email recibirán un link para añadir su tarjeta.
                  </p>
                </div>
              </label>
            </div>

            {/* Tabla de preview */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
              {/* Barra de búsqueda + contador */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <input
                  type="text"
                  placeholder="Buscar por nombre o email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
                />
                <p className="shrink-0 text-[12px] text-slate-400">
                  {filtered.length} de {result.totalRecords}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Nombre", "Email", "Importe", "Referencia", "Estado"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.slice(0, 200).map((r, i) => {
                      const st = rowStatus(r);
                      return (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-slate-900">{r.name || "—"}</td>
                          <td className="px-4 py-2.5 text-slate-500 text-[12px]">
                            {r.email ?? <span className="text-amber-500">Sin email</span>}
                          </td>
                          <td className="px-4 py-2.5 font-semibold tabular-nums text-slate-900">
                            {r.amountFormatted}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">
                            {r.reference.slice(0, 20)}{r.reference.length > 20 ? "…" : ""}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${st.color}`}>
                              {st.icon}
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length > 200 && (
                  <p className="px-4 py-3 text-center text-[12px] text-slate-400">
                    Mostrando 200 de {filtered.length} filas. La importación procesa todos los registros.
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-[13px] text-rose-600">
                <XCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={reset}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => void confirmImport()}
                disabled={confirming || result.notFound === 0}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirming
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Importando…</>
                  : <><Users className="h-4 w-4" />Importar {result.notFound} cliente{result.notFound !== 1 ? "s" : ""}</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── FASE DONE ──────────────────────────────────────────── */}
        {phase === "done" && doneResult && (
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 ring-4 ring-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <h2 className="text-[22px] font-bold text-slate-900">¡Importación completada!</h2>
            <p className="mt-2 text-[14px] text-slate-500">
              Los clientes han sido creados y están listos para cobro recurrente.
            </p>

            <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3">
              <ResultStat value={doneResult.imported}     label="Importados"  color="emerald" />
              <ResultStat value={doneResult.invitesSent}  label="Invitados"   color="indigo"  />
              <ResultStat value={doneResult.errors}       label="Con error"   color="rose"    />
            </div>

            {doneResult.invitesSent > 0 && (
              <div className="mx-auto mt-5 flex max-w-sm items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
                <Send className="h-4 w-4 shrink-0 text-indigo-500" />
                <p className="text-[13px] text-indigo-700">
                  {doneResult.invitesSent} clientes han recibido su invitación para añadir tarjeta.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={reset}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
              >
                Nueva importación
              </button>
              <Link
                href="/app/subscriptions"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-slate-700"
              >
                Ver clientes
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function FormatCard({ title, subtitle, cols, tip }: {
  title:    string;
  subtitle: string;
  cols:     string[];
  tip:      string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-3">
        <p className="text-[14px] font-semibold text-slate-800">{title}</p>
        <p className="text-[12px] text-slate-400">{subtitle}</p>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {cols.map((c) => (
          <span key={c} className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
            {c}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{tip}</p>
    </div>
  );
}

function StatChip({ icon, value, label, color }: {
  icon:  string;
  value: number;
  label: string;
  color: "emerald" | "amber" | "indigo";
}) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber:   "bg-amber-50 text-amber-700 ring-amber-200",
    indigo:  "bg-indigo-50 text-indigo-700 ring-indigo-200",
  };
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ring-1 ring-inset ${colors[color]}`}>
      <span>{icon}</span>
      <span>{value}</span>
      <span className="font-normal">{label}</span>
    </div>
  );
}

function ResultStat({ value, label, color }: {
  value: number;
  label: string;
  color: "emerald" | "indigo" | "rose";
}) {
  const colors = {
    emerald: "text-emerald-600",
    indigo:  "text-indigo-600",
    rose:    "text-rose-500",
  };
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
      <p className={`text-[28px] font-bold ${colors[color]}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{label}</p>
    </div>
  );
}


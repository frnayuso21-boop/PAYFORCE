"use client";

import { useRef, useState, useEffect } from "react";
import { useStatementDescriptor } from "@/hooks/useDashboard";
import { Upload, Trash2, Check, Palette, Landmark, ArrowRight, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useBrand }       from "@/context/BrandContext";
import { THEMES, THEME_IDS } from "@/lib/themes";
import Image              from "next/image";

// ─── Preview del tema ──────────────────────────────────────────────────────────

function ThemeCard({
  id, current, onSelect,
}: {
  id: string; current: boolean; onSelect: () => void;
}) {
  const t = THEMES[id];

  return (
    <button
      onClick={onSelect}
      className="group relative flex flex-col overflow-hidden rounded-2xl border-2 transition-all duration-150 hover:scale-[1.02]"
      style={{
        borderColor: current ? t.accentBg : "transparent",
        outline: current ? `2px solid ${t.accentBg}` : "none",
        outlineOffset: "2px",
      }}
    >
      {/* Mini preview del sidebar + contenido */}
      <div className="flex h-20 overflow-hidden rounded-xl">
        {/* Sidebar simulado */}
        <div className="flex w-12 shrink-0 flex-col gap-1.5 px-1.5 py-2" style={{ background: t.sidebarBg }}>
          <div className="flex h-2.5 w-2.5 rounded-sm" style={{ background: t.accentBg }} />
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-1.5 rounded-sm"
              style={{ background: i === 1 ? t.sidebarActiveBg : t.sidebarBorder, width: `${60 + i * 8}%` }} />
          ))}
        </div>

        {/* Contenido simulado */}
        <div className="flex flex-1 flex-col gap-1.5 bg-[#f8f9fb] p-2">
          <div className="flex gap-1.5">
            {[1,2,3].map((i) => (
              <div key={i} className="flex-1 rounded-lg bg-white h-8 border border-slate-100" />
            ))}
          </div>
          <div className="flex gap-1.5">
            <div className="h-5 flex-1 rounded-md bg-white border border-slate-100" />
            <div className="h-5 w-10 rounded-md" style={{ background: t.accentBg }} />
          </div>
        </div>
      </div>

      {/* Nombre + check */}
      <div className="flex items-center justify-between px-3 py-2 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-base">{t.emoji}</span>
          <span className="text-[12px] font-semibold text-slate-800">{t.name}</span>
        </div>
        {current && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full"
            style={{ background: t.accentBg }}>
            <Check className="h-3 w-3" style={{ color: t.accentText }} />
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

function clean(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9 ]/g, "").substring(0, 22);
}

export default function SettingsPage() {
  const {
    logoUrl, brandName, primaryColor, themeId,
    setLogoUrl, setBrandName, setPrimaryColor, setThemeId, theme,
  } = useBrand();

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  // ── Extracto bancario ──────────────────────────────────────────────────────
  const [descriptor,     setDescriptor]     = useState("");
  const [savedDescriptor,setSavedDescriptor]= useState("");
  const [descSaving,     setDescSaving]     = useState(false);
  const [descMsg,        setDescMsg]        = useState<{ ok: boolean; text: string } | null>(null);

  const { data: descData, isLoading: descLoading } = useStatementDescriptor();
  useEffect(() => {
    if (descData?.statementDescriptor) {
      setDescriptor(descData.statementDescriptor);
      setSavedDescriptor(descData.statementDescriptor);
    }
  }, [descData]);

  function handleDescriptorChange(val: string) {
    setDescriptor(clean(val));
    setDescMsg(null);
  }

  async function saveDescriptor() {
    setDescSaving(true);
    setDescMsg(null);
    try {
      const r = await fetch("/api/dashboard/settings/statement-descriptor", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ statementDescriptor: descriptor }),
      });
      const d = await r.json();
      if (r.ok) {
        setSavedDescriptor(d.statementDescriptor);
        setDescriptor(d.statementDescriptor);
        setDescMsg({ ok: true, text: "Extracto guardado correctamente." });
      } else {
        setDescMsg({ ok: false, text: d.error ?? "Error al guardar." });
      }
    } catch {
      setDescMsg({ ok: false, text: "Error de red." });
    } finally {
      setDescSaving(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-8 p-8">
      <div>
        <h1 className="text-[22px] font-bold text-slate-900">Configuración</h1>
        <p className="mt-1 text-[13px] text-slate-400">Personaliza la apariencia visual de tu plataforma</p>
      </div>

      {/* ── Temas ─────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-100 bg-white p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-slate-400" />
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-400">
            Plantillas y temas
          </h2>
        </div>
        <p className="text-[12px] text-slate-400 -mt-2">
          Elige el estilo visual de tu dashboard, sidebar y app móvil. El cambio se aplica al instante.
        </p>

        {/* Preview en tiempo real */}
        <div className="rounded-xl border border-slate-100 overflow-hidden mb-1">
          <div className="flex h-24">
            {/* Sidebar preview */}
            <div className="flex w-16 shrink-0 flex-col gap-2 px-2 py-2.5 transition-all duration-300"
              style={{ background: theme.sidebarBg }}>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm transition-all" style={{ background: theme.accentBg }} />
                <div className="h-2 flex-1 rounded-sm" style={{ background: theme.sidebarText, opacity: 0.4 }} />
              </div>
              {[80,65,75,55].map((w, i) => (
                <div key={i} className="h-2 rounded-sm transition-all"
                  style={{
                    width: `${w}%`,
                    background: i === 0 ? theme.sidebarActiveBg : theme.sidebarBorder,
                  }} />
              ))}
            </div>
            {/* Contenido */}
            <div className="flex flex-1 flex-col gap-2 bg-[#f8f9fb] p-3">
              <div className="flex gap-2">
                {[1,2,3].map((i) => (
                  <div key={i} className="flex-1 rounded-xl bg-white border border-slate-100 h-10" />
                ))}
              </div>
              <div className="flex gap-2">
                <div className="h-6 flex-1 rounded-lg bg-white border border-slate-100" />
                <div className="h-6 w-14 rounded-lg transition-all"
                  style={{ background: theme.accentBg }} />
              </div>
            </div>
          </div>
        </div>

        {/* Grid de temas */}
        <div className="grid grid-cols-3 gap-3">
          {THEME_IDS.map((id) => (
            <ThemeCard
              key={id}
              id={id}
              current={themeId === id}
              onSelect={() => setThemeId(id)}
            />
          ))}
        </div>
      </section>

      {/* ── Identidad de marca ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-100 bg-white p-6 space-y-6">
        <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-400">
          Identidad de marca
        </h2>

        {/* Logo */}
        <div className="space-y-3">
          <label className="text-[13px] font-medium text-slate-700">Logo</label>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50">
              {logoUrl ? (
                <Image src={logoUrl} alt="Logo" width={80} height={80}
                  className="h-full w-full object-contain" unoptimized />
              ) : (
                <span className="text-[10px] text-slate-300">Sin logo</span>
              )}
            </div>
            <div className="space-y-2">
              <button onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                <Upload className="h-3.5 w-3.5" />
                {logoUrl ? "Cambiar imagen" : "Subir imagen"}
              </button>
              {logoUrl && (
                <button onClick={() => setLogoUrl(null)}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium text-red-400 hover:bg-red-50 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar logo
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">PNG, JPG o SVG. Se mostrará en el sidebar.</p>
        </div>

        {/* Nombre */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-slate-700">Nombre de la plataforma</label>
          <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition" />
        </div>

        {/* Color custom (override del tema) */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-slate-700">Color de acento personalizado</label>
          <div className="flex items-center gap-3">
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-10 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" />
            <span className="font-mono text-[13px] text-slate-500">{primaryColor}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Este color es independiente del tema — puedes usarlo en tus elementos personalizados.
          </p>
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={handleSave}
          className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-[13px] font-semibold text-white transition-colors"
          style={{ background: theme.accentBg }}>
          {saved ? <><Check className="h-4 w-4" /> Guardado</> : "Guardar cambios"}
        </button>
      </div>

      {/* ── Extracto bancario ── */}
      <section className="rounded-2xl border border-slate-100 bg-white p-6 space-y-5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-400">
            Extracto bancario
          </h2>
        </div>
        <p className="text-[12px] text-slate-400 -mt-2">
          Texto que aparece en el banco de tu cliente cuando le cobras. Máximo 22 caracteres, solo letras y números.
        </p>

        {descLoading ? (
          <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={descriptor}
                onChange={(e) => handleDescriptorChange(e.target.value)}
                placeholder="MI EMPRESA"
                maxLength={22}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-16 text-[13px] font-mono uppercase text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition"
              />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold tabular-nums ${descriptor.length >= 22 ? "text-red-400" : "text-slate-400"}`}>
                {descriptor.length}/22
              </span>
            </div>

            {/* Vista previa */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                Vista previa en extracto
              </p>
              <p className="font-mono text-[13px] text-slate-700">
                {descriptor || "MI EMPRESA"}* PAYFORCE
              </p>
            </div>

            {/* Feedback */}
            {descMsg && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium ${
                descMsg.ok
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {descMsg.ok
                  ? <Check className="h-3.5 w-3.5 shrink-0" />
                  : <FileText className="h-3.5 w-3.5 shrink-0" />}
                {descMsg.text}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={saveDescriptor}
                disabled={descSaving || descriptor === savedDescriptor || descriptor.length < 5}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white transition disabled:opacity-40"
                style={{ background: theme.accentBg }}
              >
                {descSaving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</>
                  : <><Check className="h-4 w-4" /> Guardar cambios</>}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Cuenta bancaria ── */}
      <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <Landmark className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-slate-900">Cuenta bancaria y cobros</h2>
            <p className="text-[12px] text-slate-400">Gestiona tu cuenta de pagos y verificación</p>
          </div>
        </div>
        <p className="text-[13px] text-slate-500 leading-relaxed">
          Configura tu cuenta para recibir pagos de tus clientes directamente en tu banco.
          Necesitarás verificar tu identidad y añadir tu IBAN.
        </p>
        <Link
          href="/app/connect/onboarding"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-100 transition"
        >
          <Landmark className="h-3.5 w-3.5 text-slate-400" />
          Ir a cuenta bancaria
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
        </Link>
      </section>
    </div>
  );
}

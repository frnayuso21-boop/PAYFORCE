"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Package, Plus, Search, Tag, Edit2, Trash2, X,
  Save, Loader2, Image as ImageIcon, ToggleLeft, ToggleRight,
  ChevronDown, CheckCircle2, AlertCircle,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Product {
  id: string; name: string; description?: string | null; imageUrl?: string | null;
  sku?: string | null; category?: string | null;
  price: number; currency: string; unit: string; taxRate: number;
  stock?: number | null; active: boolean; createdAt: string;
}

const UNITS = [
  { value: "unit",  label: "Unidad" },
  { value: "hour",  label: "Hora" },
  { value: "month", label: "Mes" },
  { value: "year",  label: "Año" },
  { value: "kg",    label: "Kg" },
  { value: "item",  label: "Item" },
];

const CURRENCIES = ["eur","usd","gbp","mxn","cop","ars"];

const EMPTY_FORM = {
  name: "", description: "", imageUrl: "", sku: "", category: "",
  price: "", currency: "eur", unit: "unit", taxRate: "21", stock: "", active: true,
};

// ─── Modal crear/editar ───────────────────────────────────────────────────────
function ProductModal({
  initial, onClose, onSaved,
}: {
  initial?: Product | null;
  onClose: () => void;
  onSaved: (p: Product) => void;
}) {
  const isEdit = !!initial;
  const [form, setForm]   = useState(initial ? {
    name:        initial.name,
    description: initial.description ?? "",
    imageUrl:    initial.imageUrl    ?? "",
    sku:         initial.sku         ?? "",
    category:    initial.category    ?? "",
    price:       String(initial.price / 100),
    currency:    initial.currency,
    unit:        initial.unit,
    taxRate:     String(initial.taxRate),
    stock:       initial.stock != null ? String(initial.stock) : "",
    active:      initial.active,
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  function set(k: string, v: string | boolean) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError("El nombre es obligatorio");
    const priceNum = parseFloat(form.price.replace(",", "."));
    if (isNaN(priceNum) || priceNum < 0) return setError("Precio inválido");

    setSaving(true); setError("");
    const body = {
      name:        form.name.trim(),
      description: form.description || undefined,
      imageUrl:    form.imageUrl    || undefined,
      sku:         form.sku         || undefined,
      category:    form.category    || undefined,
      price:       Math.round(priceNum * 100),
      currency:    form.currency,
      unit:        form.unit,
      taxRate:     parseFloat(form.taxRate) || 0,
      stock:       form.stock !== "" ? parseInt(form.stock) : undefined,
      active:      form.active,
    };

    const url    = isEdit ? `/api/products/${initial!.id}` : "/api/products";
    const method = isEdit ? "PUT" : "POST";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json   = await res.json();
    setSaving(false);
    if (!res.ok) return setError(json.error ?? "Error al guardar");
    onSaved(json.product);
  }

  const field = (label: string, key: string, opts?: { type?: string; placeholder?: string; required?: boolean }) => (
    <div>
      <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
        {label}{opts?.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={opts?.type ?? "text"}
        value={(form as Record<string,string|boolean>)[key] as string}
        onChange={e => set(key, e.target.value)}
        placeholder={opts?.placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              <Package className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-[15px] font-semibold text-slate-900">{isEdit ? "Editar producto" : "Nuevo producto"}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition"><X className="h-4 w-4"/></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-[12px] text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0"/>{error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {field("Nombre del producto", "name", { required: true, placeholder: "ej. Consultoría Web" })}
            {field("SKU / Referencia",     "sku",  { placeholder: "ej. CONS-001" })}
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Descripción</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Describe brevemente el producto o servicio…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] resize-none focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Precio */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Precio <span className="text-red-400">*</span></label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                <span className="flex items-center px-2.5 bg-slate-50 text-[12px] text-slate-400 border-r border-slate-200">€</span>
                <input
                  type="number" min="0" step="0.01"
                  value={form.price}
                  onChange={e => set("price", e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-2.5 py-2 text-[12px] outline-none"
                />
              </div>
            </div>
            {/* Divisa */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Divisa</label>
              <div className="relative">
                <select
                  value={form.currency}
                  onChange={e => set("currency", e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 px-3 py-2 text-[12px] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 pr-7"
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"/>
              </div>
            </div>
            {/* Unidad */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Unidad</label>
              <div className="relative">
                <select
                  value={form.unit}
                  onChange={e => set("unit", e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 px-3 py-2 text-[12px] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 pr-7"
                >
                  {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"/>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {field("IVA (%)",    "taxRate",  { type: "number", placeholder: "21" })}
            {field("Stock",      "stock",    { type: "number", placeholder: "Sin límite" })}
            {field("Categoría",  "category", { placeholder: "ej. Servicios" })}
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1"><ImageIcon className="h-3 w-3 text-slate-400"/> URL de imagen</label>
            <input
              type="url"
              value={form.imageUrl}
              onChange={e => set("imageUrl", e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Activo toggle */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <div>
              <p className="text-[12px] font-semibold text-slate-700">Producto activo</p>
              <p className="text-[11px] text-slate-400">Visible en links de pago y facturas</p>
            </div>
            <button type="button" onClick={() => set("active", !form.active)}>
              {form.active
                ? <ToggleRight className="h-7 w-7 text-indigo-600"/>
                : <ToggleLeft  className="h-7 w-7 text-slate-300"/>}
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white disabled:opacity-60 transition"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin"/>Guardando…</> : <><Save className="h-4 w-4"/>{isEdit ? "Guardar cambios" : "Crear producto"}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Card de producto ─────────────────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete, onToggle }: {
  product:  Product;
  onEdit:   (p: Product) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${product.name}"?`)) return;
    setDeleting(true);
    await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    onDelete(product.id);
  }

  return (
    <div className={cn(
      "group relative rounded-2xl border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition hover:shadow-md",
      product.active ? "border-slate-100" : "border-slate-100 opacity-60"
    )}>
      {/* Imagen o placeholder */}
      <div className="mb-4 overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center" style={{ height: 120 }}>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <Package className="h-10 w-10 text-slate-300" />
        )}
      </div>

      {/* Badge activo/inactivo */}
      <div className="absolute top-4 right-4">
        <span className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
          product.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
        )}>
          {product.active ? "Activo" : "Inactivo"}
        </span>
      </div>

      {/* Categoría */}
      {product.category && (
        <div className="flex items-center gap-1 mb-1.5">
          <Tag className="h-2.5 w-2.5 text-indigo-400"/>
          <span className="text-[10px] text-indigo-500 font-medium">{product.category}</span>
        </div>
      )}

      <h3 className="font-semibold text-slate-900 text-[14px] leading-tight mb-1">{product.name}</h3>
      {product.description && (
        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-3">{product.description}</p>
      )}

      {/* Precio */}
      <div className="flex items-end gap-1 mb-3">
        <span className="text-[22px] font-black tabular-nums text-slate-900">
          {formatCurrency(product.price / 100, product.currency)}
        </span>
        <span className="text-[11px] text-slate-400 mb-1">/ {UNITS.find(u => u.value === product.unit)?.label ?? product.unit}</span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400 mb-4">
        {product.sku      && <span>SKU: <span className="font-mono text-slate-600">{product.sku}</span></span>}
        {product.taxRate > 0 && <span>IVA: {product.taxRate}%</span>}
        {product.stock != null && <span>Stock: {product.stock}</span>}
      </div>

      {/* Acciones */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(product)}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition"
        >
          <Edit2 className="h-3 w-3"/>Editar
        </button>
        <button
          onClick={() => onToggle(product.id, !product.active)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] text-slate-500 hover:bg-slate-50 transition"
          title={product.active ? "Desactivar" : "Activar"}
        >
          {product.active ? <ToggleRight className="h-4 w-4 text-emerald-500"/> : <ToggleLeft className="h-4 w-4 text-slate-400"/>}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg border border-red-100 px-3 py-2 text-[11px] text-red-400 hover:bg-red-50 transition disabled:opacity-50"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
        </button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [products,  setProducts]  = useState<Product[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [q,         setQ]         = useState("");
  const [category,  setCategory]  = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<Product | null>(null);
  const [toast,     setToast]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/products?active=false");
    if (res.ok) {
      const j = await res.json();
      setProducts(j.products ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  function handleSaved(p: Product) {
    setProducts(prev => {
      const exists = prev.find(x => x.id === p.id);
      return exists ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev];
    });
    setShowModal(false);
    setEditing(null);
    showToast(editing ? "Producto actualizado" : "Producto creado");
  }

  async function handleToggle(id: string, active: boolean) {
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (res.ok) {
      const { product } = await res.json();
      setProducts(prev => prev.map(p => p.id === id ? product : p));
    }
  }

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];

  const filtered = products.filter(p =>
    (!q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(q.toLowerCase()) || (p.description ?? "").toLowerCase().includes(q.toLowerCase())) &&
    (!category || p.category === category)
  );

  return (
    <div className="min-h-full space-y-6 p-6 lg:p-8">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[13px] text-white shadow-xl animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400"/>{toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Catálogo de productos</h1>
          <p className="text-sm text-slate-400 mt-0.5">Gestiona tus productos y servicios · {products.length} productos</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-md transition hover:shadow-lg"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        >
          <Plus className="h-4 w-4"/>Nuevo producto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none"/>
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por nombre, SKU…"
            className="rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-[13px] placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 w-64"
          />
        </div>
        {categories.length > 0 && (
          <div className="relative">
            <select
              value={category} onChange={e => setCategory(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 py-2.5 text-[13px] text-slate-600 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Todas las categorías</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"/>
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(6)].map((_,i) => (
            <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 animate-pulse">
              <div className="h-[120px] rounded-xl bg-slate-100 mb-4"/>
              <div className="h-3 bg-slate-100 rounded mb-2 w-3/4"/>
              <div className="h-2.5 bg-slate-100 rounded mb-4 w-1/2"/>
              <div className="h-6 bg-slate-100 rounded w-1/3"/>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20">
          <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center">
            <Package className="h-8 w-8 text-slate-300"/>
          </div>
          <div className="text-center">
            <p className="text-[15px] font-semibold text-slate-600">
              {q || category ? "Sin resultados" : "Sin productos todavía"}
            </p>
            <p className="text-[12px] text-slate-400 mt-1">
              {q || category ? "Prueba con otros filtros" : "Crea tu primer producto para usarlo en links de pago y facturas"}
            </p>
          </div>
          {!q && !category && (
            <button
              onClick={() => { setEditing(null); setShowModal(true); }}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              <Plus className="h-4 w-4"/>Crear producto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(p => (
            <ProductCard
              key={p.id} product={p}
              onEdit={prod => { setEditing(prod); setShowModal(true); }}
              onDelete={id => setProducts(prev => prev.filter(x => x.id !== id))}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ProductModal
          initial={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

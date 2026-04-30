"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { mutate } from "swr";
import { HexLogo } from "@/components/icons/HexLogo";
import { usePathname, useRouter } from "next/navigation";
import {
 LayoutDashboard, Wallet, Users, ExternalLink, RefreshCw,
 ChevronDown, ChevronRight, LogOut, Settings, User, ShieldCheck,
 Package, QrCode, Barcode, Phone, Smartphone,
 BarChart2, Receipt, FileText, Scale, Database,
 CreditCard, Layers, Code2, Zap, UserCog, Shield, ClipboardList, AlertOctagon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrand } from "@/context/BrandContext";
import Image from "next/image";

// BrandAvatar — logo propio si existe, si no hexágono PayForce 
function BrandAvatar({ size = 30, logoUrl }: { size?: number; logoUrl?: string | null }) {
 if (logoUrl) {
 return (
 <div
 style={{ width: size, height: size }}
 className="shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white flex items-center justify-center">
 <Image
 src={logoUrl}
 alt="Logo"width={size}
 height={size}
 className="h-full w-full object-contain"unoptimized
 />
 </div>
 );
 }
 return (
 <div style={{ width: size, height: size }}
 className="shrink-0 flex items-center justify-center">
 <HexLogo size={size} className="text-slate-900"/>
 </div>
 );
}

// Tipos 
type NavChild = { label: string; href: string; badge?: string };
type NavItem = {
 label: string;
 href: string;
 icon: React.ElementType;
 children?: NavChild[];
 badge?: string;
};
type NavSection = { title?: string; items: NavItem[] };

// Mapa de precarga por hover 
const PREFETCH_MAP: Record<string, string[]> = {
 "/app/dashboard": ["/api/dashboard/all"],
 "/app/balances": ["/api/dashboard/balance", "/api/payouts/instant", "/api/dashboard/payouts/instant-status"],
 "/app/transactions": ["/api/dashboard/payments?limit=200&status=all"],
 "/app/payments": ["/api/dashboard/payments?limit=100&status=all"],
 "/app/customers": ["/api/customers?limit=100"],
 "/app/products": ["/api/products?active=false"],
 "/app/payment-links":["/api/payment-links"],
 "/app/subscriptions":["/api/subscriptions/customers"],
 "/app/impagos":     ["/api/dashboard/impagos"],
 "/app/invoices": ["/api/dashboard/payments?limit=100", "/api/invoices/manual", "/api/products"],
 "/app/managers": ["/api/dashboard/managers"],
 "/app/settings": ["/api/dashboard/settings/statement-descriptor"],
};

function prefetchRoute(href: string) {
 const apis = PREFETCH_MAP[href];
 if (!apis) return;
 apis.forEach((api) => {
 void mutate(api, fetch(api).then((r) => (r.ok ? r.json() : null)), { revalidate: false });
 });
}

// Estructura de navegación 
const NAV_SECTIONS: NavSection[] = [
 {
 items: [
 { label: "Inicio", href: "/app/dashboard", icon: LayoutDashboard },
 { label: "Saldos", href: "/app/balances", icon: Wallet },
 { label: "Transacciones", href: "/app/transactions", icon: Layers },
 { label: "Clientes", href: "/app/customers", icon: Users },
 { label: "Catálogo Productos", href: "/app/products", icon: Package },
 { label: "Gestores", href: "/app/managers", icon: UserCog },
 ],
 },
 {
 title: "COBROS",
 items: [
 { label: "Payment Links", href: "/app/payment-links", icon: ExternalLink },
 { label: "Facturas", href: "/app/invoices", icon: FileText },
 {
 label: "Suscripciones",
 href: "/app/subscriptions",
 icon: RefreshCw,
 children: [
 { label: "Clientes", href: "/app/subscriptions"},
 { label: "Importar", href: "/app/subscriptions/import"},
 ],
 },
      { label: "Impagos", href: "/app/impagos", icon: AlertOctagon },
      {
 label: "Métodos de Pago",
 href: "/app/payment-methods",
 icon: CreditCard,
 children: [
 { label: "QR", href: "/app/payment-methods/qr"},
 { label: "Código de Barras", href: "/app/barcode"},
 { label: "Cobro por teléfono",href: "/dashboard/terminal"},
 { label: "Cobro QR", href: "/dashboard/terminal/qr"},
 ],
 },
 ],
 },
 {
 items: [
 {
 label: "Análisis",
 href: "/app/analytics",
 icon: BarChart2,
 children: [
 { label: "Análisis", href: "/app/analytics"},
 { label: "Métricas", href: "/app/metrics"},
 { label: "Informes", href: "/app/reports"},
 ],
 },
 ],
 },
 {
 items: [
 {
 label: "Desarrolladores",
 href: "/app/developers",
 icon: Code2,
 children: [
 { label: "API & Keys", href: "/app/developers"},
 { label: "Migrar datos", href: "/developers#migrate"},
 { label: "Docs API", href: "/developers"},
 ],
 },
 ],
 },
 {
 title: "BILLING",
 items: [
 {
 label: "Billing",
 href: "/app/billing",
 icon: Receipt,
 children: [
 { label: "Resumen", href: "/app/billing"},
 { label: "Suscripciones", href: "/app/billing/subscriptions"},
 ],
 },
 { label: "Impuestos", href: "/app/taxes", icon: Scale },
 { label: "Gestión de datos",href: "/app/data-management",icon: Database },
 ],
 },
 {
 title: "SEGURIDAD",
 items: [
 {
 label: "Seguridad",
 href: "/app/settings/security",
 icon: Shield,
 children: [
 { label: "2FA", href: "/app/settings/security"},
 { label: "Log de accesos",href: "/app/settings/audit-log"},
 ],
 },
 ],
 },
];

// Componente item 
function NavItemRow({
 item, isActive, isParentActive, expanded, onToggle, theme,
}: {
 item: NavItem;
 isActive: (href: string) => boolean;
 isParentActive: boolean;
 expanded: boolean;
 onToggle: () => void;
 theme: import("@/lib/themes").PFTheme;
}) {
 const Icon = item.icon;
 const active = isParentActive;
 const hasKids = !!item.children?.length;

 return (
 <div onMouseEnter={() => prefetchRoute(item.href)}>
 <Link
 href={item.href}
 prefetch={!hasKids}
 onClick={hasKids ? (e) => { e.preventDefault(); onToggle(); } : undefined}
 className="flex items-center gap-2 rounded-lg px-2.5 py-[7px] text-[12px] transition-all duration-100"style={active
 ? { background: theme.sidebarActiveBg, color: theme.sidebarActiveText, fontWeight: 600 }
 : { color: theme.sidebarText, fontWeight: 500 }
 }
 >
 <Icon className="h-3.5 w-3.5 shrink-0"style={{ color: active ? theme.sidebarActiveText : theme.sidebarMuted }} />
 <span className="flex-1 truncate leading-none">{item.label}</span>
 {item.badge && !hasKids && (
 <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"style={{ background: theme.accentBg, color: theme.accentText }}>
 {item.badge}
 </span>
 )}
 {hasKids && (
 <ChevronRight
 className={cn("h-3 w-3 shrink-0 transition-transform duration-150", expanded && "rotate-90")}
 style={{ color: theme.sidebarMuted }}
 />
 )}
 </Link>

 {hasKids && expanded && (
 <div className="ml-5 mt-0.5 space-y-0.5 pl-2.5"style={{ borderLeft: `1px solid ${theme.sidebarBorder}`}}>
 {item.children!.map((child) => {
 const childActive = isActive(child.href);
 return (
 <Link
 key={child.href}
 href={child.href}
 prefetch={true}
 onMouseEnter={() => prefetchRoute(child.href)}
 className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11.5px] transition-colors duration-100"style={childActive
 ? { color: theme.sidebarActiveText, fontWeight: 600, background: theme.sidebarActiveBg }
 : { color: theme.sidebarMuted }
 }
 >
 <span className="flex-1 truncate">{child.label}</span>
 {child.badge && <span className="text-[10px]">{child.badge}</span>}
 </Link>
 );
 })}
 </div>
 )}
 </div>
 );
}

// Sidebar principal 
export function Sidebar() {
 const pathname = usePathname();
 const router = useRouter();
 const [open, setOpen] = useState(false);
 const [expanded, setExpanded] = useState<Record<string, boolean>>({});
 const dropdownRef = useRef<HTMLDivElement>(null);
 const [businessName, setBusinessName] = useState<string>("");
 const [userEmail, setUserEmail] = useState<string>("");
 const [customDomainVerified,setCustomDomainVerified]= useState(false);

 useEffect(() => {
 Promise.all([
 fetch("/api/dashboard").then((r) => r.ok ? r.json() : null).catch(() => null),
 fetch("/api/dashboard/settings/custom-domain").then((r) => r.ok ? r.json() : null).catch(() => null),
 ]).then(([d, dom]) => {
 if (d) {
 setBusinessName(d.connect?.businessName ?? "");
 setUserEmail(d.connect?.email ?? "");
 }
 if (dom?.customDomainVerified) setCustomDomainVerified(true);
 });
 }, []);

 const displayName = customDomainVerified && businessName ? businessName : "PayForce";

 async function handleLogout() {
 setOpen(false);
 await fetch("/api/auth/logout", { method: "POST"});
 router.push("/");
 router.refresh();
 }

 const isActive = (href: string) =>
 pathname === href || pathname.startsWith(href + "/");

 function isParentActive(item: NavItem): boolean {
 if (isActive(item.href)) return true;
 return item.children?.some((c) => isActive(c.href)) ?? false;
 }

 function toggleItem(href: string) {
 setExpanded((prev) => ({ ...prev, [href]: !prev[href] }));
 }

 // Auto-expand si la ruta actual está en un hijo
 useEffect(() => {
 const next: Record<string, boolean> = {};
 NAV_SECTIONS.forEach((section) => {
 section.items.forEach((item) => {
 if (item.children?.some((c) => isActive(c.href))) {
 next[item.href] = true;
 }
 });
 });
 setExpanded((prev) => ({ ...prev, ...next }));
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [pathname]);

 // Cerrar dropdown perfil al hacer clic fuera
 useEffect(() => {
 function handleClickOutside(e: MouseEvent) {
 if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
 setOpen(false);
 }
 }
 document.addEventListener("mousedown", handleClickOutside);
 return () => document.removeEventListener("mousedown", handleClickOutside);
 }, []);

 const { theme, logoUrl } = useBrand();

 return (
 <aside
 className="flex h-screen w-[176px] shrink-0 flex-col"style={{ background: theme.sidebarBg, borderRight: `1px solid ${theme.sidebarBorder}`}}
 >
 {/* Logo eliminado por petición */}

 {/* Perfil */}
 <div className="relative px-2.5 pt-1 pb-2.5"ref={dropdownRef}>
 <button
 onClick={() => setOpen((v) => !v)}
 className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-black/5">
 <BrandAvatar size={30} logoUrl={logoUrl} />
 <div className="min-w-0 flex-1 text-left">
 <p className="truncate text-[11px] font-semibold leading-tight"style={{ color: theme.sidebarActiveText }}>
 {businessName || "Mi cuenta"}
 </p>
 <p className="truncate text-[10px] leading-tight"style={{ color: theme.sidebarMuted }}>
 {userEmail || displayName}
 </p>
 </div>
 <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform duration-150", open && "rotate-180")}
 style={{ color: theme.sidebarMuted }} />
 </button>

 {open && (
 <div className="absolute left-2.5 right-2.5 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
 <Link href="/app/profile"onClick={() => setOpen(false)}
 className="flex items-center gap-2 px-3.5 py-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">
 <User className="h-3.5 w-3.5 text-slate-400"/> Mi perfil
 </Link>
 <Link href="/app/settings"onClick={() => setOpen(false)}
 className="flex items-center gap-2 px-3.5 py-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">
 <Settings className="h-3.5 w-3.5 text-slate-400"/> Configuración
 </Link>
 <Link href="/app/settings/security"onClick={() => setOpen(false)}
 className="flex items-center gap-2 px-3.5 py-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">
 <ShieldCheck className="h-3.5 w-3.5 text-slate-400"/> Seguridad
 </Link>
 <div className="my-1 border-t border-slate-100"/>
 <button onClick={handleLogout}
 className="flex w-full items-center gap-2 px-3.5 py-2.5 text-[12px] font-medium text-red-500 hover:bg-red-50 transition-colors">
 <LogOut className="h-3.5 w-3.5"/> Cerrar sesión
 </button>
 </div>
 )}
 </div>

 {/* Navegación */}
 <nav className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-3 scrollbar-hide">
 {NAV_SECTIONS.map((section, si) => (
 <div key={si}>
 {section.title && (
 <p className="px-2.5 pb-1 pt-0.5 text-[10px] font-bold tracking-widest uppercase select-none"style={{ color: theme.sidebarMuted }}>
 {section.title}
 </p>
 )}
 <div className="space-y-0.5">
 {section.items.map((item) => (
 <NavItemRow
 key={item.href}
 item={item}
 isActive={isActive}
 isParentActive={isParentActive(item)}
 expanded={!!expanded[item.href]}
 onToggle={() => toggleItem(item.href)}
 theme={theme}
 />
 ))}
 </div>
 </div>
 ))}
 </nav>

 {/* Acceso rápido */}
 <div className="px-2.5 pb-3 pt-1 border-t"style={{ borderColor: theme.sidebarBorder }}>
 <Link
 href="/app/settings"prefetch={true}
 className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11.5px] font-medium transition-colors hover:bg-black/5"style={{ color: theme.sidebarMuted }}
 >
 <Settings className="h-3.5 w-3.5 shrink-0"style={{ color: theme.sidebarMuted }} />
 <span className="truncate">Configuración</span>
 </Link>
 </div>
 </aside>
 );
}

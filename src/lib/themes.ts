// PayForce — Sistema de temas
// Cada tema define variables CSS para sidebar, móvil y acentos.

export interface PFTheme {
  id:      string;
  name:    string;
  emoji:   string;
  preview: { from: string; to: string }; // gradiente para la tarjeta de preview

  // Sidebar desktop
  sidebarBg:         string;
  sidebarText:       string;     // texto items inactivos
  sidebarMuted:      string;     // texto muy tenue (section titles, badges)
  sidebarActiveBg:   string;     // fondo item activo
  sidebarActiveText: string;     // texto item activo
  sidebarBorder:     string;     // separadores / bordes

  // Botón/acento principal
  accentBg:    string;
  accentText:  string;
  accentHover: string;

  // Mobile header (sticky top)
  mobileHeaderBg:   string;
  mobileHeaderText: string;
  mobileHeaderBorder: string;

  // Mobile bottom nav
  mobileNavBg:       string;
  mobileNavBorder:   string;
  mobileNavActive:   string;
  mobileNavInactive: string;
}

export const THEMES: Record<string, PFTheme> = {
  /* ─── 1. Slate (default) ─────────────────────────────────────────────── */
  slate: {
    id: "slate", name: "Slate", emoji: "⬜",
    preview:         { from: "#efefef", to: "#0f172a" },
    sidebarBg:       "#efefef",
    sidebarText:     "#475569",
    sidebarMuted:    "#94a3b8",
    sidebarActiveBg: "#ffffff",
    sidebarActiveText:"#0f172a",
    sidebarBorder:   "rgba(0,0,0,0.07)",
    accentBg:        "#0f172a",
    accentText:      "#ffffff",
    accentHover:     "#1e293b",
    mobileHeaderBg:  "#ffffff",
    mobileHeaderText:"#0f172a",
    mobileHeaderBorder:"rgba(0,0,0,0.07)",
    mobileNavBg:     "#ffffff",
    mobileNavBorder: "rgba(0,0,0,0.07)",
    mobileNavActive: "#0f172a",
    mobileNavInactive:"#94a3b8",
  },

  /* ─── 2. Midnight ────────────────────────────────────────────────────── */
  midnight: {
    id: "midnight", name: "Midnight", emoji: "🌙",
    preview:         { from: "#0f172a", to: "#3b82f6" },
    sidebarBg:       "#0f172a",
    sidebarText:     "#94a3b8",
    sidebarMuted:    "#334155",
    sidebarActiveBg: "rgba(59,130,246,0.15)",
    sidebarActiveText:"#93c5fd",
    sidebarBorder:   "rgba(255,255,255,0.07)",
    accentBg:        "#3b82f6",
    accentText:      "#ffffff",
    accentHover:     "#2563eb",
    mobileHeaderBg:  "#0f172a",
    mobileHeaderText:"#f1f5f9",
    mobileHeaderBorder:"rgba(255,255,255,0.07)",
    mobileNavBg:     "#0f172a",
    mobileNavBorder: "rgba(255,255,255,0.07)",
    mobileNavActive: "#3b82f6",
    mobileNavInactive:"#475569",
  },

  /* ─── 3. Forest ──────────────────────────────────────────────────────── */
  forest: {
    id: "forest", name: "Forest", emoji: "🌲",
    preview:         { from: "#052e16", to: "#16a34a" },
    sidebarBg:       "#052e16",
    sidebarText:     "#86efac",
    sidebarMuted:    "#166534",
    sidebarActiveBg: "rgba(22,163,74,0.2)",
    sidebarActiveText:"#bbf7d0",
    sidebarBorder:   "rgba(255,255,255,0.07)",
    accentBg:        "#16a34a",
    accentText:      "#ffffff",
    accentHover:     "#15803d",
    mobileHeaderBg:  "#052e16",
    mobileHeaderText:"#dcfce7",
    mobileHeaderBorder:"rgba(255,255,255,0.07)",
    mobileNavBg:     "#052e16",
    mobileNavBorder: "rgba(255,255,255,0.07)",
    mobileNavActive: "#22c55e",
    mobileNavInactive:"#4ade80",
  },

  /* ─── 4. Ocean ───────────────────────────────────────────────────────── */
  ocean: {
    id: "ocean", name: "Ocean", emoji: "🌊",
    preview:         { from: "#0c4a6e", to: "#0284c7" },
    sidebarBg:       "#0c4a6e",
    sidebarText:     "#7dd3fc",
    sidebarMuted:    "#0369a1",
    sidebarActiveBg: "rgba(2,132,199,0.2)",
    sidebarActiveText:"#bae6fd",
    sidebarBorder:   "rgba(255,255,255,0.08)",
    accentBg:        "#0284c7",
    accentText:      "#ffffff",
    accentHover:     "#0369a1",
    mobileHeaderBg:  "#0c4a6e",
    mobileHeaderText:"#e0f2fe",
    mobileHeaderBorder:"rgba(255,255,255,0.08)",
    mobileNavBg:     "#0c4a6e",
    mobileNavBorder: "rgba(255,255,255,0.08)",
    mobileNavActive: "#38bdf8",
    mobileNavInactive:"#7dd3fc",
  },

  /* ─── 5. Sunset ──────────────────────────────────────────────────────── */
  sunset: {
    id: "sunset", name: "Sunset", emoji: "🌅",
    preview:         { from: "#431407", to: "#ea580c" },
    sidebarBg:       "#431407",
    sidebarText:     "#fdba74",
    sidebarMuted:    "#9a3412",
    sidebarActiveBg: "rgba(234,88,12,0.2)",
    sidebarActiveText:"#fed7aa",
    sidebarBorder:   "rgba(255,255,255,0.07)",
    accentBg:        "#ea580c",
    accentText:      "#ffffff",
    accentHover:     "#c2410c",
    mobileHeaderBg:  "#431407",
    mobileHeaderText:"#fff7ed",
    mobileHeaderBorder:"rgba(255,255,255,0.07)",
    mobileNavBg:     "#431407",
    mobileNavBorder: "rgba(255,255,255,0.07)",
    mobileNavActive: "#f97316",
    mobileNavInactive:"#fdba74",
  },

  /* ─── 6. Rose ────────────────────────────────────────────────────────── */
  rose: {
    id: "rose", name: "Rose", emoji: "🌸",
    preview:         { from: "#4c0519", to: "#e11d48" },
    sidebarBg:       "#4c0519",
    sidebarText:     "#fda4af",
    sidebarMuted:    "#9f1239",
    sidebarActiveBg: "rgba(225,29,72,0.2)",
    sidebarActiveText:"#fecdd3",
    sidebarBorder:   "rgba(255,255,255,0.07)",
    accentBg:        "#e11d48",
    accentText:      "#ffffff",
    accentHover:     "#be123c",
    mobileHeaderBg:  "#4c0519",
    mobileHeaderText:"#fff1f2",
    mobileHeaderBorder:"rgba(255,255,255,0.07)",
    mobileNavBg:     "#4c0519",
    mobileNavBorder: "rgba(255,255,255,0.07)",
    mobileNavActive: "#f43f5e",
    mobileNavInactive:"#fda4af",
  },

  /* ─── 7. Violet ──────────────────────────────────────────────────────── */
  violet: {
    id: "violet", name: "Violet", emoji: "💜",
    preview:         { from: "#2e1065", to: "#7c3aed" },
    sidebarBg:       "#2e1065",
    sidebarText:     "#c4b5fd",
    sidebarMuted:    "#4c1d95",
    sidebarActiveBg: "rgba(124,58,237,0.2)",
    sidebarActiveText:"#ddd6fe",
    sidebarBorder:   "rgba(255,255,255,0.08)",
    accentBg:        "#7c3aed",
    accentText:      "#ffffff",
    accentHover:     "#6d28d9",
    mobileHeaderBg:  "#2e1065",
    mobileHeaderText:"#ede9fe",
    mobileHeaderBorder:"rgba(255,255,255,0.08)",
    mobileNavBg:     "#2e1065",
    mobileNavBorder: "rgba(255,255,255,0.08)",
    mobileNavActive: "#8b5cf6",
    mobileNavInactive:"#c4b5fd",
  },

  /* ─── 8. Carbon ──────────────────────────────────────────────────────── */
  carbon: {
    id: "carbon", name: "Carbon", emoji: "⬛",
    preview:         { from: "#111111", to: "#6b7280" },
    sidebarBg:       "#111111",
    sidebarText:     "#6b7280",
    sidebarMuted:    "#374151",
    sidebarActiveBg: "rgba(255,255,255,0.07)",
    sidebarActiveText:"#e5e7eb",
    sidebarBorder:   "rgba(255,255,255,0.06)",
    accentBg:        "#374151",
    accentText:      "#ffffff",
    accentHover:     "#1f2937",
    mobileHeaderBg:  "#111111",
    mobileHeaderText:"#e5e7eb",
    mobileHeaderBorder:"rgba(255,255,255,0.06)",
    mobileNavBg:     "#111111",
    mobileNavBorder: "rgba(255,255,255,0.06)",
    mobileNavActive: "#9ca3af",
    mobileNavInactive:"#4b5563",
  },

  /* ─── 9. Pearl (claro cálido) ────────────────────────────────────────── */
  pearl: {
    id: "pearl", name: "Pearl", emoji: "🤍",
    preview:         { from: "#faf8f5", to: "#92400e" },
    sidebarBg:       "#faf8f5",
    sidebarText:     "#78716c",
    sidebarMuted:    "#a8a29e",
    sidebarActiveBg: "#ffffff",
    sidebarActiveText:"#292524",
    sidebarBorder:   "rgba(0,0,0,0.06)",
    accentBg:        "#92400e",
    accentText:      "#ffffff",
    accentHover:     "#78350f",
    mobileHeaderBg:  "#faf8f5",
    mobileHeaderText:"#292524",
    mobileHeaderBorder:"rgba(0,0,0,0.06)",
    mobileNavBg:     "#faf8f5",
    mobileNavBorder: "rgba(0,0,0,0.06)",
    mobileNavActive: "#92400e",
    mobileNavInactive:"#a8a29e",
  },
};

export const THEME_IDS = Object.keys(THEMES) as (keyof typeof THEMES)[];
export const DEFAULT_THEME_ID = "slate";

/** Aplica todas las variables CSS del tema en document.documentElement */
export function applyThemeCssVars(theme: PFTheme) {
  const root = document.documentElement;
  root.style.setProperty("--pf-sidebar-bg",          theme.sidebarBg);
  root.style.setProperty("--pf-sidebar-text",         theme.sidebarText);
  root.style.setProperty("--pf-sidebar-muted",        theme.sidebarMuted);
  root.style.setProperty("--pf-sidebar-active-bg",    theme.sidebarActiveBg);
  root.style.setProperty("--pf-sidebar-active-text",  theme.sidebarActiveText);
  root.style.setProperty("--pf-sidebar-border",       theme.sidebarBorder);
  root.style.setProperty("--pf-accent-bg",            theme.accentBg);
  root.style.setProperty("--pf-accent-text",          theme.accentText);
  root.style.setProperty("--pf-accent-hover",         theme.accentHover);
  root.style.setProperty("--pf-mobile-header-bg",     theme.mobileHeaderBg);
  root.style.setProperty("--pf-mobile-header-text",   theme.mobileHeaderText);
  root.style.setProperty("--pf-mobile-header-border", theme.mobileHeaderBorder);
  root.style.setProperty("--pf-mobile-nav-bg",        theme.mobileNavBg);
  root.style.setProperty("--pf-mobile-nav-border",    theme.mobileNavBorder);
  root.style.setProperty("--pf-mobile-nav-active",    theme.mobileNavActive);
  root.style.setProperty("--pf-mobile-nav-inactive",  theme.mobileNavInactive);
}

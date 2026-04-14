"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { THEMES, DEFAULT_THEME_ID, applyThemeCssVars } from "@/lib/themes";
import type { PFTheme } from "@/lib/themes";

interface BrandSettings {
  logoUrl:      string | null;
  brandName:    string;
  primaryColor: string;
  themeId:      string;
}

interface BrandContextValue extends BrandSettings {
  theme:           PFTheme;
  setLogoUrl:      (url: string | null) => void;
  setBrandName:    (name: string) => void;
  setPrimaryColor: (color: string) => void;
  setThemeId:      (id: string) => void;
}

const defaults: BrandSettings = {
  logoUrl:      null,
  brandName:    "PayForce",
  primaryColor: "#1a1a1a",
  themeId:      DEFAULT_THEME_ID,
};

const BrandContext = createContext<BrandContextValue>({
  ...defaults,
  theme:           THEMES[DEFAULT_THEME_ID],
  setLogoUrl:      () => {},
  setBrandName:    () => {},
  setPrimaryColor: () => {},
  setThemeId:      () => {},
});

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<BrandSettings>(defaults);

  // Carga desde localStorage y aplica las CSS vars
  useEffect(() => {
    try {
      const stored = localStorage.getItem("payforce_brand");
      if (stored) {
        const parsed = { ...defaults, ...JSON.parse(stored) };
        setSettings(parsed);
        applyThemeCssVars(THEMES[parsed.themeId] ?? THEMES[DEFAULT_THEME_ID]);
      } else {
        applyThemeCssVars(THEMES[DEFAULT_THEME_ID]);
      }
    } catch {
      applyThemeCssVars(THEMES[DEFAULT_THEME_ID]);
    }
  }, []);

  const save = useCallback((patch: Partial<BrandSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem("payforce_brand", JSON.stringify(next));
      // Aplicar CSS vars si cambió el tema
      if (patch.themeId !== undefined) {
        applyThemeCssVars(THEMES[patch.themeId] ?? THEMES[DEFAULT_THEME_ID]);
      }
      return next;
    });
  }, []);

  const theme = THEMES[settings.themeId] ?? THEMES[DEFAULT_THEME_ID];

  return (
    <BrandContext.Provider
      value={{
        ...settings,
        theme,
        setLogoUrl:      (url)   => save({ logoUrl: url }),
        setBrandName:    (name)  => save({ brandName: name }),
        setPrimaryColor: (color) => save({ primaryColor: color }),
        setThemeId:      (id)    => save({ themeId: id }),
      }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export const useBrand = () => useContext(BrandContext);

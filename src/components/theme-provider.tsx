"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ThemeColors = {
  id: string;
  from: string;
  to: string;
  primary: string;
  primaryHsl: string;
  ring: string;
  accent: string;
  accentForeground: string;
};

const THEMES: Record<string, ThemeColors> = {
  violet: {
    id: "violet",
    from: "#8b5cf6",
    to: "#d946ef",
    primary: "#8b5cf6",
    primaryHsl: "262 83% 58%",
    ring: "262 83% 58%",
    accent: "262 83% 96%",
    accentForeground: "262 83% 40%",
  },
  blue: {
    id: "blue",
    from: "#3b82f6",
    to: "#06b6d4",
    primary: "#3b82f6",
    primaryHsl: "217 91% 60%",
    ring: "217 91% 60%",
    accent: "217 91% 96%",
    accentForeground: "217 91% 40%",
  },
  rose: {
    id: "rose",
    from: "#f43f5e",
    to: "#ec4899",
    primary: "#f43f5e",
    primaryHsl: "347 77% 50%",
    ring: "347 77% 50%",
    accent: "347 77% 96%",
    accentForeground: "347 77% 35%",
  },
  teal: {
    id: "teal",
    from: "#14b8a6",
    to: "#06b6d4",
    primary: "#14b8a6",
    primaryHsl: "173 80% 40%",
    ring: "173 80% 40%",
    accent: "173 80% 96%",
    accentForeground: "173 80% 28%",
  },
  amber: {
    id: "amber",
    from: "#f59e0b",
    to: "#ef4444",
    primary: "#f59e0b",
    primaryHsl: "38 92% 50%",
    ring: "38 92% 50%",
    accent: "38 92% 96%",
    accentForeground: "38 92% 35%",
  },
  indigo: {
    id: "indigo",
    from: "#6366f1",
    to: "#8b5cf6",
    primary: "#6366f1",
    primaryHsl: "239 84% 67%",
    ring: "239 84% 67%",
    accent: "239 84% 96%",
    accentForeground: "239 84% 45%",
  },
};

type AppContext = {
  theme: ThemeColors;
  mode: string;
};

const ThemeContext = createContext<AppContext>({ theme: THEMES.violet, mode: "claim" });

export function useTheme() {
  return useContext(ThemeContext).theme;
}

export function useAppMode() {
  return useContext(ThemeContext).mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeColors>(THEMES.violet);
  const [mode, setMode] = useState("claim");

  useEffect(() => {
    fetch("/api/theme")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.themeColor && THEMES[data.themeColor]) {
          setTheme(THEMES[data.themeColor]);
        }
        if (data?.mode) {
          setMode(data.mode);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", theme.primaryHsl);
    root.style.setProperty("--ring", theme.ring);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--accent-foreground", theme.accentForeground);
    root.style.setProperty("--theme-from", theme.from);
    root.style.setProperty("--theme-to", theme.to);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, mode }}>{children}</ThemeContext.Provider>
  );
}

export { THEMES };

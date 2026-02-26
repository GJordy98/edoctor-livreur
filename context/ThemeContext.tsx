"use client";

/**
 * ThemeContext — e-Dr TIM Delivery System
 * Pattern : script inline dans <head> applique `dark` avant hydratation.
 * useState lit la classe déjà présente sur <html> (aucun setState dans useEffect).
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
  isDark: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  /**
   * Lire la classe présente sur <html> (mise par le script inline dans layout.tsx).
   * Côté serveur typeof window === "undefined" → toujours "dark" (pas de mismatch
   * car l'icône est rendue via CSS dark:block / hidden et non conditionnellement).
   */
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  // Synchroniser la classe <html> et localStorage quand le thème change
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("edr_theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

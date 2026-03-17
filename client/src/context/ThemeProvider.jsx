import React, { useEffect, useMemo, useState } from "react";
import { ThemeToggleContext } from "./ThemeContext";

const THEME_STORAGE_KEY = "chatflex_theme_mode";
const THEME_DARK = "dark";
const THEME_LIGHT = "light";

const getPreferredTheme = () => {
  if (typeof window === "undefined") return THEME_LIGHT;

  const persisted = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (persisted === THEME_DARK || persisted === THEME_LIGHT) return persisted;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? THEME_DARK
    : THEME_LIGHT;
};

const ThemeContextProvider = ({ children }) => {
  const [mode, setMode] = useState(getPreferredTheme);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = mode === THEME_DARK;

    root.classList.toggle(THEME_DARK, isDark);
    root.dataset.theme = mode;
    root.style.colorScheme = mode;

    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === THEME_DARK,
      setMode,
      toggleColorMode: () => {
        setMode((prev) => (prev === THEME_DARK ? THEME_LIGHT : THEME_DARK));
      },
    }),
    [mode],
  );

  return (
    <ThemeToggleContext.Provider value={value}>
      {children}
    </ThemeToggleContext.Provider>
  );
};

export default ThemeContextProvider;

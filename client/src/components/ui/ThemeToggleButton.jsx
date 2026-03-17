import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/useTheme";

const ThemeToggleButton = ({ className = "" }) => {
  const { isDark, toggleColorMode, setMode } = useTheme();

  const handleToggle = () => {
    if (typeof toggleColorMode === "function") {
      toggleColorMode();
      return;
    }

    if (typeof setMode === "function") {
      setMode(isDark ? "light" : "dark");
    }
  };

  const nextLabel = isDark ? "Light" : "Dark";
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`theme-toggle-shell inline-flex items-center gap-2 text-slate-700 dark:text-slate-200 ${className}`}
      aria-label={`Switch to ${nextLabel} mode`}
      title={`Switch to ${nextLabel} mode`}
    >
      <Icon size={14} />
      <span>{nextLabel} mode</span>
    </button>
  );
};

export default ThemeToggleButton;

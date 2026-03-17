import { useContext } from "react";
import { ThemeToggleContext } from "./ThemeContext";

export const useTheme = () => {
  return useContext(ThemeToggleContext);
};

import React, { createContext, useContext, useState, useMemo } from "react";
import { theme } from "./theme";

type ColorMode = "light" | "dark";

type ThemeContextType = {
  colorMode: ColorMode;
  isDark: boolean;
  colors: typeof theme.colors;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [colorMode, setColorMode] = useState<ColorMode>("dark");

  const isDark = colorMode === "dark";

  // Choose which palette to expose
  const colors = isDark ? theme.colors.dark : theme.colors.light;

  const value = useMemo(
    () => ({
      colorMode,
      isDark,
      colors,
      setColorMode,
      toggleColorMode: () =>
        setColorMode((prev) => (prev === "dark" ? "light" : "dark")),
    }),
    [colorMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
};

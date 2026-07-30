"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "a" | "b";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("a");

  useEffect(() => {
    const savedTheme = localStorage.getItem("emivo-theme") as Theme | null;
    if (savedTheme && (savedTheme === "a" || savedTheme === "b")) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "a");
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === "a" ? "b" : "a";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("emivo-theme", newTheme);
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

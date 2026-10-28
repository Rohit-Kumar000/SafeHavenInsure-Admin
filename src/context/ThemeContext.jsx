import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

// Light = Champagne Gold, Dark = Mocha Brown. The first visit starts in light mode.
function getInitialTheme() {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* ignore */
  }
  return "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    const dark = theme === "dark";
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    root.style.backgroundColor = dark ? "#3a2d20" : "#f4d9a0";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#3a2d20" : "#5b4632");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

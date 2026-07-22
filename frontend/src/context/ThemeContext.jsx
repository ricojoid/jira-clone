import { createContext, useContext, useState } from 'react';

const ThemeModeContext = createContext();

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return context;
}

export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', next);
      return next;
    });
  };

  return (
    <ThemeModeContext.Provider value={{ mode, toggleTheme }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

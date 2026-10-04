import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * ThemeContext
 *
 * Global dark/light theme for the whole app. Dark remains the
 * default visual identity; light is a fully designed alternate
 * palette (see src/styles/tokens.css). The active theme is applied
 * as a `data-theme` attribute on <html>, which every stylesheet
 * reads through CSS custom properties, so no page or component
 * needs its own light/dark variant.
 *
 * Persisted to localStorage so it survives a refresh, and kept in
 * sync across tabs the same way AuthContext keeps sessions in sync.
 */

const ThemeContext = createContext(null);
const STORAGE_KEY = 'dermaintel_theme';
const DEFAULT_THEME = 'dark';

function isValidTheme(value) {
  return value === 'dark' || value === 'light';
}

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isValidTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function applyThemeToDocument(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => readStoredTheme());

  // Apply instantly whenever the theme changes, and persist it.
  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage unavailable (private browsing, quota, etc.) — the
      // theme still applies for this session, it just won't persist.
    }
  }, [theme]);

  // Keep multiple tabs in sync if the theme changes elsewhere.
  useEffect(() => {
    function handleStorage(event) {
      if (event.key === STORAGE_KEY && isValidTheme(event.newValue)) {
        setTheme(event.newValue);
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme(next) {
        if (isValidTheme(next)) {
          setTheme(next);
        }
      },
      toggleTheme() {
        setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
      },
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

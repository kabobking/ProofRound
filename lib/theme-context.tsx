'use client';

import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  const storedTheme = window.localStorage.getItem('proofround-theme');
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getThemeColor(theme: Theme) {
  return theme === 'dark' ? '#07101d' : '#fafafa';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    window.localStorage.setItem('proofround-theme', theme);

    const themeColor = getThemeColor(theme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"][data-proofround-theme-color]') as HTMLMetaElement | null;
    if (metaThemeColor) {
      metaThemeColor.content = themeColor;
    }
  }, [theme]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    isDark: theme === 'dark',
    toggleTheme: () => setThemeState(current => (current === 'dark' ? 'light' : 'dark')),
    setTheme: setThemeState,
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
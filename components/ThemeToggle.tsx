'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from '@/lib/theme-context';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const mounted = useMounted();

  return (
    <Button
      variant="default"
      size="icon"
      onClick={toggleTheme}
      className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full border border-[var(--border)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-xl transition-all hover:opacity-90 hover:scale-105 active:scale-95"
      aria-label="Toggle theme"
      title={mounted ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : 'Toggle theme'}
      suppressHydrationWarning
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )
      ) : (
        <span className="h-5 w-5" />
      )}
    </Button>
  );
}

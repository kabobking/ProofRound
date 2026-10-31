import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'indigo';
}

function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default:
      'border border-[var(--accent)]/20 bg-[var(--accentTint)] text-[var(--accent)]',
    secondary:
      'border border-[var(--border)] bg-[var(--surface2)] text-[var(--muted)]',
    outline:
      'border border-[var(--border)] bg-transparent text-[var(--text)]',
    success:
      'border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    warning:
      'border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    destructive:
      'border border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
    indigo:
      'border border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide transition-colors ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export { Badge };

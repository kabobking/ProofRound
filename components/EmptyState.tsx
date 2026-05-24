'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

type Action = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
};

function ActionButton({ action }: { action: Action }) {
  const baseClass = action.variant === 'secondary'
    ? 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface2)]'
    : 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 hover:-translate-y-0.5';

  const shared = `inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-3 text-sm font-medium transition-all ${baseClass}`;

  if (action.href) {
    return <Link href={action.href} className={shared}>{action.label}</Link>;
  }

  return (
    <button type="button" onClick={action.onClick} className={shared}>
      {action.label}
    </button>
  );
}

export default function EmptyState({
  eyebrow,
  title,
  body,
  primaryAction,
  secondaryAction,
  children,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  primaryAction?: Action;
  secondaryAction?: Action;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[1.75rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.9))] p-8 shadow-[0_24px_70px_rgba(2,6,23,0.22)] ring-1 ring-white/5">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        {eyebrow && <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">{eyebrow}</p>}
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl">{title}</h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--muted)] sm:text-base">{body}</p>
        {children && <div className="mt-6 w-full">{children}</div>}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {primaryAction && <ActionButton action={primaryAction} />}
          {secondaryAction && <ActionButton action={secondaryAction} />}
        </div>
      </div>
    </div>
  );
}
'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Action = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
};

function ActionButton({ action }: { action: Action }) {
  const buttonVariant = action.variant === 'secondary' ? 'secondary' : 'default';

  if (action.href) {
    return (
      <Link href={action.href}>
        <Button variant={buttonVariant}>{action.label}</Button>
      </Link>
    );
  }

  return (
    <Button variant={buttonVariant} onClick={action.onClick}>
      {action.label}
    </Button>
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
    <div className="rounded-[1.75rem] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface2))] p-8 text-[var(--text)] shadow-[0_20px_60px_rgba(2,6,23,0.12)]">
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

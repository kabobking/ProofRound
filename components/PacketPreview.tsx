'use client';

import { ShieldCheck, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PacketPreview() {
  const metrics = [
    { label: 'MRR', value: '$128.4K', detail: '+8.1% vs. prior period' },
    { label: 'ARR', value: '$1.54M', detail: 'Annualized recurring revenue' },
    { label: 'Revenue last 30 days', value: '$142.8K', detail: 'Stripe-settled revenue only' },
    { label: 'Active customers', value: '1,284', detail: 'Read-only customer count' },
  ];

  return (
    <div className="rounded-[1.75rem] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface2))] p-6 shadow-[0_30px_90px_rgba(2,6,23,0.12)]">
      <div className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--surface)]/60 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-sm dark:bg-[var(--surface2)]/40 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Verification packet</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text)]">Stripe-verified investor view</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              Time-stamped, read-only metrics generated from Stripe data and shareable through a revocable founder-controlled link.
            </p>
          </div>
          <Badge variant="success" className="gap-1.5 py-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified
          </Badge>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {metrics.map(metric => (
            <div key={metric.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4 shadow-xs dark:bg-[var(--surface2)]/50">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">{metric.value}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{metric.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 p-4 sm:grid-cols-[1.3fr_0.7fr] sm:items-center dark:bg-[var(--surface2)]/40">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Generated</p>
            <p className="mt-1 text-sm font-medium text-[var(--text)]">May 24, 2026 at 09:42 UTC</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Read-only Stripe access. No charges. No account changes.</p>
          </div>
          <div className="flex justify-start sm:justify-end">
            <Badge variant="default" className="gap-1.5 py-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Founder link ready
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

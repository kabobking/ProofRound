'use client';

import { ShieldCheck, Sparkles } from 'lucide-react';

export default function PacketPreview() {
  const metrics = [
    { label: 'MRR', value: '$128.4K', detail: '+8.1% vs. prior period' },
    { label: 'ARR', value: '$1.54M', detail: 'Annualized recurring revenue' },
    { label: 'Revenue last 30 days', value: '$142.8K', detail: 'Stripe-settled revenue only' },
    { label: 'Active customers', value: '1,284', detail: 'Read-only customer count' },
  ];

  return (
    <div className="rounded-[1.75rem] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface2))] p-6 shadow-[0_30px_90px_rgba(2,6,23,0.12)]">
      <div className="rounded-[1.4rem] border border-[var(--border)] bg-[rgba(255,255,255,0.42)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-sm dark:bg-[rgba(255,255,255,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Verification packet</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text)]">Stripe-verified investor view</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              Time-stamped, read-only metrics generated from Stripe data and shareable through a revocable founder-controlled link.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {metrics.map(metric => (
            <div key={metric.label} className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.55)] p-4 shadow-[0_1px_0_rgba(255,255,255,0.35)] dark:bg-[rgba(255,255,255,0.03)] dark:shadow-none">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">{metric.value}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{metric.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.48)] p-4 sm:grid-cols-[1.3fr_0.7fr] sm:items-center dark:bg-[rgba(255,255,255,0.03)]">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Generated</p>
            <p className="mt-1 text-sm font-medium text-[var(--text)]">May 24, 2026 at 09:42 UTC</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Read-only Stripe access. No charges. No account changes.</p>
          </div>
          <div className="flex justify-start sm:justify-end">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/25 bg-[var(--accentTint)]/45 px-3 py-2 text-xs font-medium text-[var(--accent)]">
              <Sparkles className="h-3.5 w-3.5" />
              Founder link ready
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { ShieldCheck, Database, Lock, Users } from 'lucide-react';

const cards = [
  {
    title: 'What we access',
    icon: Lock,
    points: ['Read-only Stripe permissions', 'Revenue, customer, and subscription records', 'No write access or payment initiation'],
  },
  {
    title: 'What we never store',
    icon: Database,
    points: ['Raw Stripe objects in their original form', 'Card or bank details', 'Founder passwords or account credentials'],
  },
  {
    title: 'Founder controls',
    icon: ShieldCheck,
    points: ['Revocable packet links', 'Expiry windows for shared access', 'Visibility settings for public profiles'],
  },
  {
    title: 'Investor view',
    icon: Users,
    points: ['Read-only packet experience', 'No investor account required', 'Only aggregated, time-stamped metrics'],
  },
];

export default function SecurityCards() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {cards.map(card => {
        const Icon = card.icon;

        return (
          <div key={card.title} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_18px_50px_rgba(2,6,23,0.16)] transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]/30 hover:shadow-[0_22px_60px_rgba(2,6,23,0.24)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accentTint)] text-[var(--accent)] ring-1 ring-[var(--accent)]/15">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold tracking-tight text-[var(--text)]">{card.title}</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted)]">
                  {card.points.map(point => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
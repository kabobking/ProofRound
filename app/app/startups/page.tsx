'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getStartupsByFounder } from '@/lib/database';
import { Startup } from '@/lib/models';
import AppHeader from '@/components/AppHeader';
import StartupRevenueActions from '@/components/StartupRevenueActions';
import EmptyState from '@/components/EmptyState';
import OnboardingSteps from '@/components/OnboardingSteps';

function StartupSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map(index => (
        <div key={index} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
          <div className="h-4 w-40 animate-pulse rounded-full bg-[var(--surface2)]" />
          <div className="mt-4 h-6 w-64 animate-pulse rounded-full bg-[var(--surface2)]" />
          <div className="mt-4 h-4 w-3/4 animate-pulse rounded-full bg-[var(--surface2)]" />
          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map(item => <div key={item} className="h-14 animate-pulse rounded-2xl bg-[var(--surface2)]" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FounderStartupsPage() {
  const { userProfile } = useAuth();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;

    const loadStartups = async () => {
      try {
        setLoading(true);
        const data = await getStartupsByFounder(userProfile.id);
        setStartups(data);
      } catch (error) {
        console.error('Error loading startups:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStartups();
  }, [userProfile]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <AppHeader
        title="My startups"
        subtitle="Manage your company profiles, fundraising context, and verification packet readiness."
        quickLinks={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Investor Discovery', href: '/marketplace' },
          { label: 'Create startup', href: '/create-startup' },
        ]}
      />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {loading ? (
          <StartupSkeleton />
        ) : startups.length === 0 ? (
          <div className="mx-auto max-w-4xl">
            <EmptyState
              eyebrow="Onboarding"
              title="Create your first startup profile"
              body="Add your company details, connect Stripe read-only, and generate your first investor-ready verification packet."
              primaryAction={{ label: 'Create startup', href: '/create-startup' }}
              secondaryAction={{ label: 'View sample packet', href: '/#packet-contents' }}
            >
              <OnboardingSteps />
            </EmptyState>
          </div>
        ) : (
          <div className="space-y-6">
            {startups.map(startup => (
              <article key={startup.id} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.16)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(2,6,23,0.22)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Startup profile</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">{startup.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{startup.tagline}</p>
                    <p className="mt-5 text-sm leading-6 text-[var(--muted)]">{startup.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${startup.status === 'active' ? 'bg-emerald-400/10 text-emerald-300' : startup.status === 'draft' ? 'bg-[var(--accentTint)] text-[var(--accent)]' : 'bg-[var(--surface2)] text-[var(--muted)]'}`}>
                      {startup.status}
                    </span>
                    {!startup.visible && <span className="rounded-full bg-[var(--surface2)] px-3 py-1 text-xs font-medium text-[var(--muted)]">Private</span>}
                    {startup.verifiedFinancials && <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">Verified</span>}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-4">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface2)]/80 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Industry</p>
                    <p className="mt-2 font-medium text-[var(--text)]">{startup.industry}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface2)]/80 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Stage</p>
                    <p className="mt-2 font-medium text-[var(--text)] capitalize">{startup.stage}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface2)]/80 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Location</p>
                    <p className="mt-2 font-medium text-[var(--text)]">{startup.location}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface2)]/80 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Views</p>
                    <p className="mt-2 font-medium text-[var(--text)]">{startup.views || 0}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/startup?startupId=${startup.id}`} className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-all hover:bg-[var(--surface2)]">
                    View public page
                  </Link>
                  <StartupRevenueActions startupId={startup.id} startupName={startup.name} stripeConnected={Boolean(startup.stripeAccountId)} variant="founder" />
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
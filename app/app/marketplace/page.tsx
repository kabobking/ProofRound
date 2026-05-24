'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import AnimatedCard from '@/components/AnimatedCard';
import EmptyState from '@/components/EmptyState';
import { analyticsEvents } from '@/lib/analytics';
import { getPublicStartups, searchStartups } from '@/lib/database';
import { Startup } from '@/lib/models';

function MarketplaceSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map(index => (
        <div key={index} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
          <div className="h-4 w-28 animate-pulse rounded-full bg-[var(--surface2)]" />
          <div className="mt-4 h-6 w-3/4 animate-pulse rounded-full bg-[var(--surface2)]" />
          <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-[var(--surface2)]" />
          <div className="mt-6 h-20 animate-pulse rounded-2xl bg-[var(--surface2)]" />
        </div>
      ))}
    </div>
  );
}

function StartupCard({ startup, index }: { startup: Startup; index: number }) {
  return (
    <AnimatedCard delay={index * 40}>
      <Link href={`/startup?startupId=${startup.id}`} className="block rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.16)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(2,6,23,0.22)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Verified startup</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text)]">{startup.name}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{startup.industry}</p>
          </div>
          <span className="rounded-full bg-[var(--accentTint)] px-3 py-1 text-xs font-medium capitalize text-[var(--accent)]">{startup.stage}</span>
        </div>

        <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{startup.description}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface2)]/80 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Location</p>
            <p className="mt-2 text-sm font-medium text-[var(--text)]">{startup.location}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface2)]/80 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Verification</p>
            <p className="mt-2 text-sm font-medium text-[var(--text)]">{startup.verifiedFinancials ? 'Stripe verified' : 'Pending verification'}</p>
          </div>
        </div>

        {startup.seeking_amount ? (
          <div className="mt-6 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accentTint)]/30 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Capital raising</p>
            <p className="mt-2 text-sm font-medium text-[var(--text)]">Seeking ${(startup.seeking_amount / 1000000).toFixed(1)}M</p>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
          <span className="text-sm text-[var(--muted)]">Open the public page</span>
          <span className="inline-flex items-center rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-all group-hover:bg-[var(--surface2)]">
            View packet
          </span>
        </div>
      </Link>
    </AnimatedCard>
  );
}

export default function MarketplacePage() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('all');

  useEffect(() => {
    const loadStartups = async () => {
      try {
        setLoading(true);
        const { startups: data } = await getPublicStartups(20);
        setStartups(data);
        analyticsEvents.marketplace_view();
      } catch (error) {
        console.error('Error loading startups:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStartups();
  }, []);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!searchTerm.trim()) {
      const { startups: data } = await getPublicStartups(20);
      setStartups(data);
      return;
    }

    analyticsEvents.startup_search(searchTerm);
    const results = await searchStartups(searchTerm);
    setStartups(results);
  };

  const filteredStartups = useMemo(
    () => (filterStage === 'all' ? startups : startups.filter(startup => startup.stage === filterStage)),
    [startups, filterStage]
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <AppHeader
        title="Investor discovery"
        subtitle="Browse verified startup opportunities and packet-backed fundraising profiles."
        quickLinks={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My startups', href: '/startups' },
          { label: 'Create startup', href: '/create-startup' },
        ]}
      />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Marketplace</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">Investor Discovery</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Review startup profiles that can be paired with Stripe verification packets. Founders can appear here only after they have a profile and public visibility enabled.</p>
            </div>
            <span className="inline-flex w-fit rounded-full border border-[var(--border)] bg-[var(--surface2)] px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-[var(--muted)]">Coming soon</span>
          </div>

          <form onSubmit={handleSearch} className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto_auto]">
            <input
              type="text"
              placeholder="Search by company, industry, or description"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              className="min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/15"
            />
            <select
              value={filterStage}
              onChange={event => {
                setFilterStage(event.target.value);
                if (event.target.value !== 'all') {
                  analyticsEvents.startup_filter(event.target.value);
                }
              }}
              className="min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] outline-none transition-all focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/15"
            >
              <option value="all">All stages</option>
              <option value="pre-seed">Pre-seed</option>
              <option value="seed">Seed</option>
              <option value="series-a">Series A</option>
              <option value="series-b">Series B</option>
              <option value="series-c">Series C+</option>
              <option value="growth">Growth</option>
            </select>
            <button type="submit" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-[var(--accent-foreground)] transition-all hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md">
              Search
            </button>
          </form>
        </div>

        {loading ? (
          <MarketplaceSkeleton />
        ) : filteredStartups.length === 0 ? (
          <div className="mx-auto max-w-4xl">
            <EmptyState
              eyebrow="Marketplace"
              title="No verified startups yet."
              body="Create your startup profile and generate a verification packet before appearing here."
              primaryAction={{ label: 'Create startup profile', href: '/create-startup' }}
              secondaryAction={{ label: 'View Security Model', href: '/security' }}
            />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredStartups.map((startup, index) => (
              <StartupCard key={startup.id} startup={startup} index={index} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
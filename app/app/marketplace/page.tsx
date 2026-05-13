'use client';

import { useEffect, useState } from 'react';
import { getPublicStartups, searchStartups } from '@/lib/database';
import { Startup } from '@/lib/models';
import Link from 'next/link';
import AnimatedCard from '@/components/AnimatedCard';
import { analyticsEvents } from '@/lib/analytics';
import AppHeader from '@/components/AppHeader';
import StartupRevenueActions from '@/components/StartupRevenueActions';

export default function MarketplacePage() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      const { startups: data } = await getPublicStartups(20);
      setStartups(data);
      return;
    }

    analyticsEvents.startup_search(searchTerm);
    const results = await searchStartups(searchTerm);
    setStartups(results);
  };

  const filteredStartups =
    filterStage === 'all' ? startups : startups.filter(s => s.stage === filterStage);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.10),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#f8fafc_380px,_#ffffff_380px,_#ffffff_100%)] text-zinc-900 dark:bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.14),_transparent_36%),linear-gradient(180deg,_#020617_0%,_#020617_380px,_#0f172a_380px,_#0f172a_100%)] dark:text-white">
      <AppHeader 
        title="Marketplace" 
        subtitle="Discover verified startup opportunities and investment rounds"
        quickLinks={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My Startups', href: '/startups' },
        ]}
      />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <form onSubmit={handleSearch} className="mb-8 flex flex-col gap-4 sm:flex-row">
          <input
            type="text"
            placeholder="Search startups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/20 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30"
          />
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Search
          </button>
        </form>

        <div className="mb-8 flex gap-4">
          <select
            value={filterStage}
            onChange={(e) => {
              setFilterStage(e.target.value);
              if (e.target.value !== 'all') {
                analyticsEvents.startup_filter(e.target.value);
              }
            }}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/20 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30"
          >
            <option value="all">All Stages</option>
            <option value="pre-seed">Pre-seed</option>
            <option value="seed">Seed</option>
            <option value="series-a">Series A</option>
            <option value="series-b">Series B</option>
            <option value="series-c">Series C+</option>
            <option value="growth">Growth</option>
          </select>
        </div>

        {/* Startups Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-zinc-600 dark:text-slate-300">Loading startups...</p>
          </div>
        ) : filteredStartups.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-white/5">
            <p className="text-zinc-600 dark:text-slate-300">No startups found</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredStartups.map((startup, idx) => (
              <AnimatedCard key={startup.id} delay={idx * 50}>
                <Link
                  href={`/startup?startupId=${startup.id}`}
                  className="block rounded-2xl border border-zinc-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{startup.name}</h3>
                      <p className="text-sm text-zinc-500 dark:text-slate-300">{startup.industry}</p>
                    </div>
                    <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium capitalize text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">
                      {startup.stage}
                    </span>
                  </div>

                  <p className="mb-4 line-clamp-2 text-sm text-zinc-600 dark:text-slate-300">{startup.description}</p>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 dark:text-slate-400">{startup.location}</span>
                    {startup.verifiedFinancials && (
                      <span className="font-medium text-green-600 dark:text-emerald-300">✓ Verified</span>
                    )}
                  </div>

                  <div className="mt-4">
                    <StartupRevenueActions
                      startupId={startup.id}
                      startupName={startup.name}
                      founderEmail={startup.founderEmail}
                      variant="investor"
                    />
                  </div>

                  {startup.seeking_amount && (
                    <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-white/10">
                      <p className="text-sm text-zinc-600 dark:text-slate-300">
                        Seeking: <span className="font-semibold text-zinc-900 dark:text-white">${(startup.seeking_amount / 1000000).toFixed(1)}M</span>
                      </p>
                    </div>
                  )}
                </Link>
              </AnimatedCard>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

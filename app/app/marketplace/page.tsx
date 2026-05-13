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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_36%),linear-gradient(180deg,_#0f172a_0%,_#0f172a_380px,_#f8fafc_380px,_#f8fafc_100%)]">
      <AppHeader 
        title="Marketplace" 
        subtitle="Discover verified startup opportunities and investment rounds"
        quickLinks={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My Startups', href: '/startups' },
        ]}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 text-slate-700">
        <form onSubmit={handleSearch} className="flex gap-4 mb-8">
          <input
            type="text"
            placeholder="Search startups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
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
            className="px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
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
            <p className="mt-4 text-zinc-600">Loading startups...</p>
          </div>
        ) : filteredStartups.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-zinc-200">
            <p className="text-zinc-600">No startups found</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredStartups.map((startup, idx) => (
              <AnimatedCard key={startup.id} delay={idx * 50}>
                <Link
                  href={`/startup?startupId=${startup.id}`}
                  className="block bg-white rounded-lg border border-zinc-200 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900">{startup.name}</h3>
                      <p className="text-sm text-zinc-500">{startup.industry}</p>
                    </div>
                    <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium capitalize">
                      {startup.stage}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-600 mb-4 line-clamp-2">{startup.description}</p>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">{startup.location}</span>
                    {startup.verifiedFinancials && (
                      <span className="text-green-600 font-medium">✓ Verified</span>
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
                    <div className="mt-4 pt-4 border-t border-zinc-200">
                      <p className="text-sm text-zinc-600">
                        Seeking: <span className="font-semibold text-zinc-900">${(startup.seeking_amount / 1000000).toFixed(1)}M</span>
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

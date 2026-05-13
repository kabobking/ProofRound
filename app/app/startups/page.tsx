'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getStartupsByFounder } from '@/lib/database';
import { Startup } from '@/lib/models';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import StartupRevenueActions from '@/components/StartupRevenueActions';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-zinc-600 dark:text-slate-300">Loading startups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#f8fafc_380px,_#ffffff_380px,_#ffffff_100%)] text-zinc-900 dark:bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_36%),linear-gradient(180deg,_#0f172a_0%,_#0f172a_380px,_#020617_380px,_#020617_100%)] dark:text-white">
      <AppHeader 
        title="My Startups" 
        subtitle="Manage your company profiles and fundraising"
        quickLinks={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Marketplace', href: '/marketplace' },
          { label: '+ Add Startup', href: '/create-startup' },
        ]}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {startups.length === 0 ? (
          <div className="bg-white rounded-lg border border-zinc-200 p-12 text-center dark:border-white/10 dark:bg-white/5">
            <p className="text-zinc-600 mb-4 dark:text-slate-300">No startups yet</p>
            <Link
              href="/create-startup"
              className="text-indigo-600 hover:underline font-medium dark:text-indigo-400"
            >
              Create your first startup →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {startups.map((startup) => (
              <div key={startup.id} className="rounded-lg border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">{startup.name}</h3>
                    <p className="mt-1 text-zinc-600 dark:text-slate-300">{startup.tagline}</p>
                  </div>

                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      startup.status === 'active' ? 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300' :
                      startup.status === 'draft' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300' :
                      'bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-slate-300'
                    }`}>
                      {startup.status}
                    </span>
                    {!startup.visible && (
                      <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-medium dark:bg-white/10 dark:text-slate-300">
                        Hidden
                      </span>
                    )}
                    {startup.verifiedFinancials && (
                      <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium dark:bg-green-500/15 dark:text-green-300">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                </div>

                <p className="mb-6 text-zinc-600 dark:text-slate-300">{startup.description}</p>

                <div className="mb-6 grid gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-slate-400">Industry</p>
                    <p className="font-medium text-zinc-900 dark:text-white">{startup.industry}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-slate-400">Stage</p>
                    <p className="font-medium text-zinc-900 capitalize dark:text-white">{startup.stage}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-slate-400">Location</p>
                    <p className="font-medium text-zinc-900 dark:text-white">{startup.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-slate-400">Views</p>
                    <p className="font-medium text-zinc-900 dark:text-white">{startup.views || 0}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Link
                    href={`/startup?startupId=${startup.id}`}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-white/20 dark:text-slate-300 dark:hover:bg-white/10"
                  >
                    View Public Page
                  </Link>
                  <StartupRevenueActions
                    startupId={startup.id}
                    startupName={startup.name}
                    stripeConnected={Boolean(startup.stripeAccountId)}
                    variant="founder"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

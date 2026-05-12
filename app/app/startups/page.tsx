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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-zinc-600">Loading startups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_36%),linear-gradient(180deg,_#0f172a_0%,_#0f172a_380px,_#f8fafc_380px,_#f8fafc_100%)]">
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
          <div className="bg-white rounded-lg border border-zinc-200 p-12 text-center">
            <p className="text-zinc-600 mb-4">No startups yet</p>
            <Link
              href="/create-startup"
              className="text-indigo-600 hover:underline font-medium"
            >
              Create your first startup →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {startups.map((startup) => (
              <div key={startup.id} className="bg-white rounded-lg border border-zinc-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-zinc-900">{startup.name}</h3>
                    <p className="text-zinc-600 mt-1">{startup.tagline}</p>
                  </div>

                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      startup.status === 'active' ? 'bg-green-50 text-green-700' :
                      startup.status === 'draft' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-zinc-100 text-zinc-700'
                    }`}>
                      {startup.status}
                    </span>
                    {!startup.visible && (
                      <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-medium">
                        Hidden
                      </span>
                    )}
                    {startup.verifiedFinancials && (
                      <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-zinc-600 mb-6">{startup.description}</p>

                <div className="grid gap-4 sm:grid-cols-4 mb-6">
                  <div>
                    <p className="text-sm text-zinc-500">Industry</p>
                    <p className="font-medium text-zinc-900">{startup.industry}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Stage</p>
                    <p className="font-medium text-zinc-900 capitalize">{startup.stage}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Location</p>
                    <p className="font-medium text-zinc-900">{startup.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Views</p>
                    <p className="font-medium text-zinc-900">{startup.views || 0}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Link
                    href={`/startup?startupId=${startup.id}`}
                    className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 border border-zinc-300 rounded-lg transition-colors text-sm font-medium"
                  >
                    View Public Page
                  </Link>
                  <StartupRevenueActions
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

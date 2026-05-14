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
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-[var(--muted)]">Loading startups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
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
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-12 text-center">
            <p className="text-[var(--muted)] mb-4">No startups yet</p>
            <Link
              href="/create-startup"
              className="text-[var(--accent)] hover:underline font-medium"
            >
              Create your first startup →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {startups.map((startup) => (
              <div key={startup.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-[var(--text)]">{startup.name}</h3>
                    <p className="mt-1 text-[var(--muted)]">{startup.tagline}</p>
                  </div>

                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      startup.status === 'active' ? 'bg-[var(--accent2)]/10 text-[var(--accent2)]' :
                      startup.status === 'draft' ? 'bg-[var(--accentTint)] text-[var(--accent)]' :
                      'bg-[var(--surface2)] text-[var(--muted)]'
                    }`}>
                      {startup.status}
                    </span>
                    {!startup.visible && (
                      <span className="px-3 py-1 rounded-full bg-[var(--surface2)] text-[var(--muted)] text-xs font-medium">
                        Hidden
                      </span>
                    )}
                    {startup.verifiedFinancials && (
                      <span className="px-3 py-1 rounded-full bg-[var(--accent2)]/10 text-[var(--accent2)] text-xs font-medium">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                </div>

                <p className="mb-6 text-[var(--muted)]">{startup.description}</p>

                <div className="mb-6 grid gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-sm text-[var(--muted)]">Industry</p>
                    <p className="font-medium text-[var(--text)]">{startup.industry}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--muted)]">Stage</p>
                    <p className="font-medium text-[var(--text)] capitalize">{startup.stage}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--muted)]">Location</p>
                    <p className="font-medium text-[var(--text)]">{startup.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--muted)]">Views</p>
                    <p className="font-medium text-[var(--text)]">{startup.views || 0}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Link
                    href={`/startup?startupId=${startup.id}`}
                    className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface2)]"
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

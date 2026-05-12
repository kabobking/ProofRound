'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getStartup, getOpportunitiesByStartup, getPacketsByStartup } from '@/lib/database';
import { Startup, InvestmentOpportunity, ProofroundPacket } from '@/lib/models';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import AnimatedCard from '@/components/AnimatedCard';
import AppHeader from '@/components/AppHeader';
import { analyticsEvents } from '@/lib/analytics';
import StartupRevenueActions from '@/components/StartupRevenueActions';

export default function StartupPage() {
  const searchParams = useSearchParams();
  const startupId = searchParams.get('startupId');
  const { userProfile } = useAuth();

  const [startup, setStartup] = useState<Startup | null>(null);
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [packets, setPackets] = useState<ProofroundPacket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!startupId) {
        setStartup(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [startupData, oppsData, packetsData] = await Promise.all([
          getStartup(startupId),
          getOpportunitiesByStartup(startupId),
          getPacketsByStartup(startupId),
        ]);

        setStartup(startupData);
        setOpportunities(oppsData);
        setPackets(packetsData);
        analyticsEvents.startup_detail_view(startupId);
      } catch (error) {
        console.error('Error loading startup:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [startupId, userProfile?.id]);

  if (!startupId) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_36%),linear-gradient(180deg,_#0f172a_0%,_#0f172a_380px,_#f8fafc_380px,_#f8fafc_100%)]">
        <AppHeader
          title="Startup details"
          subtitle="Open a startup from the marketplace or your startups list."
          quickLinks={[
            { label: 'Marketplace', href: '/marketplace' },
            { label: 'My Startups', href: '/startups' },
            { label: 'Dashboard', href: '/dashboard' },
          ]}
        />

        <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Select a startup</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This page uses the query parameter `startupId`, so it can be exported statically for GitHub Pages.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/marketplace" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                Browse marketplace
              </Link>
              <Link href="/startups" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                My startups
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
          <p className="mt-4 text-zinc-600">Loading startup...</p>
        </div>
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-600 mb-4">Startup not found</p>
          <Link href="/marketplace" className="text-indigo-600 hover:underline">
            Back to marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_36%),linear-gradient(180deg,_#0f172a_0%,_#0f172a_380px,_#f8fafc_380px,_#f8fafc_100%)]">
      <AppHeader
        title={startup.name}
        subtitle={startup.tagline}
        quickLinks={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My Startups', href: '/startups' },
          { label: 'Marketplace', href: '/marketplace' },
        ]}
      />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <AnimatedCard delay={0}>
              <section className="rounded-lg border border-zinc-200 bg-white p-8">
                <h2 className="mb-4 text-2xl font-bold text-zinc-900">About</h2>
                <p className="mb-6 text-zinc-600">{startup.description}</p>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-sm text-zinc-500">Industry</p>
                    <p className="text-lg font-medium text-zinc-900">{startup.industry}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm text-zinc-500">Founded</p>
                    <p className="text-lg font-medium text-zinc-900">{new Date(startup.founded).toLocaleDateString()}</p>
                  </div>
                  {startup.team_size && (
                    <div>
                      <p className="mb-1 text-sm text-zinc-500">Team Size</p>
                      <p className="text-lg font-medium text-zinc-900">{startup.team_size} people</p>
                    </div>
                  )}
                  {startup.website && (
                    <div>
                      <p className="mb-1 text-sm text-zinc-500">Website</p>
                      <a href={startup.website} target="_blank" rel="noopener noreferrer" className="text-lg font-medium text-indigo-600 hover:underline">
                        Visit
                      </a>
                    </div>
                  )}
                </div>
              </section>
            </AnimatedCard>

            {startup.financialMetrics && (
              <AnimatedCard delay={80}>
                <section className="rounded-lg border border-zinc-200 bg-white p-8">
                  <h2 className="mb-4 text-2xl font-bold text-zinc-900">Financial Metrics</h2>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {startup.financialMetrics.mrr && (
                      <div className="rounded-lg bg-indigo-50 p-4">
                        <p className="mb-1 text-sm text-indigo-700">Monthly Recurring Revenue</p>
                        <p className="text-2xl font-bold text-indigo-900">${(startup.financialMetrics.mrr / 1000).toFixed(1)}K</p>
                      </div>
                    )}
                    {startup.financialMetrics.arr && (
                      <div className="rounded-lg bg-indigo-50 p-4">
                        <p className="mb-1 text-sm text-indigo-700">Annual Recurring Revenue</p>
                        <p className="text-2xl font-bold text-indigo-900">${(startup.financialMetrics.arr / 1000000).toFixed(1)}M</p>
                      </div>
                    )}
                    {startup.financialMetrics.burn_rate && (
                      <div className="rounded-lg bg-zinc-50 p-4">
                        <p className="mb-1 text-sm text-zinc-700">Burn Rate</p>
                        <p className="text-2xl font-bold text-zinc-900">${(startup.financialMetrics.burn_rate / 1000).toFixed(1)}K/mo</p>
                      </div>
                    )}
                    {startup.financialMetrics.runway_months && (
                      <div className="rounded-lg bg-zinc-50 p-4">
                        <p className="mb-1 text-sm text-zinc-700">Runway</p>
                        <p className="text-2xl font-bold text-zinc-900">{startup.financialMetrics.runway_months} months</p>
                      </div>
                    )}
                  </div>
                </section>
              </AnimatedCard>
            )}

            {opportunities.length > 0 && (
              <AnimatedCard delay={160}>
                <section className="rounded-lg border border-zinc-200 bg-white p-8">
                  <h2 className="mb-4 text-2xl font-bold text-zinc-900">Investment Opportunities</h2>
                  <div className="space-y-4">
                    {opportunities.map((opp) => (
                      <div key={opp.id} className="block rounded-lg border border-zinc-200 bg-white p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-zinc-900">{opp.type}</h3>
                            <p className="mt-1 text-sm text-zinc-600">{opp.description}</p>
                          </div>
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium capitalize text-zinc-700">{opp.status}</span>
                        </div>
                        {opp.minimum_investment && (
                          <div className="mt-3 text-sm text-zinc-600">Min. investment: ${(opp.minimum_investment / 1000).toFixed(1)}K</div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </AnimatedCard>
            )}

            {packets.length > 0 && (
              <AnimatedCard delay={240}>
                <section className="rounded-lg border border-zinc-200 bg-white p-8">
                  <h2 className="mb-4 text-2xl font-bold text-zinc-900">Verified Financial Packets</h2>
                  <div className="space-y-4">
                    {packets.map((packet) => (
                      <div key={packet.id} className="rounded-lg border border-green-200 bg-green-50 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-zinc-900">
                              {packet.timeRangeStart} to {packet.timeRangeEnd}
                            </h3>
                            <p className="mt-1 text-sm text-zinc-600">Verified MRR: ${(packet.metrics.mrr / 1000).toFixed(1)}K</p>
                          </div>
                          <span className="text-sm font-medium text-indigo-600">Verified packet</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </AnimatedCard>
            )}
          </div>

          <div className="lg:col-span-1">
            {startup.seeking_amount && (
              <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-6">
                <h3 className="mb-3 font-semibold text-zinc-900">Fundraising</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-zinc-500">Seeking</p>
                    <p className="text-2xl font-bold text-zinc-900">${(startup.seeking_amount / 1000000).toFixed(1)}M</p>
                  </div>
                  {startup.valuation && (
                    <div>
                      <p className="text-sm text-zinc-500">Valuation</p>
                      <p className="text-lg font-bold text-zinc-900">${(startup.valuation / 1000000).toFixed(1)}M</p>
                    </div>
                  )}
                  {startup.equity_offered && (
                    <div>
                      <p className="text-sm text-zinc-500">Equity Offered</p>
                      <p className="text-lg font-bold text-zinc-900">{startup.equity_offered}%</p>
                    </div>
                  )}
                </div>
                <button className="mt-6 w-full rounded-lg bg-indigo-600 py-2 font-medium text-white transition-colors hover:bg-indigo-700">
                  Express Interest
                </button>
              </div>
            )}

            <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-6">
              <h3 className="mb-3 font-semibold text-zinc-900">Verified revenue packets</h3>
              <p className="mb-4 text-sm text-zinc-600">
                Request or generate the Stripe-backed PDF version of this startup&apos;s verified revenue data.
              </p>
              <StartupRevenueActions
                startupId={startup.id}
                startupName={startup.name}
                founderEmail={startup.founderEmail}
                stripeConnected={Boolean(startup.stripeAccountId)}
                variant={userProfile?.id === startup.founderId ? 'founder' : 'investor'}
              />
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <h3 className="mb-3 font-semibold text-zinc-900">Founder</h3>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-zinc-900">{startup.founderEmail}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
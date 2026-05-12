'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getStartup, getOpportunitiesByStartup, getPacketsByStartup } from '@/lib/database';
import { Startup, InvestmentOpportunity, ProofroundPacket } from '@/lib/models';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import AnimatedCard from '@/components/AnimatedCard';
import AppHeader from '@/components/AppHeader';
import { prefersReducedMotion, getMotionClasses } from '@/components/landing/motion';
import { analyticsEvents } from '@/lib/analytics';

export default function StartupDetailPage() {
  const params = useParams();
  const startupId = params.id as string;
  const { userProfile } = useAuth();

  const [startup, setStartup] = useState<Startup | null>(null);
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [packets, setPackets] = useState<ProofroundPacket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadData = async () => {
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

        if (startupData?.saved_by?.includes(userProfile?.id || '')) {
          setSaved(true);
        }
      } catch (error) {
        console.error('Error loading startup:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [startupId, userProfile?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <AnimatedCard delay={0}>
              <section className="bg-white rounded-lg p-8 border border-zinc-200">
                <h2 className="text-2xl font-bold text-zinc-900 mb-4">About</h2>
                <p className="text-zinc-600 mb-6">{startup.description}</p>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">Industry</p>
                    <p className="text-lg font-medium text-zinc-900">{startup.industry}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">Founded</p>
                    <p className="text-lg font-medium text-zinc-900">
                      {new Date(startup.founded).toLocaleDateString()}
                    </p>
                  </div>
                {startup.team_size && (
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">Team Size</p>
                    <p className="text-lg font-medium text-zinc-900">{startup.team_size} people</p>
                  </div>
                )}
                {startup.website && (
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">Website</p>
                    <a
                      href={startup.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-indigo-600 hover:underline"
                    >
                      Visit
                    </a>
                  </div>
                )}
              </div>
              </section>
            </AnimatedCard>

            {/* Financial Metrics */}
            {startup.financialMetrics && (
              <AnimatedCard delay={80}>
                <section className="bg-white rounded-lg p-8 border border-zinc-200">
                  <h2 className="text-2xl font-bold text-zinc-900 mb-4">Financial Metrics</h2>

                  <div className="grid gap-6 sm:grid-cols-2">
                    {startup.financialMetrics.mrr && (
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <p className="text-sm text-indigo-700 mb-1">Monthly Recurring Revenue</p>
                      <p className="text-2xl font-bold text-indigo-900">
                        ${(startup.financialMetrics.mrr / 1000).toFixed(1)}K
                      </p>
                    </div>
                  )}
                  {startup.financialMetrics.arr && (
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <p className="text-sm text-indigo-700 mb-1">Annual Recurring Revenue</p>
                      <p className="text-2xl font-bold text-indigo-900">
                        ${(startup.financialMetrics.arr / 1000000).toFixed(1)}M
                      </p>
                    </div>
                  )}
                  {startup.financialMetrics.burn_rate && (
                    <div className="p-4 bg-zinc-50 rounded-lg">
                      <p className="text-sm text-zinc-700 mb-1">Burn Rate</p>
                      <p className="text-2xl font-bold text-zinc-900">
                        ${(startup.financialMetrics.burn_rate / 1000).toFixed(1)}K/mo
                      </p>
                    </div>
                  )}
                  {startup.financialMetrics.runway_months && (
                    <div className="p-4 bg-zinc-50 rounded-lg">
                      <p className="text-sm text-zinc-700 mb-1">Runway</p>
                      <p className="text-2xl font-bold text-zinc-900">
                        {startup.financialMetrics.runway_months} months
                      </p>
                    </div>
                  )}
                </div>
                </section>
              </AnimatedCard>
            )}

            {/* Investment Opportunities */}
            {opportunities.length > 0 && (
              <AnimatedCard delay={160}>
                <section className="bg-white rounded-lg p-8 border border-zinc-200">
                  <h2 className="text-2xl font-bold text-zinc-900 mb-4">Investment Opportunities</h2>

                  <div className="space-y-4">
                    {opportunities.map((opp) => (
                      <div key={opp.id} className="block p-4 border border-zinc-200 rounded-lg bg-white">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-zinc-900">{opp.type}</h3>
                            <p className="text-sm text-zinc-600 mt-1">{opp.description}</p>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-medium capitalize">
                            {opp.status}
                          </span>
                        </div>

                        {opp.minimum_investment && (
                          <div className="mt-3 text-sm text-zinc-600">
                            Min. investment: ${(opp.minimum_investment / 1000).toFixed(1)}K
                          </div>
                        )}
                      </div>
                    ))}
                </div>
                </section>
              </AnimatedCard>
            )}

            {/* Verified Packets */}
            {packets.length > 0 && (
              <AnimatedCard delay={240}>
                <section className="bg-white rounded-lg p-8 border border-zinc-200">
                  <h2 className="text-2xl font-bold text-zinc-900 mb-4">Verified Financial Packets</h2>

                  <div className="space-y-4">
                    {packets.map((packet) => (
                      <div key={packet.id} className="p-4 border border-green-200 bg-green-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-zinc-900">
                              {packet.timeRangeStart} to {packet.timeRangeEnd}
                            </h3>
                            <p className="text-sm text-zinc-600 mt-1">Verified MRR: ${(packet.metrics.mrr / 1000).toFixed(1)}K</p>
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

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Seeking */}
            {startup.seeking_amount && (
              <div className="bg-white rounded-lg p-6 border border-zinc-200 mb-6">
                <h3 className="font-semibold text-zinc-900 mb-3">Fundraising</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-zinc-500">Seeking</p>
                    <p className="text-2xl font-bold text-zinc-900">
                      ${(startup.seeking_amount / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  {startup.valuation && (
                    <div>
                      <p className="text-sm text-zinc-500">Valuation</p>
                      <p className="text-lg font-bold text-zinc-900">
                        ${(startup.valuation / 1000000).toFixed(1)}M
                      </p>
                    </div>
                  )}
                  {startup.equity_offered && (
                    <div>
                      <p className="text-sm text-zinc-500">Equity Offered</p>
                      <p className="text-lg font-bold text-zinc-900">{startup.equity_offered}%</p>
                    </div>
                  )}
                </div>

                <button className="w-full mt-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                  Express Interest
                </button>
              </div>
            )}

            {/* Founder Info */}
            <div className="bg-white rounded-lg p-6 border border-zinc-200">
              <h3 className="font-semibold text-zinc-900 mb-3">Founder</h3>
              <div className="space-y-2 text-sm">
                <p className="text-zinc-900 font-medium">{startup.founderEmail}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

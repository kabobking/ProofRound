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
  const nextStep = searchParams.get('next');
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
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <AppHeader
          title="Startup details"
          subtitle="Open a startup from the marketplace or your startups list."
          quickLinks={[
            { label: 'Investor Discovery', href: '/marketplace' },
            { label: 'My Startups', href: '/startups' },
            { label: 'Dashboard', href: '/dashboard' },
          ]}
        />

        <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">Select a startup</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Open a startup from your list or the marketplace to review its investor-ready packet.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/marketplace" className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90">
                Browse marketplace
              </Link>
              <Link href="/startups" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface2)]">
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text)]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
          <p className="mt-4 text-[var(--muted)]">Loading startup...</p>
        </div>
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text)]">
        <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
          <p className="text-[var(--muted)] mb-4">Startup not found</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/marketplace" className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90">
              Back to marketplace
            </Link>
            <Link href="/startups" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface2)]">
              My startups
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <AppHeader
        title={startup.name}
        subtitle={startup.tagline}
        quickLinks={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My Startups', href: '/startups' },
          { label: 'Investor Discovery', href: '/marketplace' },
        ]}
      />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {nextStep === 'connect-stripe' && (
          <div className="mb-8 rounded-[1.5rem] border border-[var(--accent)]/20 bg-[linear-gradient(180deg,rgba(79,70,229,0.12),rgba(15,23,42,0.92))] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Next step</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">Connect Stripe to generate your first packet.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">Your startup profile is saved. The next step is to connect Stripe with read-only access so Proofround can generate your verification packet.</p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <AnimatedCard delay={0}>
              <section className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
                <h2 className="mb-4 text-2xl font-semibold tracking-tight text-[var(--text)]">About</h2>
                <p className="mb-6 text-[var(--muted)]">{startup.description}</p>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-sm text-[var(--muted)]">Industry</p>
                    <p className="text-lg font-medium text-[var(--text)]">{startup.industry}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm text-[var(--muted)]">Founded</p>
                    <p className="text-lg font-medium text-[var(--text)]">{new Date(startup.founded).toLocaleDateString()}</p>
                  </div>
                  {startup.team_size && (
                    <div>
                      <p className="mb-1 text-sm text-[var(--muted)]">Team Size</p>
                      <p className="text-lg font-medium text-[var(--text)]">{startup.team_size} people</p>
                    </div>
                  )}
                  {startup.website && (
                    <div>
                      <p className="mb-1 text-sm text-[var(--muted)]">Website</p>
                      <a href={startup.website} target="_blank" rel="noopener noreferrer" className="text-lg font-medium text-[var(--accent)] hover:underline">
                        Visit
                      </a>
                    </div>
                  )}
                </div>
              </section>
            </AnimatedCard>

            {startup.financialMetrics && (
              <AnimatedCard delay={80}>
                <section className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
                  <h2 className="mb-4 text-2xl font-semibold tracking-tight text-[var(--text)]">Financial Metrics</h2>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {startup.financialMetrics.mrr && (
                      <div className="rounded-lg bg-[var(--accentTint)] p-4">
                        <p className="mb-1 text-sm text-[var(--accent)]">Monthly Recurring Revenue</p>
                        <p className="text-2xl font-bold text-[var(--text)]">${(startup.financialMetrics.mrr / 1000).toFixed(1)}K</p>
                      </div>
                    )}
                    {startup.financialMetrics.arr && (
                      <div className="rounded-lg bg-[var(--accentTint)] p-4">
                        <p className="mb-1 text-sm text-[var(--accent)]">Annual Recurring Revenue</p>
                        <p className="text-2xl font-bold text-[var(--text)]">${(startup.financialMetrics.arr / 1000000).toFixed(1)}M</p>
                      </div>
                    )}
                    {startup.financialMetrics.burn_rate && (
                      <div className="rounded-lg bg-[var(--surface2)] p-4">
                        <p className="mb-1 text-sm text-[var(--muted)]">Burn Rate</p>
                        <p className="text-2xl font-bold text-[var(--text)]">${(startup.financialMetrics.burn_rate / 1000).toFixed(1)}K/mo</p>
                      </div>
                    )}
                    {startup.financialMetrics.runway_months && (
                      <div className="rounded-lg bg-[var(--surface2)] p-4">
                        <p className="mb-1 text-sm text-[var(--muted)]">Runway</p>
                        <p className="text-2xl font-bold text-[var(--text)]">{startup.financialMetrics.runway_months} months</p>
                      </div>
                    )}
                  </div>
                </section>
              </AnimatedCard>
            )}

            {opportunities.length > 0 && (
              <AnimatedCard delay={160}>
                <section className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
                  <h2 className="mb-4 text-2xl font-semibold tracking-tight text-[var(--text)]">Investment Opportunities</h2>
                  <div className="space-y-4">
                    {opportunities.map((opp) => (
                      <div key={opp.id} className="block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-[var(--text)]">{opp.type}</h3>
                            <p className="mt-1 text-sm text-[var(--muted)]">{opp.description}</p>
                          </div>
                          <span className="rounded-full bg-[var(--surface2)] px-3 py-1 text-xs font-medium capitalize text-[var(--muted)]">{opp.status}</span>
                        </div>
                        {opp.minimum_investment && (
                          <div className="mt-3 text-sm text-[var(--muted)]">Min. investment: ${(opp.minimum_investment / 1000).toFixed(1)}K</div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </AnimatedCard>
            )}

            {packets.length > 0 && (
              <AnimatedCard delay={240}>
                <section className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
                  <h2 className="mb-4 text-2xl font-semibold tracking-tight text-[var(--text)]">Verified Financial Packets</h2>
                  <div className="space-y-4">
                    {packets.map((packet) => (
                      <div key={packet.id} className="rounded-lg border border-[var(--accent2)]/30 bg-[var(--accent2)]/10 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-[var(--text)]">
                              {packet.timeRangeStart} to {packet.timeRangeEnd}
                            </h3>
                            <p className="mt-1 text-sm text-[var(--muted)]">Verified MRR: ${(packet.metrics.mrr / 1000).toFixed(1)}K</p>
                          </div>
                          <span className="text-sm font-medium text-[var(--accent)]">Verified packet</span>
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
              <div className="mb-6 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
                <h3 className="mb-3 font-semibold text-[var(--text)]">Fundraising</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-[var(--muted)]">Seeking</p>
                    <p className="text-2xl font-bold text-[var(--text)]">${(startup.seeking_amount / 1000000).toFixed(1)}M</p>
                  </div>
                  {startup.valuation && (
                    <div>
                      <p className="text-sm text-[var(--muted)]">Valuation</p>
                      <p className="text-lg font-bold text-[var(--text)]">${(startup.valuation / 1000000).toFixed(1)}M</p>
                    </div>
                  )}
                  {startup.equity_offered && (
                    <div>
                      <p className="text-sm text-[var(--muted)]">Equity Offered</p>
                      <p className="text-lg font-bold text-[var(--text)]">{startup.equity_offered}%</p>
                    </div>
                  )}
                </div>
                <button className="mt-6 w-full rounded-lg bg-[var(--accent)] py-2 font-medium text-[var(--accent-foreground)] transition-colors hover:opacity-90">
                  Express Interest
                </button>
              </div>
            )}

            <div className="mb-6 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
              <h3 className="mb-3 font-semibold text-[var(--text)]">Verified revenue packets</h3>
              <p className="mb-4 text-sm text-[var(--muted)]">
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

            <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
              <h3 className="mb-3 font-semibold text-[var(--text)]">Founder</h3>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-[var(--text)]">{startup.founderEmail}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
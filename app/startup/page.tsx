'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getStartup, getOpportunitiesByStartup } from '@/lib/database';
import { Startup, InvestmentOpportunity } from '@/lib/models';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import AnimatedCard from '@/components/AnimatedCard';
import AppHeader from '@/components/AppHeader';
import { analyticsEvents } from '@/lib/analytics';
import StartupRevenueActions from '@/components/StartupRevenueActions';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

function StartupDetails() {
  const searchParams = useSearchParams();
  const startupId = searchParams.get('startupId');
  const nextStep = searchParams.get('next');
  const { userProfile } = useAuth();

  const [startup, setStartup] = useState<Startup | null>(null);
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
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
        const [startupData, oppsData] = await Promise.all([
          getStartup(startupId),
          getOpportunitiesByStartup(startupId),
        ]);

        setStartup(startupData);
        setOpportunities(oppsData);
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
              <Link href="/marketplace">
                <Button variant="default">Browse marketplace</Button>
              </Link>
              <Link href="/startups">
                <Button variant="secondary">My startups</Button>
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
          <Spinner size="lg" />
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
            <Link href="/marketplace">
              <Button variant="default">Back to marketplace</Button>
            </Link>
            <Link href="/startups">
              <Button variant="secondary">My startups</Button>
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
          <div className="mb-8 rounded-[1.5rem] border border-[var(--accent)]/20 bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Next step</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">Connect Stripe to generate your first packet.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">Your startup profile is saved. The next step is to connect Stripe with read-only access so ProofRound can generate your verification packet.</p>
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
                          <Badge variant="secondary" className="capitalize">{opp.status}</Badge>
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

            <AnimatedCard delay={240}>
              <section className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">Traction & Diligence Indicators</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Real-time diligence posture and operational performance signals
                    </p>
                  </div>
                  <Badge variant={startup.stripeAccountId ? 'indigo' : 'secondary'}>
                    {startup.stripeAccountId ? 'Stripe Connected' : 'Manual Entry'}
                  </Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface2)]/50 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--muted)]">Source Verification</span>
                      {startup.stripeAccountId ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" /> Live Telemetry
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
                          <AlertCircle className="h-4 w-4" /> Awaiting Stripe
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-lg font-semibold text-[var(--text)]">
                      {startup.stripeAccountId ? 'Direct Stripe API Sync' : 'Self-Reported Profile'}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {startup.stripeAccountId
                        ? 'All diligence queries directly poll Stripe billing ledgers with zero intermediate storage.'
                        : 'Connect Stripe to enable instant cryptographic verification of revenue and churn.'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface2)]/50 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--muted)]">Capital Runway</span>
                      {startup.financialMetrics?.runway_months ? (
                        <Badge variant={startup.financialMetrics.runway_months >= 12 ? 'success' : 'warning'}>
                          {startup.financialMetrics.runway_months >= 12 ? 'Sustainable' : 'Needs Capital'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">N/A</Badge>
                      )}
                    </div>
                    <p className="mt-3 text-lg font-semibold text-[var(--text)]">
                      {startup.financialMetrics?.runway_months
                        ? `${startup.financialMetrics.runway_months} Months Operating Runway`
                        : 'Runway Not Disclosed'}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {startup.financialMetrics?.burn_rate
                        ? `Net monthly cash burn: $${(startup.financialMetrics.burn_rate / 1000).toFixed(1)}K/mo`
                        : 'Tracked against verified cash balance and burn velocity.'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface2)]/50 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--muted)]">Funding Stage</span>
                      <Badge variant="indigo" className="uppercase text-[10px] tracking-wider">
                        {startup.stage || 'Seed'}
                      </Badge>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-[var(--text)]">
                      {startup.seeking_amount
                        ? `Seeking $${(startup.seeking_amount / 1000000).toFixed(1)}M Round`
                        : 'Stage: ' + (startup.stage ? startup.stage.toUpperCase() : 'Active')}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {startup.valuation
                        ? `Pre-money valuation anchor: $${(startup.valuation / 1000000).toFixed(1)}M`
                        : 'Open to discussions with verified institutional investors.'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface2)]/50 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--muted)]">Audit Readiness</span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
                        <ShieldCheck className="h-4 w-4" /> Diligence Grade
                      </span>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-[var(--text)]">
                      Dynamic PDF Packet Ready
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Investors can download a 3-page verifiable financial packet with vector breakdown and customer quality metrics.
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-[var(--accent)]/20 bg-[var(--accentTint)]/60 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">Investor Assurance Guarantee</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        ProofRound diligence packets generate real-time metrics pulled directly from the payment processor. No historical snapshot tampering is possible, and customer PII is never exposed or saved to any secondary database.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </AnimatedCard>
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
                <Button className="mt-6 w-full">
                  Express Interest
                </Button>
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

export default function StartupRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text)]">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-[var(--muted)]">Loading startup...</p>
          </div>
        </div>
      }
    >
      <StartupDetails />
    </Suspense>
  );
}

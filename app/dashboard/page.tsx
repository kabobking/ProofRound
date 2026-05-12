'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AnimatedCard from '@/components/AnimatedCard';
import { useAuth } from '@/lib/auth-context';
import { signOutUser } from '@/lib/auth';
import { analyticsEvents } from '@/lib/analytics';
import {
  getActiveOpportunities,
  getInvestorInterests,
  getOpportunitiesByStartup,
  getPacketsByStartup,
  getPublicStartups,
  getStartupsByFounder,
} from '@/lib/database';
import { InvestmentInterest, InvestmentOpportunity, ProofroundPacket, Startup } from '@/lib/models';

type DashboardDataset = {
  startups: Startup[];
  opportunities: InvestmentOpportunity[];
  packets: ProofroundPacket[];
  investorInterests: InvestmentInterest[];
  publicStartups: Startup[];
};

type ActivityRow = {
  id: string;
  label: string;
  kind: string;
  status: string;
  detail: string;
  updatedAt: string;
  amount: string;
};

function formatCurrency(value?: number): string {
  if (!value) return '$0';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toLocaleString('en-US')}`;
}

function formatDate(value?: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function titleCase(value: string): string {
  return value.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function Badge({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode;
  tone?: 'slate' | 'indigo' | 'emerald' | 'amber';
}) {
  const classes = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-800 ring-amber-100',
  }[tone];

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${classes}`}>{children}</span>;
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-300">{detail}</p>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatedCard className="rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      <div className="px-6 py-6 sm:px-7">{children}</div>
    </AnimatedCard>
  );
}

function ActivityTable({ rows }: { rows: ActivityRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Item</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Detail</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-sm text-slate-500" colSpan={4}>
                No recent activity to display.
              </td>
            </tr>
          ) : (
            rows.map(row => (
              <tr key={row.id} className="transition hover:bg-slate-50/80">
                <td className="px-4 py-4">
                  <div className="font-medium text-slate-900">{row.label}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{row.kind}</div>
                </td>
                <td className="px-4 py-4"><Badge tone={row.status === 'Verified' ? 'emerald' : row.status === 'Pending' ? 'amber' : 'indigo'}>{row.status}</Badge></td>
                <td className="px-4 py-4 text-sm text-slate-600">{row.detail}</td>
                <td className="px-4 py-4 text-right text-sm text-slate-500">{formatDate(row.updatedAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const { userProfile } = useAuth();
  const isInvestor = userProfile?.role === 'investor';
  const isAdmin = userProfile?.role === 'admin';
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState<DashboardDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (userProfile) analyticsEvents.dashboard_view(userProfile.role);
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        if (userProfile.role === 'investor') {
          // Run each call separately to identify permission failures
          let publicStartupsResponse = null;
          let opportunities: any[] = [];
          let investorInterests: any[] = [];

          try {
            publicStartupsResponse = await getPublicStartups(12);
          } catch (e) {
            console.error('Failed to fetch public startups:', e);
            throw new Error('publicStartups');
          }

          try {
            opportunities = await getActiveOpportunities();
          } catch (e) {
            console.error('Failed to fetch active opportunities:', e);
            throw new Error('opportunities');
          }

          try {
            investorInterests = await getInvestorInterests(userProfile.id);
          } catch (e) {
            console.error('Failed to fetch investor interests:', e);
            throw new Error('investorInterests');
          }

          if (cancelled) return;

          setDataset({
            startups: [],
            opportunities,
            packets: [],
            investorInterests,
            publicStartups: publicStartupsResponse.startups,
          });
          return;
        }

        // For founders, fetch startups then dependent data with per-call logging
        let startups = [] as any[];
        try {
          startups = await getStartupsByFounder(userProfile.id);
        } catch (e) {
          console.error('Failed to fetch startups by founder:', e);
          throw new Error('startups');
        }

        let opportunities: any[] = [];
        try {
          opportunities = (await Promise.all(startups.map(startup => getOpportunitiesByStartup(startup.id)))).flat();
        } catch (e) {
          console.error('Failed to fetch opportunities for startups:', e);
          throw new Error('opportunities');
        }

        let packets: any[] = [];
        try {
          packets = (await Promise.all(startups.map(startup => getPacketsByStartup(startup.id)))).flat();
        } catch (e) {
          console.error('Failed to fetch packets for startups:', e);
          throw new Error('packets');
        }

        if (cancelled) return;

        setDataset({
          startups,
          opportunities,
          packets,
          investorInterests: [],
          publicStartups: startups.filter(startup => startup.visible),
        });
      } catch (loadError) {
        console.error('Error loading dashboard (tagged):', loadError);
        if (!cancelled) {
          if (loadError instanceof Error && loadError.message) {
            setError(`Dashboard load failed at: ${loadError.message}`);
          } else {
            setError('We could not load your dashboard data right now.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userProfile]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      analyticsEvents.logout();
      await signOutUser();
      router.push('/');
    } catch (logoutError) {
      console.error('Logout failed:', logoutError);
    } finally {
      setLoggingOut(false);
    }
  };

  const summary = useMemo(() => {
    if (!userProfile || !dataset) return null;

    const isInvestor = userProfile.role === 'investor';
    const isAdmin = userProfile.role === 'admin';

    if (isInvestor) {
      const verifiedCount = dataset.publicStartups.filter(startup => startup.verifiedFinancials).length;
      return {
        title: 'Investment intelligence workspace',
        subtitle: 'A clean view of live opportunities, verified companies, and tracked interests.',
        stats: [
          { label: 'Live opportunities', value: String(dataset.opportunities.length), detail: 'Actively raising rounds' },
          { label: 'Verified startups', value: String(verifiedCount), detail: 'Public companies with checked financials' },
          { label: 'Tracked interests', value: String(dataset.investorInterests.length), detail: 'Opportunities you have engaged' },
          { label: 'Latest market scan', value: String(dataset.publicStartups.length), detail: 'Recent startups surfaced for review' },
        ],
      };
    }

    const totalViews = dataset.startups.reduce((sum, startup) => sum + (startup.views || 0), 0);
    const liveStartups = dataset.startups.filter(startup => startup.visible && startup.status !== 'draft').length;
    const totalSeeking = dataset.startups.reduce((sum, startup) => sum + (startup.seeking_amount || 0), 0);

    return {
      title: isAdmin ? 'Operations console' : 'Fundraising command center',
      subtitle: isAdmin
        ? 'Monitor verification, platform activity, and public startup health from one polished workspace.'
        : 'Track company readiness, packets, and live fundraising activity without losing sight of the details.',
      stats: [
        { label: 'Total startups', value: String(dataset.startups.length), detail: 'Owned by this account' },
        { label: 'Live listings', value: String(liveStartups), detail: 'Visible and beyond draft' },
        { label: 'Verified packets', value: String(dataset.packets.length), detail: 'Stripe-backed snapshots' },
        { label: 'Total views', value: String(totalViews), detail: `${formatCurrency(totalSeeking)} currently being raised` },
      ],
    };
  }, [dataset, userProfile]);

  const activityRows = useMemo<ActivityRow[]>(() => {
    if (!dataset || !userProfile) return [];

    if (userProfile.role === 'investor') {
      return dataset.opportunities
        .slice()
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 6)
        .map(opportunity => ({
          id: opportunity.id,
          label: `${titleCase(opportunity.type)} round`,
          kind: 'Opportunity',
          status: titleCase(opportunity.status),
          detail: opportunity.description,
          updatedAt: opportunity.updatedAt,
          amount: `${opportunity.interested_count || 0} interested`,
        }));
    }

    const startupRows = dataset.startups.map(startup => ({
      id: `startup-${startup.id}`,
      label: startup.name,
      kind: 'Startup',
      status: titleCase(startup.status),
      detail: startup.tagline,
      updatedAt: startup.updatedAt,
      amount: formatCurrency(startup.seeking_amount),
    }));

    const packetRows = dataset.packets.map(packet => ({
      id: `packet-${packet.id}`,
      label: `Packet ${packet.id.slice(0, 6)}`,
      kind: 'Packet',
      status: packet.verified ? 'Verified' : 'Pending',
      detail: `${formatDate(packet.timeRangeStart)} to ${formatDate(packet.timeRangeEnd)}`,
      updatedAt: packet.updatedAt,
      amount: formatCurrency(packet.metrics.mrr),
    }));

    return [...startupRows, ...packetRows].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 6);
  }, [dataset, userProfile]);

  const stageCounts = useMemo(() => {
    if (!dataset || !userProfile) return [];
    const source = userProfile.role === 'investor' ? dataset.publicStartups : dataset.startups.filter(startup => startup.visible || startup.status !== 'archived');
    const counts = source.reduce<Record<string, number>>((accumulator, startup) => {
      accumulator[startup.stage] = (accumulator[startup.stage] || 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts)
      .map(([label, value]) => ({ label: titleCase(label), value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 4);
  }, [dataset, userProfile]);

  if (!userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-white/70" />
          <p className="mt-4 text-sm text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (loading || !summary || !dataset) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_36%),linear-gradient(180deg,_#0f172a_0%,_#0f172a_380px,_#f8fafc_380px,_#f8fafc_100%)] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-72 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
        </div>
      </div>
    );
  }

  const visibleStartups = isInvestor ? dataset.publicStartups : dataset.startups.filter(startup => startup.visible || startup.status !== 'archived');
  const primaryStartups = isInvestor ? dataset.publicStartups : dataset.startups;

  const quickLinks = isInvestor
    ? [
        { label: 'Marketplace', href: '/marketplace' },
        { label: 'Dashboard', href: '/dashboard' },
      ]
    : [
        { label: 'Startups', href: '/startups' },
        { label: 'Create startup', href: '/create-startup' },
        { label: 'Marketplace', href: '/marketplace' },
      ];

  const maxStageCount = Math.max(...stageCounts.map(item => item.value), 1);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_36%),linear-gradient(180deg,_#0f172a_0%,_#0f172a_380px,_#f8fafc_380px,_#f8fafc_100%)]">
      <header className="border-b border-white/10 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-300">ProofRound workspace</div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{summary.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{summary.subtitle}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {quickLinks.map(link => (
                <Link key={link.href} href={link.href} className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10">
                  {link.label}
                </Link>
              ))}
              <button onClick={handleLogout} disabled={loggingOut} className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">
                {loggingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summary.stats.map(stat => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} detail={stat.detail} />
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">{error}</div>}

        <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
          <Panel title="Workspace shortcuts" description="Your fastest path to the rest of the product.">
            <div className="space-y-3">
              {quickLinks.map(link => (
                <Link key={link.href} href={link.href} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-indigo-200 hover:bg-indigo-50/50">
                  <span className="font-medium text-slate-900">{link.label}</span>
                  <span className="text-xs text-slate-500">Open</span>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Account" description="Your role, status, and access at a glance.">
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-semibold tracking-tight text-slate-900">{userProfile.displayName}</p>
                <p className="mt-1 text-sm text-slate-500">{userProfile.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="indigo">{titleCase(userProfile.role)}</Badge>
                <Badge tone={userProfile.emailVerified ? 'emerald' : 'amber'}>{userProfile.emailVerified ? 'Email verified' : 'Email unverified'}</Badge>
                {userProfile.isAdmin && <Badge tone="slate">Admin access</Badge>}
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Joined</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{formatDate(userProfile.createdAt)}</p>
              </div>
            </div>
          </Panel>
        </div>

        <div className="grid gap-8 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <Panel title="Focus" description="The next few things worth your attention.">
              <div className="space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-4">
                  {isInvestor ? 'Review live opportunities and compare verified financials before you invest.' : isAdmin ? 'Triage startup verification and keep the public marketplace clean.' : 'Keep packets fresh, move startup drafts toward verification, and monitor fundraising health.'}
                </div>
                <div className="rounded-2xl border border-dashed border-slate-200 p-4">
                  <p className="font-medium text-slate-900">Updated {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                  <p className="mt-1 text-slate-500">All views below are based on the latest account data.</p>
                </div>
              </div>
            </Panel>

            <Panel title={isInvestor ? 'Market stage mix' : 'Startup stage mix'} description="A quick read on where the portfolio sits.">
              <div className="space-y-4">
                {stageCounts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No stage data yet.</div>
                ) : (
                  stageCounts.map(item => (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>{item.label}</span>
                        <span>{item.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-slate-900" style={{ width: `${Math.max((item.value / maxStageCount) * 100, 8)}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </aside>

          <section className="space-y-8">
            <Panel title={isInvestor ? 'Live opportunity feed' : 'Portfolio overview'} description={isInvestor ? 'The most active rounds currently available.' : 'Your startups, their status, and the latest movement.'}>
              <div className="space-y-4">
                {primaryStartups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                    {isInvestor ? 'No public startups were loaded yet.' : 'You have not added a startup yet.'}
                  </div>
                ) : (
                  primaryStartups.slice(0, 4).map(startup => (
                    <div key={startup.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-slate-50">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900">{startup.name}</h3>
                            <Badge tone={startup.verifiedFinancials ? 'emerald' : 'amber'}>{startup.verifiedFinancials ? 'Verified' : 'Needs review'}</Badge>
                            <Badge tone={startup.visible ? 'indigo' : 'slate'}>{startup.visible ? 'Visible' : 'Hidden'}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{startup.tagline}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{titleCase(startup.stage)} · {startup.industry} · {startup.location}</p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-slate-500">Seeking</p>
                          <p className="text-lg font-semibold text-slate-900">{formatCurrency(startup.seeking_amount)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={`/startup/${startup.id}`} className="inline-flex items-center rounded-full bg-slate-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">View page</Link>
                        <Link href="/marketplace" className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Marketplace</Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>

            <Panel title={isAdmin ? 'Verification queue' : 'Recent activity'} description={isAdmin ? 'Items that need an operator pass before they stay public.' : 'Recent changes and items worth reviewing next.'}>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_320px]">
                <ActivityTable rows={activityRows} />

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Inspector</p>
                    <p className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{isInvestor ? 'Market watch' : isAdmin ? 'Verification watch' : 'Founder watch'}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {isInvestor ? 'Keep an eye on live rounds and move quickly when a company looks ready.' : isAdmin ? 'Review verification status, packet freshness, and public visibility before listings stay live.' : 'Watch startup readiness and packet coverage before opening a round.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Signals</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">Current account posture</p>
                      </div>
                      <Badge tone="slate">{activityRows.length} rows</Badge>
                    </div>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-4"><span>Verified financials</span><span className="font-medium text-slate-900">{visibleStartups.filter(startup => startup.verifiedFinancials).length}</span></div>
                      <div className="flex items-center justify-between gap-4"><span>Open opportunities</span><span className="font-medium text-slate-900">{dataset.opportunities.filter(opportunity => opportunity.status === 'active').length}</span></div>
                      <div className="flex items-center justify-between gap-4"><span>Visible startups</span><span className="font-medium text-slate-900">{visibleStartups.filter(startup => startup.visible).length}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          </section>
        </div>
      </main>
    </div>
  );
}

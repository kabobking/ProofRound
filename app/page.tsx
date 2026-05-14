'use client';

import Link from 'next/link';
import Navigation from '@/components/landing/Navigation';
import FAQ from '@/components/landing/FAQ';
import Hero from '@/components/landing/Hero';
import Section from '@/components/landing/Section';
import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion, getMotionClasses } from '@/components/landing/motion';

function AnimatedCard({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const reduced = prefersReducedMotion();
  const motion = getMotionClasses(reduced);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '-50px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${motion.base} ${isInView ? motion.inView : ''} ${motion.transition} ${className}`}
      style={{ transitionDelay: isInView ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Navigation />
      <Hero />

      {/* Problem and Solution */}
      <Section background="tinted" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-6 lg:grid-cols-2">
              <AnimatedCard delay={0}>
                <div className="rounded-xl border-t-2 border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <h2 className="text-2xl font-medium tracking-tight text-[var(--text)]">Problem</h2>
                  <ul className="mt-6 space-y-3.5 text-[var(--muted)] leading-relaxed">
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" />
                      <span>Investors receive screenshots that cannot be validated</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" />
                      <span>MRR, churn, and refunds are defined differently in every deck</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" />
                      <span>Diligence turns into email threads asking &quot;how did you calculate this?&quot;</span>
                    </li>
                  </ul>
                </div>
              </AnimatedCard>

              <AnimatedCard delay={80}>
                <div className="rounded-xl border-t-3 border-[var(--accent)] bg-[var(--surface)] p-8 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <h2 className="text-2xl font-medium tracking-tight text-[var(--text)]">Solution</h2>
                  <ul className="mt-6 space-y-3.5 text-[var(--muted)] leading-relaxed">
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" />
                      <span>Metrics computed directly from Stripe source data</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" />
                      <span>Time-stamped snapshots shared via a single investor link</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" />
                      <span>Transparent definitions + anomaly indicators reduce follow-ups</span>
                    </li>
                  </ul>
                </div>
              </AnimatedCard>
            </div>
          </div>
        </div>
      </Section>

      {/* How It Works */}
      <Section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-medium tracking-tight text-[var(--text)]">How It Works</h2>
          </div>

          <div className="mx-auto mt-16 max-w-4xl">
            <div className="relative space-y-8">
              <div className="absolute left-5 top-12 bottom-12 hidden lg:block w-px bg-[var(--border)]"></div>
              {[
                {
                  num: 1,
                  title: 'Connect Stripe (read-only access)',
                  desc: 'Authorize Proofround to access your Stripe account with read-only permissions. We cannot initiate charges, issue refunds, or modify any settings.',
                },
                {
                  num: 2,
                  title: 'Generate a packet for a defined time range',
                  desc: 'Select a time range and generate your verification packet. The system processes your Stripe data, calculates metrics with clear definitions, and creates a time-stamped snapshot.',
                },
                {
                  num: 3,
                  title: 'Share a controlled investor link (revocable, expirable)',
                  desc: 'Share a single link with investors. They can view the verification packet in a read-only interface—no account required. Links are revocable and can be set to expire.',
                },
              ].map((step, idx) => (
                <AnimatedCard key={step.num} delay={idx * 100}>
                  <div className="relative flex gap-6 group">
                    <div className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-medium text-[var(--accent-foreground)] group-hover:scale-110 transition-transform">
                      {step.num}
                    </div>
                    <div className="flex-1 rounded-lg bg-[var(--surface)]/60 p-4 -ml-2">
                      <h3 className="text-xl font-semibold text-[var(--text)]">{step.title}</h3>
                      <p className="mt-2.5 text-[var(--muted)] leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* What the Packet Includes */}
      <Section id="packet-contents" background="tinted" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-medium tracking-tight text-[var(--text)]">What the packet includes</h2>
            <p className="mt-5 text-lg leading-7 text-[var(--muted)]">
              A time-stamped, Stripe-verified snapshot designed to replace screenshots and reduce diligence follow-ups.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid gap-6 lg:grid-cols-2">
              <AnimatedCard delay={0}>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="mb-5">
                    <span className="inline-flex items-center rounded-full bg-[var(--surface2)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">For founders</span>
                  </div>
                  <ul className="space-y-3.5 text-sm text-[var(--muted)] leading-relaxed">
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" />
                      <span>Clear metric definitions displayed alongside each number to prevent interpretation disputes</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" />
                      <span>Time-stamped snapshots so investors know exactly when metrics were captured</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" />
                      <span>Link controls to revoke access or set expiration during active fundraising</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" />
                      <span>Audit trail showing when packets were generated and viewed</span>
                    </li>
                  </ul>
                </div>
              </AnimatedCard>

              <AnimatedCard delay={80}>
                <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--surface)] p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="mb-5">
                    <span className="inline-flex items-center rounded-full bg-[var(--accentTint)] border border-[var(--accentTint)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">For investors</span>
                  </div>
                  <ul className="space-y-3.5 text-sm text-[var(--muted)] leading-relaxed">
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" />
                      <span>Read-only view with no account required</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" />
                      <span>Source-linked metrics traceable to Stripe transactions</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" />
                      <span>Metrics are computed automatically and cannot be manually edited</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" />
                      <span>Consistent definitions across all metrics</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" />
                      <span>Drilldown capabilities for detailed analysis</span>
                    </li>
                  </ul>
                </div>
              </AnimatedCard>
            </div>

            <AnimatedCard delay={160}>
              <div className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
                <h3 className="text-lg font-medium text-[var(--text)] mb-4">Metrics included</h3>
                <p className="text-sm text-[var(--muted)] mb-7">
                  All metrics are calculated using standardized definitions and displayed consistently across companies.
                </p>
                <div className="grid gap-6 sm:grid-cols-2">
                  {[
                    { title: 'MRR / ARR', desc: 'Monthly and annual recurring revenue with displayed calculation method', highlight: true },
                    { title: 'Gross vs. net revenue', desc: 'Breakdown of gross revenue, refunds, and net revenue', highlight: true },
                    { title: 'Refunds and chargebacks', desc: 'Total refunds and chargebacks with percentage of revenue', highlight: false },
                    { title: 'Revenue churn and logo churn', desc: 'Revenue churn (lost MRR) and logo churn (lost customers) with definitions', highlight: false },
                    { title: 'Customer concentration', desc: 'Top customers by revenue and concentration risk indicators', highlight: false },
                    { title: 'Payout reconciliation', desc: 'Indicators for payout timing and reconciliation status', highlight: false },
                  ].map((metric, idx) => (
                    <div key={idx} className={`pb-5 border-b border-[var(--border)] last:border-b-0 last:pb-0 ${metric.highlight ? 'bg-[var(--accentTint)]/30 -mx-2 px-2 py-3 rounded-md' : ''}`}>
                      <h4 className="text-sm font-medium text-[var(--text)]">{metric.title}</h4>
                      <p className="mt-1.5 text-xs text-[var(--muted)] leading-relaxed">{metric.desc}</p>
                    </div>
                  ))}
                  <div className="sm:col-span-2 pt-4 mt-2 rounded-lg bg-[var(--accentTint)]/50 border border-[var(--accentTint)] p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] mt-1.5 flex-shrink-0"></div>
                      <div>
                        <h4 className="text-sm font-medium text-[var(--text)]">Anomaly flags</h4>
                        <p className="mt-1.5 text-xs text-[var(--muted)] leading-relaxed">
                          Automated indicators highlight unusual patterns (e.g., refund spikes or sudden revenue changes) to add transparency. These are signals, not conclusions.
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-[var(--muted)] leading-relaxed">
                      Indicators only; not a guarantee of accuracy or fraud prevention.
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          </div>
        </div>
      </Section>

      {/* Security and Data Handling */}
      <Section id="security" background="tinted" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-medium tracking-tight text-[var(--text)] mb-12">Security and Data Handling</h2>

            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              <AnimatedCard delay={0}>
                <div className="space-y-7">
                  <div>
                    <h3 className="text-lg font-medium text-[var(--text)]">Read-only Stripe access</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">
                      Proofround requests read-only access to your Stripe account. We cannot initiate charges, issue refunds, modify subscriptions, or change any account settings. The connection uses OAuth with least-privilege scopes.
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                      Proofround cannot modify, backfill, or suppress historical Stripe data.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-[var(--text)]">Time-stamped packet snapshots</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">
                      Each verification packet is a time-stamped snapshot generated at a specific point in time. This ensures consistency and allows you to track what was shared with investors at different stages of fundraising.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-[var(--text)]">Data minimization</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">
                      We process your Stripe data to generate aggregated metrics and snapshots. Raw transaction data is processed but not permanently stored in its original form. We retain only the data necessary to serve verification packets and maintain audit trails.
                    </p>
                  </div>
                </div>
              </AnimatedCard>

              <AnimatedCard delay={80}>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-medium text-[var(--text)] mb-5">Controls</h3>
                  <ul className="space-y-3.5 text-sm text-[var(--muted)]">
                    {[
                      { label: 'Read-only', desc: 'No write permissions requested or granted' },
                      { label: 'Least-privilege', desc: 'Minimum permissions necessary' },
                      { label: 'Link revoke/expiry', desc: 'Control access at any time' },
                      { label: 'Snapshot integrity', desc: 'Time-stamped, immutable records' },
                      { label: 'Audit trail', desc: 'View and generation logs' },
                      { label: 'Data minimization', desc: 'Only necessary data retained' },
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span><strong className="text-[var(--text)]">{item.label}:</strong> {item.desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedCard>
            </div>

            <AnimatedCard delay={160}>
              <div className="mt-12 rounded-xl border-l-2 border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
                <p className="text-sm leading-relaxed text-[var(--muted)]">
                  <strong className="text-[var(--text)]">Disclaimer:</strong> Proofround complements—but does not replace—professional accounting, audits, or full diligence processes.
                </p>
              </div>
            </AnimatedCard>
          </div>
        </div>
      </Section>

      {/* Access */}
      <Section background="tinted" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-medium tracking-tight text-[var(--text)] mb-6">Access</h2>
            <p className="mt-5 text-lg leading-7 text-[var(--muted)]">
              Available for Stripe-first SaaS companies raising Seed through Series A, where fast, credible revenue verification matters most.
            </p>
            <div className="mt-10">
              <Link
                href="/dashboard"
                className="inline-flex rounded-lg border-2 border-[var(--text)] bg-[var(--surface)] px-7 py-3.5 text-base font-medium text-[var(--text)] hover:bg-[var(--surface2)] hover:-translate-y-0.5 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--text)] focus:ring-offset-2"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" background="tinted" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-medium tracking-tight text-[var(--text)] mb-12">Frequently asked questions</h2>
            <div className="mt-12">
              <FAQ />
            </div>
          </div>
        </div>
      </Section>

      {/* Final CTA */}
      <Section className="py-32 relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--accent)]/6 blur-3xl"></div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-medium tracking-tight text-[var(--text)]">
              Share a verification packet in minutes.
            </h2>
            <p className="mt-5 text-lg leading-7 text-[var(--muted)]">
              Generate a time-stamped snapshot and share a source-linked investor view.
            </p>
            <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="rounded-lg bg-[var(--accent)] px-6 py-3 text-base font-medium text-[var(--accent-foreground)] hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
                data-analytics="cta_get_started_final"
              >
                Get started
              </Link>
              <Link
                href="#security"
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-base font-medium text-[var(--text)] hover:bg-[var(--surface2)] hover:border-[var(--border)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--text)] focus:ring-offset-2"
              >
                Read security
              </Link>
            </div>
            <p className="mt-6 text-xs text-[var(--muted)]">
              Read-only access. No investor account required.
            </p>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-[var(--muted)]">
              © {new Date().getFullYear()} Proofround. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm text-[var(--muted)]">
              <Link href="#security" className="hover:text-[var(--text)] transition-colors">
                Security
              </Link>
              <Link href="#faq" className="hover:text-[var(--text)] transition-colors">
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

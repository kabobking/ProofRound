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
    <div className="min-h-screen bg-[#fafafa]">
      <Navigation />
      <Hero />

      {/* Problem and Solution */}
      <Section background="tinted" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-6 lg:grid-cols-2">
              <AnimatedCard delay={0}>
                <div className="rounded-xl border-t-2 border-zinc-300 bg-white p-8 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <h2 className="text-2xl font-medium tracking-tight text-zinc-900">Problem</h2>
                  <ul className="mt-6 space-y-3.5 text-zinc-600 leading-relaxed">
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
                      <span>Investors receive screenshots that can't be validated</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
                      <span>MRR, churn, and refunds are defined differently in every deck</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
                      <span>Diligence turns into email threads asking 'how did you calculate this?'</span>
                    </li>
                  </ul>
                </div>
              </AnimatedCard>

              <AnimatedCard delay={80}>
                <div className="rounded-xl border-t-3 border-indigo-600 bg-white p-8 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <h2 className="text-2xl font-medium tracking-tight text-zinc-900">Solution</h2>
                  <ul className="mt-6 space-y-3.5 text-zinc-600 leading-relaxed">
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
                      <span>Metrics computed directly from Stripe source data</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
                      <span>Time-stamped snapshots shared via a single investor link</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
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
            <h2 className="text-3xl font-medium tracking-tight text-zinc-900">How It Works</h2>
          </div>

          <div className="mx-auto mt-16 max-w-4xl">
            <div className="relative space-y-8">
              <div className="absolute left-5 top-12 bottom-12 hidden lg:block w-px bg-zinc-200"></div>
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
                    <div className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-medium text-white group-hover:scale-110 transition-transform">
                      {step.num}
                    </div>
                    <div className="flex-1 rounded-lg bg-white/50 p-4 -ml-2">
                      <h3 className="text-xl font-semibold text-zinc-900">{step.title}</h3>
                      <p className="mt-2.5 text-zinc-600 leading-relaxed">{step.desc}</p>
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
            <h2 className="text-3xl font-medium tracking-tight text-zinc-900">What the packet includes</h2>
            <p className="mt-5 text-lg leading-7 text-zinc-600">
              A time-stamped, Stripe-verified snapshot designed to replace screenshots and reduce diligence follow-ups.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid gap-6 lg:grid-cols-2">
              <AnimatedCard delay={0}>
                <div className="rounded-xl border border-zinc-200 bg-white p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="mb-5">
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">For founders</span>
                  </div>
                  <ul className="space-y-3.5 text-sm text-zinc-600 leading-relaxed">
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
                      <span>Clear metric definitions displayed alongside each number to prevent interpretation disputes</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
                      <span>Time-stamped snapshots so investors know exactly when metrics were captured</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
                      <span>Link controls to revoke access or set expiration during active fundraising</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
                      <span>Audit trail showing when packets were generated and viewed</span>
                    </li>
                  </ul>
                </div>
              </AnimatedCard>

              <AnimatedCard delay={80}>
                <div className="rounded-xl border border-indigo-200/50 bg-white p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="mb-5">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">For investors</span>
                  </div>
                  <ul className="space-y-3.5 text-sm text-zinc-600 leading-relaxed">
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
                      <span>Read-only view with no account required</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
                      <span>Source-linked metrics traceable to Stripe transactions</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
                      <span>Metrics are computed automatically and cannot be manually edited</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
                      <span>Consistent definitions across all metrics</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
                      <span>Drilldown capabilities for detailed analysis</span>
                    </li>
                  </ul>
                </div>
              </AnimatedCard>
            </div>

            <AnimatedCard delay={160}>
              <div className="mt-10 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
                <h3 className="text-lg font-medium text-zinc-900 mb-4">Metrics included</h3>
                <p className="text-sm text-zinc-600 mb-7">
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
                    <div key={idx} className={`pb-5 border-b border-zinc-100 last:border-b-0 last:pb-0 ${metric.highlight ? 'bg-indigo-50/30 -mx-2 px-2 py-3 rounded-md' : ''}`}>
                      <h4 className={`text-sm font-medium ${metric.highlight ? 'text-zinc-900' : 'text-zinc-900'}`}>{metric.title}</h4>
                      <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">{metric.desc}</p>
                    </div>
                  ))}
                  <div className="sm:col-span-2 pt-4 mt-2 rounded-lg bg-indigo-50/50 border border-indigo-100 p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0"></div>
                      <div>
                        <h4 className="text-sm font-medium text-zinc-900">Anomaly flags</h4>
                        <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
                          Automated indicators highlight unusual patterns (e.g., refund spikes or sudden revenue changes) to add transparency. These are signals, not conclusions.
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-zinc-400 leading-relaxed">
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
            <h2 className="text-3xl font-medium tracking-tight text-zinc-900 mb-12">Security and Data Handling</h2>

            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              <AnimatedCard delay={0}>
                <div className="space-y-7">
                  <div>
                    <h3 className="text-lg font-medium text-zinc-900">Read-only Stripe access</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-zinc-600">
                      Proofround requests read-only access to your Stripe account. We cannot initiate charges, issue refunds, modify subscriptions, or change any account settings. The connection uses OAuth with least-privilege scopes.
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                      Proofround cannot modify, backfill, or suppress historical Stripe data.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-zinc-900">Time-stamped packet snapshots</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-zinc-600">
                      Each verification packet is a time-stamped snapshot generated at a specific point in time. This ensures consistency and allows you to track what was shared with investors at different stages of fundraising.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-zinc-900">Data minimization</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-zinc-600">
                      We process your Stripe data to generate aggregated metrics and snapshots. Raw transaction data is processed but not permanently stored in its original form. We retain only the data necessary to serve verification packets and maintain audit trails.
                    </p>
                  </div>
                </div>
              </AnimatedCard>

              <AnimatedCard delay={80}>
                <div className="rounded-xl border border-zinc-200 bg-white p-7 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-medium text-zinc-900 mb-5">Controls</h3>
                  <ul className="space-y-3.5 text-sm text-zinc-600">
                    {[
                      { label: 'Read-only', desc: 'No write permissions requested or granted' },
                      { label: 'Least-privilege', desc: 'Minimum permissions necessary' },
                      { label: 'Link revoke/expiry', desc: 'Control access at any time' },
                      { label: 'Snapshot integrity', desc: 'Time-stamped, immutable records' },
                      { label: 'Audit trail', desc: 'View and generation logs' },
                      { label: 'Data minimization', desc: 'Only necessary data retained' },
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span><strong className="text-zinc-900">{item.label}:</strong> {item.desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedCard>
            </div>

            <AnimatedCard delay={160}>
              <div className="mt-12 rounded-xl border-l-2 border-zinc-300 bg-white p-6 shadow-sm">
                <p className="text-sm leading-relaxed text-zinc-700">
                  <strong className="text-zinc-900">Disclaimer:</strong> Proofround complements—but does not replace—professional accounting, audits, or full diligence processes.
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
            <h2 className="text-3xl font-medium tracking-tight text-zinc-900 mb-6">Access</h2>
            <p className="mt-5 text-lg leading-7 text-zinc-600">
              Available for Stripe-first SaaS companies raising Seed through Series A, where fast, credible revenue verification matters most.
            </p>
            <div className="mt-10">
              <Link
                href="/dashboard"
                className="inline-flex rounded-lg border-2 border-zinc-900 bg-white px-7 py-3.5 text-base font-medium text-zinc-900 hover:bg-zinc-50 hover:-translate-y-0.5 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
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
            <h2 className="text-3xl font-medium tracking-tight text-zinc-900 mb-12">Frequently asked questions</h2>
            <div className="mt-12">
              <FAQ />
            </div>
          </div>
        </div>
      </Section>

      {/* Final CTA */}
      <Section className="py-32 relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/6 blur-3xl"></div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-medium tracking-tight text-zinc-900">
              Share a verification packet in minutes.
            </h2>
            <p className="mt-5 text-lg leading-7 text-zinc-600">
              Generate a time-stamped snapshot and share a source-linked investor view.
            </p>
            <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-medium text-white hover:bg-indigo-700 hover:-translate-y-0.5 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                data-analytics="cta_get_started_final"
              >
                Get started
              </Link>
              <Link
                href="#security"
                className="rounded-lg border border-zinc-300 bg-white px-6 py-3 text-base font-medium text-zinc-900 hover:bg-zinc-50 hover:border-zinc-400 transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
              >
                Read security
              </Link>
            </div>
            <p className="mt-6 text-xs text-zinc-500">
              Read-only access. No investor account required.
            </p>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-zinc-600">
              © {new Date().getFullYear()} Proofround. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm text-zinc-600">
              <Link href="#security" className="hover:text-zinc-900 transition-colors">
                Security
              </Link>
              <Link href="#faq" className="hover:text-zinc-900 transition-colors">
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import Link from 'next/link';
import FAQ from '@/components/landing/FAQ';
import Hero from '@/components/landing/Hero';
import Navigation from '@/components/landing/Navigation';
import Section from '@/components/landing/Section';
import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion, getMotionClasses } from '@/components/landing/motion';
import OnboardingSteps from '@/components/OnboardingSteps';
import SecurityCards from '@/components/SecurityCards';

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

      <Section background="tinted" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-6 lg:grid-cols-2">
              <AnimatedCard delay={0}>
                <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_60px_rgba(2,6,23,0.16)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(2,6,23,0.22)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/20">01</div>
                    <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">Why founders need this</h2>
                  </div>
                  <ul className="mt-6 space-y-4 text-[var(--muted)] leading-relaxed">
                    <li className="flex items-start gap-3"><span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--accent)]" /><span>Investors receive screenshots that cannot be validated or traced back to Stripe.</span></li>
                    <li className="flex items-start gap-3"><span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--accent)]" /><span>MRR, ARR, churn, and refunds are explained differently in every deck.</span></li>
                    <li className="flex items-start gap-3"><span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--accent)]" /><span>Diligence turns into long email threads instead of a clean, reusable packet.</span></li>
                  </ul>
                </div>
              </AnimatedCard>

              <AnimatedCard delay={80}>
                <div className="rounded-[1.5rem] border border-[var(--accent)]/20 bg-[linear-gradient(180deg,var(--surface),var(--surface2))] p-8 shadow-[0_20px_60px_rgba(2,6,23,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(2,6,23,0.18)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accentTint)] text-[var(--accent)] ring-1 ring-[var(--accent)]/20">02</div>
                    <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">What Proofround does</h2>
                  </div>
                  <ul className="mt-6 space-y-4 text-[var(--muted)] leading-relaxed">
                    <li className="flex items-start gap-3"><span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--accent2)]" /><span>Metrics are computed directly from Stripe source data with clear definitions.</span></li>
                    <li className="flex items-start gap-3"><span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--accent2)]" /><span>Time-stamped snapshots are shared through a single founder-controlled investor link.</span></li>
                    <li className="flex items-start gap-3"><span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--accent2)]" /><span>Transparent trust cues reduce follow-ups and make due diligence faster.</span></li>
                  </ul>
                </div>
              </AnimatedCard>
            </div>
          </div>
        </div>
      </Section>

      <Section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text)]">Three steps from Stripe to investor-ready packet.</h2>
          </div>

          <div className="mx-auto mt-16 max-w-5xl">
            <OnboardingSteps />
          </div>
        </div>
      </Section>

      <Section id="packet-contents" background="tinted" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Product</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text)]">What the packet includes</h2>
            <p className="mt-5 text-lg leading-8 text-[var(--muted)]">A time-stamped Stripe-verified snapshot designed to replace screenshots and reduce diligence follow-ups.</p>
          </div>

          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid gap-6 lg:grid-cols-2">
              <AnimatedCard delay={0}>
                <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[0_20px_60px_rgba(2,6,23,0.16)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(2,6,23,0.22)]">
                  <div className="mb-5"><span className="inline-flex items-center rounded-full bg-[var(--surface2)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">For founders</span></div>
                  <ul className="space-y-3.5 text-sm text-[var(--muted)] leading-relaxed">
                    <li className="flex items-start gap-3"><span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" /><span>Clear metric definitions displayed alongside each number to prevent interpretation disputes</span></li>
                    <li className="flex items-start gap-3"><span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" /><span>Time-stamped snapshots so investors know exactly when metrics were captured</span></li>
                    <li className="flex items-start gap-3"><span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" /><span>Link controls to revoke access or set expiration during active fundraising</span></li>
                    <li className="flex items-start gap-3"><span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" /><span>Audit trail showing when packets were generated and viewed</span></li>
                  </ul>
                </div>
              </AnimatedCard>

              <AnimatedCard delay={80}>
                <div className="rounded-[1.5rem] border border-[var(--accent)]/25 bg-[linear-gradient(180deg,var(--surface),var(--surface2))] p-7 shadow-[0_20px_60px_rgba(2,6,23,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(2,6,23,0.18)]">
                  <div className="mb-5"><span className="inline-flex items-center rounded-full border border-[var(--accentTint)] bg-[var(--accentTint)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">For investors</span></div>
                  <ul className="space-y-3.5 text-sm text-[var(--muted)] leading-relaxed">
                    <li className="flex items-start gap-3"><span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" /><span>Read-only view with no account required</span></li>
                    <li className="flex items-start gap-3"><span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" /><span>Source-linked metrics traceable to Stripe transactions</span></li>
                    <li className="flex items-start gap-3"><span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" /><span>Metrics are computed automatically and cannot be manually edited</span></li>
                    <li className="flex items-start gap-3"><span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" /><span>Consistent definitions across all metrics</span></li>
                    <li className="flex items-start gap-3"><span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted)]" /><span>Drilldown capabilities for detailed analysis</span></li>
                  </ul>
                </div>
              </AnimatedCard>
            </div>

            <AnimatedCard delay={160}>
              <div className="mt-10 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
                <h3 className="mb-4 text-lg font-semibold text-[var(--text)]">Metrics included</h3>
                <p className="mb-7 text-sm text-[var(--muted)]">All metrics are calculated using standardized definitions and displayed consistently across companies.</p>
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
                        <p className="mt-1.5 text-xs text-[var(--muted)] leading-relaxed">Automated indicators highlight unusual patterns (e.g., refund spikes or sudden revenue changes) to add transparency. These are signals, not conclusions.</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-[var(--muted)] leading-relaxed">Indicators only; not a guarantee of accuracy or fraud prevention.</p>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          </div>
        </div>
      </Section>

      <Section id="security" background="tinted" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Security model</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text)]">Read-only trust, built into the product.</h2>
              <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[var(--muted)]">Security is the product. These controls make the packet credible enough to share with investors without exposing sensitive Stripe data.</p>
            </div>

            <div className="mt-12"><SecurityCards /></div>

            <div className="mt-8 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-7 text-[var(--muted)] shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
              <p>Proofround complements diligence but does not replace accounting reviews, audits, or investor judgment.</p>
            </div>
          </div>
        </div>
      </Section>

      <Section background="tinted" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-medium tracking-tight text-[var(--text)] mb-6">Access</h2>
            <p className="mt-5 text-lg leading-7 text-[var(--muted)]">Available for Stripe-first SaaS companies raising Seed through Series A, where fast, credible revenue verification matters most.</p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent)] px-7 py-3.5 text-base font-medium text-[var(--accent-foreground)] hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2">Get started</Link>
              <Link href="/security" className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-7 py-3.5 text-base font-medium text-[var(--text)] hover:bg-[var(--surface2)] hover:-translate-y-0.5 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--text)] focus:ring-offset-2">Security Model</Link>
            </div>
          </div>
        </div>
      </Section>

      <Section id="faq" background="tinted" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-12 text-3xl font-medium tracking-tight text-[var(--text)]">Frequently asked questions</h2>
            <div className="mt-12"><FAQ /></div>
          </div>
        </div>
      </Section>

      <Section className="relative py-32">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--accent)]/6 blur-3xl"></div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Final CTA</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text)]">Share a verification packet in minutes.</h2>
            <p className="mt-5 text-lg leading-7 text-[var(--muted)]">Generate a time-stamped snapshot and share a source-linked investor view.</p>
            <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent)] px-6 py-3 text-base font-medium text-[var(--accent-foreground)] hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2" data-analytics="cta_get_started_final">Get started</Link>
              <Link href="/security" className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-base font-medium text-[var(--text)] hover:-translate-y-0.5 hover:bg-[var(--surface2)] hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--text)] focus:ring-offset-2">Security Model</Link>
            </div>
            <p className="mt-6 text-xs text-[var(--muted)]">Read-only access. No investor account required.</p>
          </div>
        </div>
      </Section>

      <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-[var(--muted)]">© {new Date().getFullYear()} Proofround. All rights reserved.</div>
            <div className="flex flex-wrap gap-6 text-sm text-[var(--muted)]">
              <Link href="#security" className="transition-colors hover:text-[var(--text)]">Security</Link>
              <Link href="/security" className="transition-colors hover:text-[var(--text)]">Security Model</Link>
              <Link href="#faq" className="transition-colors hover:text-[var(--text)]">FAQ</Link>
              <Link href="/privacy-policy" className="transition-colors hover:text-[var(--text)]">Privacy Policy</Link>
              <Link href="/terms-of-service" className="transition-colors hover:text-[var(--text)]">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
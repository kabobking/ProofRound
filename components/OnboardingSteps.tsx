'use client';

type Step = {
  title: string;
  description: string;
};

export default function OnboardingSteps({
  steps = [
    { title: 'Profile', description: 'Create your startup profile and position the company.' },
    { title: 'Stripe', description: 'Connect read-only Stripe access to verify revenue.' },
    { title: 'Packet', description: 'Generate and share a revocable investor packet.' },
  ],
}: {
  steps?: Step[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {steps.map((step, index) => (
        <div key={step.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_50px_rgba(2,6,23,0.16)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accentTint)] text-sm font-semibold text-[var(--accent)]">
              0{index + 1}
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent md:hidden" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-[var(--text)]">{step.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{step.description}</p>
        </div>
      ))}
    </div>
  );
}
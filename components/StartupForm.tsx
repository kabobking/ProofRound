'use client';

import { useState } from 'react';
import { createStartup } from '@/lib/database';
import { Startup } from '@/lib/models';

type FormValues = {
  name: string;
  tagline: string;
  description: string;
  industry: string;
  stage: Startup['stage'];
  website: string;
  location: string;
  founded: string;
  team_size: string;
  seeking_amount: string;
  valuation: string;
  equity_offered: string;
};

const initialValues: FormValues = {
  name: '',
  tagline: '',
  description: '',
  industry: '',
  stage: 'seed',
  website: '',
  location: '',
  founded: new Date().toISOString().split('T')[0],
  team_size: '',
  seeking_amount: '',
  valuation: '',
  equity_offered: '',
};

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function StartupForm({
  founderId,
  founderEmail,
  onCancel,
  onCreated,
}: {
  founderId: string;
  founderEmail: string;
  onCancel: () => void;
  onCreated: (startup: Startup) => void | Promise<void>;
}) {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});

  const validate = (draft: FormValues) => {
    const nextErrors: Partial<Record<keyof FormValues, string>> = {};

    if (!draft.name.trim()) nextErrors.name = 'Add the company name founders and investors will recognize.';
    if (!draft.tagline.trim()) nextErrors.tagline = 'Write a one-line summary of the company.';
    if (!draft.description.trim()) nextErrors.description = 'Describe the product and the market you serve.';
    if (!draft.industry.trim()) nextErrors.industry = 'Choose the primary industry.';
    if (!draft.location.trim()) nextErrors.location = 'Share the primary location or operating hub.';

    return nextErrors;
  };

  const updateValue = (name: keyof FormValues, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));

    const draft = { ...values, [name]: value };
    setErrors(validate(draft));
  };

  const handleBlur = (name: keyof FormValues) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(validate(values));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setTouched({
      name: true,
      tagline: true,
      description: true,
      industry: true,
      location: true,
      website: true,
      founded: true,
      stage: true,
      team_size: true,
      seeking_amount: true,
      valuation: true,
      equity_offered: true,
    });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setSubmitError('');

    try {
      const startup = await createStartup({
        founderId,
        founderEmail,
        name: values.name.trim(),
        tagline: values.tagline.trim(),
        description: values.description.trim(),
        industry: values.industry.trim(),
        stage: values.stage,
        founded: values.founded,
        website: values.website.trim() || undefined,
        location: values.location.trim(),
        team_size: parseOptionalNumber(values.team_size),
        seeking_amount: parseOptionalNumber(values.seeking_amount),
        valuation: parseOptionalNumber(values.valuation),
        equity_offered: parseOptionalNumber(values.equity_offered),
        logo: undefined,
        visible: false,
        status: 'draft',
        verifiedFinancials: false,
      });

      await onCreated(startup);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'We could not save that startup profile.');
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = 'mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/15';
  const errorClass = 'mt-2 text-xs text-rose-300';

  const showError = (key: keyof FormValues) => touched[key] && errors[key];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {submitError && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {submitError}
        </div>
      )}

      <section className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_18px_50px_rgba(2,6,23,0.18)]">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Company information</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text)]">Tell investors who you are.</h3>
          </div>
          <p className="text-sm text-[var(--muted)]">Fields marked required are needed to create the profile.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <label className="block lg:col-span-2">
            <span className="text-sm font-medium text-[var(--text)]">Company name</span>
            <span className="ml-2 text-xs text-[var(--muted)]">Required</span>
            <input type="text" value={values.name} onChange={e => updateValue('name', e.target.value)} onBlur={() => handleBlur('name')} className={fieldClass} placeholder="Proofround" />
            <p className="mt-2 text-xs text-[var(--muted)]">Use the name founders and investors will see everywhere.</p>
            {showError('name') && <p className={errorClass}>{errors.name}</p>}
          </label>

          <label className="block lg:col-span-2">
            <span className="text-sm font-medium text-[var(--text)]">Tagline</span>
            <span className="ml-2 text-xs text-[var(--muted)]">Required</span>
            <input type="text" value={values.tagline} onChange={e => updateValue('tagline', e.target.value)} onBlur={() => handleBlur('tagline')} className={fieldClass} placeholder="Stripe-verified fundraising packets for founders" />
            <p className="mt-2 text-xs text-[var(--muted)]">A short, investor-facing summary of the company.</p>
            {showError('tagline') && <p className={errorClass}>{errors.tagline}</p>}
          </label>

          <label className="block lg:col-span-2">
            <span className="text-sm font-medium text-[var(--text)]">Description</span>
            <span className="ml-2 text-xs text-[var(--muted)]">Required</span>
            <textarea value={values.description} onChange={e => updateValue('description', e.target.value)} onBlur={() => handleBlur('description')} className={`${fieldClass} min-h-[140px]`} placeholder="Describe the product, customer, and why the company matters." />
            <p className="mt-2 text-xs text-[var(--muted)]">Keep it founder-friendly and concise.</p>
            {showError('description') && <p className={errorClass}>{errors.description}</p>}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--text)]">Industry</span>
            <span className="ml-2 text-xs text-[var(--muted)]">Required</span>
            <input type="text" value={values.industry} onChange={e => updateValue('industry', e.target.value)} onBlur={() => handleBlur('industry')} className={fieldClass} placeholder="SaaS, fintech, healthcare, AI" />
            <p className="mt-2 text-xs text-[var(--muted)]">Use the category investors would search for.</p>
            {showError('industry') && <p className={errorClass}>{errors.industry}</p>}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--text)]">Stage</span>
            <span className="ml-2 text-xs text-[var(--muted)]">Required</span>
            <select value={values.stage} onChange={e => updateValue('stage', e.target.value as Startup['stage'])} onBlur={() => handleBlur('stage')} className={fieldClass}>
              <option value="pre-seed">Pre-seed</option>
              <option value="seed">Seed</option>
              <option value="series-a">Series A</option>
              <option value="series-b">Series B</option>
              <option value="series-c">Series C</option>
              <option value="growth">Growth</option>
              <option value="mature">Mature</option>
            </select>
            <p className="mt-2 text-xs text-[var(--muted)]">Pick the current fundraising stage.</p>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--text)]">Website</span>
            <span className="ml-2 text-xs text-[var(--muted)]">Optional</span>
            <input type="url" value={values.website} onChange={e => updateValue('website', e.target.value)} onBlur={() => handleBlur('website')} className={fieldClass} placeholder="https://yourcompany.com" />
            <p className="mt-2 text-xs text-[var(--muted)]">Use the public homepage or product site.</p>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--text)]">Location</span>
            <span className="ml-2 text-xs text-[var(--muted)]">Required</span>
            <input type="text" value={values.location} onChange={e => updateValue('location', e.target.value)} onBlur={() => handleBlur('location')} className={fieldClass} placeholder="San Francisco, CA" />
            <p className="mt-2 text-xs text-[var(--muted)]">Where the company is based or primarily operates.</p>
            {showError('location') && <p className={errorClass}>{errors.location}</p>}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--text)]">Founded date</span>
            <span className="ml-2 text-xs text-[var(--muted)]">Optional</span>
            <input type="date" value={values.founded} onChange={e => updateValue('founded', e.target.value)} onBlur={() => handleBlur('founded')} className={fieldClass} />
            <p className="mt-2 text-xs text-[var(--muted)]">Helps investors understand company maturity.</p>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--text)]">Team size</span>
            <span className="ml-2 text-xs text-[var(--muted)]">Optional</span>
            <input type="number" min="1" value={values.team_size} onChange={e => updateValue('team_size', e.target.value)} onBlur={() => handleBlur('team_size')} className={fieldClass} placeholder="12" />
            <p className="mt-2 text-xs text-[var(--muted)]">Approximate full-time team size.</p>
          </label>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_18px_50px_rgba(2,6,23,0.18)]">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Fundraising information</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text)]">Share the round context you want investors to see.</h3>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-[var(--text)]">Amount raising</span>
            <span className="ml-2 text-xs text-[var(--muted)]">Optional</span>
            <input type="number" min="0" step="1000" value={values.seeking_amount} onChange={e => updateValue('seeking_amount', e.target.value)} onBlur={() => handleBlur('seeking_amount')} className={fieldClass} placeholder="1000000" />
            <p className="mt-2 text-xs text-[var(--muted)]">Enter the round size in USD.</p>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--text)]">Valuation</span>
            <span className="ml-2 text-xs text-[var(--muted)]">Optional</span>
            <input type="number" min="0" step="1000" value={values.valuation} onChange={e => updateValue('valuation', e.target.value)} onBlur={() => handleBlur('valuation')} className={fieldClass} placeholder="5000000" />
            <p className="mt-2 text-xs text-[var(--muted)]">Post-money or pre-money, whichever you prefer to show.</p>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--text)]">Equity offered</span>
            <span className="ml-2 text-xs text-[var(--muted)]">Optional</span>
            <input type="number" min="0" max="100" step="0.1" value={values.equity_offered} onChange={e => updateValue('equity_offered', e.target.value)} onBlur={() => handleBlur('equity_offered')} className={fieldClass} placeholder="10" />
            <p className="mt-2 text-xs text-[var(--muted)]">Percentage of the company offered in this round.</p>
          </label>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--text)] transition-all hover:bg-[var(--surface2)]">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--accent-foreground)] transition-all hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? 'Saving profile…' : 'Save startup profile'}
        </button>
      </div>
    </form>
  );
}
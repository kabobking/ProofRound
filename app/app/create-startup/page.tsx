'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createStartup } from '@/lib/database';
import AnimatedCard from '@/components/AnimatedCard';
import AppHeader from '@/components/AppHeader';

export default function CreateStartupPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    industry: '',
    stage: 'seed' as const,
    founded: new Date().toISOString().split('T')[0],
    website: '',
    logo: '',
    location: '',
    team_size: 1,
    seeking_amount: 0,
    valuation: 0,
    equity_offered: 0,
  });

  if (!userProfile) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('_amount') || name.includes('_size') || name.includes('_offered') || name.includes('_rate')
        ? Number(value)
        : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const startup = await createStartup({
        ...formData,
        founderId: userProfile.id,
        founderEmail: userProfile.email,
        visible: false, // Hidden by default until verified
        status: 'draft',
        verifiedFinancials: false,
      });

      router.push(`/startup?startupId=${startup.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create startup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <AppHeader 
        title="Create New Startup" 
        subtitle="List your company and start attracting investors"
        quickLinks={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My Startups', href: '/startups' },
          { label: 'Marketplace', href: '/marketplace' },
        ]}
      />

      <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12">
        <AnimatedCard>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8">
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Info */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-[var(--text)]">Company Information</h3>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text)]">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    placeholder="Your company name"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text)]">
                    Tagline *
                  </label>
                  <input
                    type="text"
                    name="tagline"
                    value={formData.tagline}
                    onChange={handleChange}
                    required
                    maxLength={100}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    placeholder="Short description (max 100 chars)"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text)]">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    placeholder="Tell us about your company..."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text)]">
                      Industry *
                    </label>
                    <input
                      type="text"
                      name="industry"
                      value={formData.industry}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                      placeholder="e.g. SaaS, FinTech"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text)]">
                      Stage *
                    </label>
                    <select
                      name="stage"
                      value={formData.stage}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    >
                      <option value="pre-seed">Pre-seed</option>
                      <option value="seed">Seed</option>
                      <option value="series-a">Series A</option>
                      <option value="series-b">Series B</option>
                      <option value="series-c">Series C</option>
                      <option value="growth">Growth</option>
                      <option value="mature">Mature</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text)]">
                      Founded
                    </label>
                    <input
                      type="date"
                      name="founded"
                      value={formData.founded}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text)]">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                      placeholder="City, Country"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text)]">
                      Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text)]">
                      Team Size
                    </label>
                    <input
                      type="number"
                      name="team_size"
                      value={formData.team_size}
                      onChange={handleChange}
                      min="1"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fundraising */}
            <div className="border-t border-[var(--border)] pt-6">
              <h3 className="mb-4 text-lg font-semibold text-[var(--text)]">Fundraising Information</h3>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text)]">
                      Amount Seeking (USD)
                    </label>
                    <input
                      type="number"
                      name="seeking_amount"
                      value={formData.seeking_amount}
                      onChange={handleChange}
                      min="0"
                      step="100000"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                      placeholder="e.g. 1000000"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text)]">
                      Valuation (USD)
                    </label>
                    <input
                      type="number"
                      name="valuation"
                      value={formData.valuation}
                      onChange={handleChange}
                      min="0"
                      step="100000"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                      placeholder="e.g. 5000000"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text)]">
                      Equity Offered (%)
                    </label>
                    <input
                      type="number"
                      name="equity_offered"
                      value={formData.equity_offered}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                      placeholder="e.g. 10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 border-t border-[var(--border)] pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-[var(--accent)] py-2 font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Startup'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 rounded-lg border border-[var(--border)] py-2 font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface2)]"
              >
                Cancel
              </button>
            </div>
          </form>
          </div>
        </AnimatedCard>
      </main>
    </div>
  );
}

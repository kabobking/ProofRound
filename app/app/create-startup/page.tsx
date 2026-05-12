'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createStartup } from '@/lib/database';
import { Startup } from '@/lib/models';
import AnimatedCard from '@/components/AnimatedCard';

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

      router.push(`/startup/${startup.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create startup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-zinc-900">Add New Startup</h1>
          <p className="mt-2 text-zinc-600">List your company to attract investors</p>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12">
        <AnimatedCard>
          <div className="bg-white rounded-lg border border-zinc-200 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Info */}
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-4">Company Information</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="Your company name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-1">
                    Tagline *
                  </label>
                  <input
                    type="text"
                    name="tagline"
                    value={formData.tagline}
                    onChange={handleChange}
                    required
                    maxLength={100}
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="Short description (max 100 chars)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-1">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="Tell us about your company..."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-zinc-900 mb-1">
                      Industry *
                    </label>
                    <input
                      type="text"
                      name="industry"
                      value={formData.industry}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      placeholder="e.g. SaaS, FinTech"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-900 mb-1">
                      Stage *
                    </label>
                    <select
                      name="stage"
                      value={formData.stage}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
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
                    <label className="block text-sm font-medium text-zinc-900 mb-1">
                      Founded
                    </label>
                    <input
                      type="date"
                      name="founded"
                      value={formData.founded}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-900 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      placeholder="City, Country"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-zinc-900 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-900 mb-1">
                      Team Size
                    </label>
                    <input
                      type="number"
                      name="team_size"
                      value={formData.team_size}
                      onChange={handleChange}
                      min="1"
                      className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fundraising */}
            <div className="pt-6 border-t border-zinc-200">
              <h3 className="text-lg font-semibold text-zinc-900 mb-4">Fundraising Information</h3>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-900 mb-1">
                      Amount Seeking (USD)
                    </label>
                    <input
                      type="number"
                      name="seeking_amount"
                      value={formData.seeking_amount}
                      onChange={handleChange}
                      min="0"
                      step="100000"
                      className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      placeholder="e.g. 1000000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-900 mb-1">
                      Valuation (USD)
                    </label>
                    <input
                      type="number"
                      name="valuation"
                      value={formData.valuation}
                      onChange={handleChange}
                      min="0"
                      step="100000"
                      className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      placeholder="e.g. 5000000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-900 mb-1">
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
                      className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      placeholder="e.g. 10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-6 border-t border-zinc-200">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Creating...' : 'Create Startup'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 py-2 border border-zinc-300 text-zinc-900 font-medium rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}

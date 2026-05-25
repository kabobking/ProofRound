'use client';

import { MouseEvent, useMemo, useState } from 'react';

interface StartupRevenueActionsProps {
  startupId: string;
  startupName: string;
  founderEmail?: string;
  stripeConnected?: boolean;
  variant?: 'founder' | 'investor';
}

type PacketRange = {
  start?: string;
  end?: string;
};

type RangePreset = '30d' | '90d' | '365d' | 'all' | 'custom';

const packetPriceLabel = process.env.NEXT_PUBLIC_VERIFIED_PACKET_PRICE_USD || '49';

function openExternalTarget(url: string | undefined, fallbackMessage: string) {
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  window.alert(fallbackMessage);
}

function toAbsoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
    return url;
  }

  if (url.startsWith('/')) {
    return new URL(url, window.location.origin).toString();
  }

  return new URL(`/${url}`, window.location.origin).toString();
}

function resolveGeneratePacketUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_VERIFIED_PACKET_GENERATE_URL;
  if (explicitUrl) {
    return explicitUrl;
  }

  const requestUrl = process.env.NEXT_PUBLIC_VERIFIED_PACKET_REQUEST_URL;
  if (requestUrl && !requestUrl.startsWith('mailto:')) {
    return requestUrl.replace(/\/api\/packets\/request(?:\?.*)?$/, '/api/packets/generate');
  }

  return undefined;
}

function createPresetRange(days: number): PacketRange {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function parseIsoDate(input: string, isEnd = false) {
  const text = input.trim();
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}${isEnd ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`
    : text;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function resolveRangeSelection(preset: RangePreset, customStart: string, customEnd: string): { range?: PacketRange; error?: string } {
  if (preset === '30d') {
    return { range: createPresetRange(30) };
  }

  if (preset === '90d') {
    return { range: createPresetRange(90) };
  }

  if (preset === '365d') {
    return { range: createPresetRange(365) };
  }

  if (preset === 'all') {
    return { range: {} };
  }

  const startDate = parseIsoDate(customStart);
  if (!startDate) {
    return { error: 'Enter a valid custom start date (YYYY-MM-DD).' };
  }

  const endDate = customEnd.trim() ? parseIsoDate(customEnd, true) : new Date();
  if (!endDate) {
    return { error: 'Enter a valid custom end date (YYYY-MM-DD), or leave it blank.' };
  }

  if (startDate.getTime() > endDate.getTime()) {
    return { error: 'Custom start date must be on or before the end date.' };
  }

  return {
    range: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
  };
}

function appendPacketRange(url: string | undefined, range: PacketRange) {
  if (!url) {
    return undefined;
  }

  const nextUrl = new URL(url);

  if (range.start) {
    nextUrl.searchParams.set('start', range.start);
  } else {
    nextUrl.searchParams.delete('start');
  }

  if (range.end) {
    nextUrl.searchParams.set('end', range.end);
  } else {
    nextUrl.searchParams.delete('end');
  }

  return nextUrl.toString();
}

export default function StartupRevenueActions({
  startupId,
  startupName,
  founderEmail,
  stripeConnected = false,
  variant = 'founder',
}: StartupRevenueActionsProps) {
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [rangePreset, setRangePreset] = useState<RangePreset>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [pendingGenerateUrl, setPendingGenerateUrl] = useState<string | null>(null);

  const isCustomRange = rangePreset === 'custom';

  const presetDescription = useMemo(() => {
    if (rangePreset === '30d') return 'Includes the last 30 days up to now.';
    if (rangePreset === '90d') return 'Includes the last 90 days up to now.';
    if (rangePreset === '365d') return 'Includes the last 12 months up to now.';
    if (rangePreset === 'all') return 'Uses the full available Stripe history for this startup.';
    return 'Choose start/end dates to define a custom reporting window.';
  }, [rangePreset]);

  const closeRangeModal = () => {
    setIsRangeModalOpen(false);
    setRangeError(null);
  };
  const appendStartupId = (url: string | undefined) => {
    if (!url) return undefined;

    const nextUrl = new URL(toAbsoluteUrl(url));
    if (nextUrl.protocol === 'mailto:') {
      return nextUrl.toString();
    }

    nextUrl.searchParams.set('startupId', startupId);
    nextUrl.searchParams.set('startupName', startupName);
    return nextUrl.toString();
  };

  const handleConnectStripe = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    
    const stripeUrl = process.env.NEXT_PUBLIC_STRIPE_CONNECT_BACKEND_URL || 
                      process.env.NEXT_PUBLIC_STRIPE_OAUTH_URL;
    
    if (!stripeUrl) {
      alert('Stripe Connect URL not configured. Set NEXT_PUBLIC_STRIPE_CONNECT_BACKEND_URL or NEXT_PUBLIC_STRIPE_OAUTH_URL in .env.local');
      return;
    }
    
    openExternalTarget(
      appendStartupId(stripeUrl),
      'Configure NEXT_PUBLIC_STRIPE_CONNECT_BACKEND_URL or NEXT_PUBLIC_STRIPE_OAUTH_URL in .env.local'
    );
  };

  const handleGeneratePacket = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!stripeConnected) {
      window.alert('Connect Stripe first so ProofRound can read the startup\'s verified revenue data.');
      return;
    }

    const configuredUrl = appendStartupId(resolveGeneratePacketUrl());
    if (!configuredUrl) {
      window.alert(
        'Configure NEXT_PUBLIC_VERIFIED_PACKET_GENERATE_URL, or set NEXT_PUBLIC_VERIFIED_PACKET_REQUEST_URL to the matching backend host so ProofRound can derive /api/packets/generate automatically.'
      );
      return;
    }

    setPendingGenerateUrl(configuredUrl);
    setRangePreset('30d');
    setCustomStartDate('');
    setCustomEndDate('');
    setRangeError(null);
    setIsRangeModalOpen(true);
  };

  const handleConfirmRange = () => {
    if (!pendingGenerateUrl) {
      setRangeError('Could not find a packet generation URL. Please try again.');
      return;
    }

    const { range, error } = resolveRangeSelection(rangePreset, customStartDate, customEndDate);
    if (error || !range) {
      setRangeError(error || 'Choose a valid range before continuing.');
      return;
    }

    openExternalTarget(
      appendPacketRange(pendingGenerateUrl, range),
      'Could not build a packet generation URL. Please check your configuration and try again.'
    );

    closeRangeModal();
  };

  const handleRequestPacket = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    const requestUrl = process.env.NEXT_PUBLIC_VERIFIED_PACKET_REQUEST_URL;
    if (requestUrl) {
      // Try POSTing to create a Checkout session and open the returned URL
      fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startupId, startupName }),
      })
        .then(async res => res.json())
        .then(json => {
          if (json.checkoutUrl) {
            window.open(json.checkoutUrl, '_blank', 'noopener,noreferrer');
            return;
          }

          // fallback: if backend returned an HTML page or no checkoutUrl, open the requestUrl in a new tab
          window.open(appendStartupId(requestUrl), '_blank', 'noopener,noreferrer');
        })
        .catch(() => {
          window.open(appendStartupId(requestUrl), '_blank', 'noopener,noreferrer');
        });
      return;
    }

    const email = founderEmail || 'support@proofround.com';
    const subject = encodeURIComponent(`Request verified revenue packet for ${startupName}`);
    const body = encodeURIComponent(
      `Hi, I would like to request the ProofRound verified revenue packet for ${startupName}. The current listed request price is $${packetPriceLabel}. Please send the next steps.`
    );

    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  if (variant === 'founder') {
    return (
      <>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleConnectStripe}
            className="inline-flex items-center rounded-full border border-[var(--accent)] bg-[var(--accentTint)] px-4 py-2 text-sm font-medium text-[var(--accent)] transition-colors hover:opacity-90"
          >
            {stripeConnected ? 'Manage Stripe' : 'Connect with Stripe'}
          </button>
          <button
            type="button"
            onClick={handleGeneratePacket}
            className="inline-flex items-center rounded-full border border-[var(--accent2)]/40 bg-[var(--accent2)]/10 px-4 py-2 text-sm font-medium text-[var(--accent2)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!stripeConnected}
          >
            Generate verified PDF
          </button>
          {!stripeConnected && (
            <span className="self-center text-xs text-[var(--muted)]">
              Stripe access is required before generating verified packets.
            </span>
          )}
        </div>

        {isRangeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close date range picker"
              className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]"
              onClick={closeRangeModal}
            />
            <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.25)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Verification packet</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text)]">Choose a date range</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Select the reporting window for this generated PDF.</p>

              <label htmlFor="packet-range" className="mt-5 block text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                Date range
              </label>
              <select
                id="packet-range"
                value={rangePreset}
                onChange={event => {
                  setRangePreset(event.target.value as RangePreset);
                  setRangeError(null);
                }}
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              >
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="365d">Last 12 months</option>
                <option value="all">All available history</option>
                <option value="custom">Custom range</option>
              </select>

              <p className="mt-2 text-xs text-[var(--muted)]">{presetDescription}</p>

              {isCustomRange && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="packet-start" className="block text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Start date</label>
                    <input
                      id="packet-start"
                      type="date"
                      value={customStartDate}
                      onChange={event => {
                        setCustomStartDate(event.target.value);
                        setRangeError(null);
                      }}
                      className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="packet-end" className="block text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">End date</label>
                    <input
                      id="packet-end"
                      type="date"
                      value={customEndDate}
                      onChange={event => {
                        setCustomEndDate(event.target.value);
                        setRangeError(null);
                      }}
                      className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                </div>
              )}

              {rangeError && (
                <p className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
                  {rangeError}
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeRangeModal}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRange}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition-opacity hover:opacity-90"
                >
                  Generate PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={handleRequestPacket}
        className="inline-flex items-center rounded-full border border-[var(--accent)] bg-[var(--accentTint)] px-4 py-2 text-sm font-medium text-[var(--accent)] transition-colors hover:opacity-90"
      >
        Request verified PDF {packetPriceLabel ? `($${packetPriceLabel})` : ''}
      </button>
    </div>
  );
}
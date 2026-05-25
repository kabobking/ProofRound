'use client';

import { MouseEvent } from 'react';

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

function promptForPacketRange(): PacketRange | null {
  const answer = window.prompt(
    'Choose packet time range: 30d, 90d, 365d, custom, or all.\nExamples: 30d or custom',
    '30d'
  );

  if (answer === null) {
    return null;
  }

  const selection = answer.trim().toLowerCase() || '30d';

  if (selection === '30d' || selection === '30' || selection === '1') {
    return createPresetRange(30);
  }

  if (selection === '90d' || selection === '90' || selection === '2') {
    return createPresetRange(90);
  }

  if (selection === '365d' || selection === '365' || selection === '3' || selection === '1y') {
    return createPresetRange(365);
  }

  if (selection === 'all' || selection === 'lifetime' || selection === '4') {
    return {};
  }

  if (selection === 'custom' || selection === 'c') {
    const startInput = window.prompt('Enter start date (YYYY-MM-DD):');
    if (startInput === null) {
      return null;
    }

    const endInput = window.prompt('Enter end date (YYYY-MM-DD), or leave blank for today:', '');
    if (endInput === null) {
      return null;
    }

    const startDate = parseIsoDate(startInput);
    if (!startDate) {
      window.alert('Invalid start date. Use YYYY-MM-DD.');
      return null;
    }

    const endDate = endInput.trim() ? parseIsoDate(endInput, true) : new Date();
    if (!endDate) {
      window.alert('Invalid end date. Use YYYY-MM-DD.');
      return null;
    }

    if (startDate.getTime() > endDate.getTime()) {
      window.alert('Start date must be on or before end date.');
      return null;
    }

    return { start: startDate.toISOString(), end: endDate.toISOString() };
  }

  window.alert('Range not recognized. Use 30d, 90d, 365d, custom, or all.');
  return null;
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

    const selectedRange = promptForPacketRange();
    if (selectedRange === null) {
      return;
    }

    openExternalTarget(
      appendPacketRange(configuredUrl, selectedRange),
      'Could not build a packet generation URL. Please check your configuration and try again.'
    );
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
'use client';

import { MouseEvent } from 'react';

interface StartupRevenueActionsProps {
  startupId: string;
  startupName: string;
  founderEmail?: string;
  stripeConnected?: boolean;
  variant?: 'founder' | 'investor';
}

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

    openExternalTarget(appendStartupId(process.env.NEXT_PUBLIC_VERIFIED_PACKET_GENERATE_URL), 'Configure NEXT_PUBLIC_VERIFIED_PACKET_GENERATE_URL to trigger your packet generator or backend export step.');
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
          className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
        >
          {stripeConnected ? 'Manage Stripe' : 'Connect with Stripe'}
        </button>
        <button
          type="button"
          onClick={handleGeneratePacket}
          className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!stripeConnected}
        >
          Generate verified PDF
        </button>
        {!stripeConnected && (
          <span className="self-center text-xs text-slate-500">
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
        className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
      >
        Request verified PDF {packetPriceLabel ? `($${packetPriceLabel})` : ''}
      </button>
    </div>
  );
}
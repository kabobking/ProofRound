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

export default function StartupRevenueActions({
  startupId,
  startupName,
  founderEmail,
  stripeConnected = false,
  variant = 'founder',
}: StartupRevenueActionsProps) {
  const appendStartupId = (url: string | undefined) => {
    if (!url) return undefined;

    if (url.startsWith('mailto:')) {
      return url;
    }

    const nextUrl = new URL(url);
    nextUrl.searchParams.set('startupId', startupId);
    nextUrl.searchParams.set('startupName', startupName);
    return nextUrl.toString();
  };

  const handleConnectStripe = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    openExternalTarget(
      appendStartupId(process.env.NEXT_PUBLIC_STRIPE_CONNECT_URL),
      'Configure NEXT_PUBLIC_STRIPE_CONNECT_URL to point to your Stripe Connect onboarding or dashboard link.'
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

    const requestUrl = appendStartupId(process.env.NEXT_PUBLIC_VERIFIED_PACKET_REQUEST_URL);
    if (requestUrl) {
      window.open(requestUrl, '_blank', 'noopener,noreferrer');
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
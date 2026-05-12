import { ensureConnectedStripeAccount, getFrontendBaseUrl } from '../../lib/packets';
import { getStripeClient } from '../../lib/stripe';
import type { BackendRequest, BackendResponse } from '../../lib/http';

export default async function handler(req: BackendRequest, res: BackendResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startupId = String(req.query.startupId || '').trim();
    if (!startupId) {
      return res.status(400).json({ error: 'startupId is required' });
    }

    const startup = await ensureConnectedStripeAccount(startupId);
    const stripe = getStripeClient();
    const frontendBaseUrl = getFrontendBaseUrl();

    const accountLink = await stripe.accountLinks.create({
      account: startup.stripeAccountId as string,
      refresh_url: `${frontendBaseUrl}/startup?startupId=${encodeURIComponent(startupId)}`,
      return_url: `${frontendBaseUrl}/startup?startupId=${encodeURIComponent(startupId)}`,
      type: 'account_onboarding',
    });

    return res.redirect(302, accountLink.url);
  } catch (error) {
    console.error('Stripe connect error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create Stripe connect link',
    });
  }
}
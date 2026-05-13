import type { BackendRequest, BackendResponse } from '../../lib/http.js';
import { getStripeClient } from '../../lib/stripe.js';
import { getDb } from '../../lib/firebase-admin.js';
import { encryptString } from '../../lib/crypto.js';

export default async function handler(req: BackendRequest, res: BackendResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const code = String(req.query.code || '').trim();
    const state = String(req.query.state || '').trim(); // we expect startupId in state
    if (!code) return res.status(400).json({ error: 'code is required' });
    if (!state) return res.status(400).json({ error: 'state (startupId) is required' });

    const stripe = getStripeClient();

    // Exchange the authorization code for an access token
    type OAuthTokenResult = {
      stripe_user_id?: string;
      access_token?: string;
      refresh_token?: string;
      scope?: string;
      token_type?: string;
      [key: string]: unknown;
    };

    const stripeWithOauth = stripe as unknown as {
      oauth: {
        token: (opts: { grant_type: string; code: string }) => Promise<OAuthTokenResult>;
      };
    };

    const tokenResponse = await stripeWithOauth.oauth.token({ grant_type: 'authorization_code', code });
    const { stripe_user_id, access_token, refresh_token, scope, token_type } = tokenResponse || {};

    if (!stripe_user_id) {
      return res.status(500).json({ error: 'No stripe_user_id returned' });
    }

    // store encrypted token record
    const db = getDb();
    const encrypted = access_token ? encryptString(String(access_token)) : undefined;
    const encryptedRefresh = refresh_token ? encryptString(String(refresh_token)) : undefined;

    await db.collection('stripe_tokens').doc(state).set({
      startupId: state,
      stripeAccountId: stripe_user_id,
      accessTokenEncrypted: encrypted || null,
      refreshTokenEncrypted: encryptedRefresh || null,
      scope: scope || null,
      tokenType: token_type || null,
      createdAt: new Date().toISOString(),
    });

    // also ensure startup doc has stripeAccountId
    await db.collection('startups').doc(state).set({ stripeAccountId: stripe_user_id, updatedAt: new Date().toISOString() }, { merge: true });

    // redirect back to frontend dashboard
    const frontend = process.env.FRONTEND_BASE_URL || 'https://proofround.com';
    return res.redirect(302, `${frontend}/dashboard?stripe_connected=1&startupId=${encodeURIComponent(state)}`);
  } catch (err) {
    console.error('OAuth callback error', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'OAuth exchange failed' });
  }
}

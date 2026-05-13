import { createPacketRequestRecord } from '../../lib/packets.js';
import { getBodyString } from '../../lib/http.js';
import { getStripeClient } from '../../lib/stripe.js';
import type { BackendRequest, BackendResponse } from '../../lib/http.js';

export default async function handler(req: BackendRequest, res: BackendResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startupId = String(req.method === 'POST' ? getBodyString(req.body, 'startupId') : req.query.startupId || '').trim();
    const startupName = String(req.method === 'POST' ? getBodyString(req.body, 'startupName') : req.query.startupName || '').trim() || undefined;
    const requesterEmail = String(req.method === 'POST' ? getBodyString(req.body, 'requesterEmail') : req.query.requesterEmail || '').trim() || undefined;
    const requesterName = String(req.method === 'POST' ? getBodyString(req.body, 'requesterName') : req.query.requesterName || '').trim() || undefined;
    const priceUSD = Number(process.env.VERIFIED_PACKET_PRICE_USD || req.query.priceUSD || 49);

    if (!startupId) {
      return res.status(400).json({ error: 'startupId is required' });
    }

    const request = await createPacketRequestRecord({
      startupId,
      startupName,
      requesterEmail,
      requesterName,
      priceUSD,
    });

    // If POST, create a Stripe Checkout session and return URL for redirect
    if (req.method === 'POST') {
      const stripe = getStripeClient();
      const frontend = process.env.FRONTEND_BASE_URL || 'https://proofround.com';

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Verified Packet: ${startupName || startupId}`,
                description: `Verified revenue packet for ${startupName || startupId}`,
              },
              unit_amount: Math.round(Number(priceUSD) * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${frontend}/thank-you?session_id={CHECKOUT_SESSION_ID}&requestId=${encodeURIComponent(request.id)}`,
        cancel_url: `${frontend}/startup?startupId=${encodeURIComponent(startupId)}`,
        metadata: {
          requestId: request.id,
          startupId,
        },
      });

      return res.status(200).json({ checkoutUrl: session.url, requestId: request.id });
    }

    if (req.headers.accept?.includes('text/html') || req.method === 'GET') {
      return res.status(200).send(`
        <html>
          <head><title>ProofRound request received</title></head>
          <body style="font-family: system-ui, sans-serif; padding: 40px; max-width: 720px; margin: 0 auto;">
            <h1>Request received</h1>
            <p>Your request for the verified ProofRound packet has been recorded.</p>
            <p>Request ID: <strong>${request.id}</strong></p>
            <p>Startup ID: <strong>${startupId}</strong></p>
            <p>Price: <strong>$${priceUSD}</strong></p>
          </body>
        </html>
      `);
    }

    return res.status(201).json({ success: true, requestId: request.id, startupId, priceUSD });
  } catch (error) {
    console.error('Packet request error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to record packet request',
    });
  }
}
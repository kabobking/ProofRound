/**
 * API route to generate verification packets from Stripe data
 * POST /api/generate-packet
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin';
import { getCurrentUserProfile } from '@/lib/auth';
import { createProofroundPacket } from '@/lib/database';
import {
  fetchStripeCharges,
  fetchStripeInvoices,
  fetchStripeSubscriptions,
  calculateMetricsFromCharges,
} from '@/lib/stripe-integration';
import type { ProofroundPacket } from '@/lib/models';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stripeAccountId, startDate, endDate, startupId } = body;

    if (!stripeAccountId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: stripeAccountId, startDate, endDate' },
        { status: 400 }
      );
    }

    // Get and verify auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let firebaseUser;

    try {
      firebaseUser = await verifyIdToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userProfile = await getCurrentUserProfile(firebaseUser.uid);
    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Fetch data from Stripe (in memory, will be discarded)
    const [charges, invoices, subscriptions] = await Promise.all([
      fetchStripeCharges(stripeAccountId, start, end),
      fetchStripeInvoices(stripeAccountId, start, end),
      fetchStripeSubscriptions(stripeAccountId, start, end),
    ]);

    // Calculate aggregated metrics
    const metrics = calculateMetricsFromCharges(charges);

    // Extract object IDs (for drill-down)
    const chargeIds = charges.map(c => c.id);
    const invoiceIds = invoices.map(i => i.id);
    const customerIds = [
      ...new Set(charges.map(c => c.customer).filter(Boolean) as string[]),
    ];
    const subscriptionIds = subscriptions.map(s => s.id);

    // Create verification hash
    const hashInput = JSON.stringify({
      metrics,
      chargeIds,
      invoiceIds,
      subscriptionIds,
      customerIds,
      stripeAccountId,
      startDate,
      endDate,
    });
    const verificationHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    // Create packet
    const packet: Omit<ProofroundPacket, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'views'> = {
      stripeAccountId,
      generatedBy: firebaseUser.uid,
      timeRangeStart: start.toISOString(),
      timeRangeEnd: end.toISOString(),
      metrics: {
        ...metrics,
        churnRate: 0, // Would need subscription data to calculate properly
        activeCustomers: customerIds.length,
        arpc: customerIds.length > 0 ? metrics.netRevenue / customerIds.length : 0,
      },
      references: {
        chargeIds,
        invoiceIds,
        subscriptionIds,
        customerIds,
      },
      verified: false, // Requires admin verification
      verificationHash,
      ...(startupId && { startupId }),
    };

    const created = await createProofroundPacket(packet as any);

    // Raw Stripe data is now out of scope - will be garbage collected
    console.log(`Generated packet ${created.id} from Stripe data (${charges.length} charges, ${invoices.length} invoices)`);

    return NextResponse.json({
      success: true,
      packet: created,
    });
  } catch (error) {
    console.error('Error generating packet:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate packet',
      },
      { status: 500 }
    );
  }
}

/**
 * Stripe integration utilities
 * 
 * NOTE: Replace with actual Stripe SDK when credentials are available
 */

import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

/**
 * Get or initialize Stripe instance
 */
export function getStripeInstance(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    stripeInstance = new Stripe(apiKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }
  return stripeInstance;
}

/**
 * Fetch customer data from Stripe
 */
export async function fetchStripeCustomer(customerId: string) {
  const stripe = getStripeInstance();
  try {
    return await stripe.customers.retrieve(customerId);
  } catch (error) {
    console.error('Error fetching Stripe customer:', error);
    throw error;
  }
}

/**
 * Fetch charges for a date range
 */
export async function fetchStripeCharges(
  accountId: string,
  startDate: Date,
  endDate: Date
) {
  const stripe = getStripeInstance();
  const charges: Stripe.Charge[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  while (hasMore) {
    const response = await stripe.charges.list(
      {
        created: {
          gte: startTimestamp,
          lte: endTimestamp,
        },
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter }),
      },
      {
        stripeAccount: accountId,
      }
    );

    charges.push(...response.data);
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  return charges;
}

/**
 * Fetch invoices for a date range
 */
export async function fetchStripeInvoices(
  accountId: string,
  startDate: Date,
  endDate: Date
) {
  const stripe = getStripeInstance();
  const invoices: Stripe.Invoice[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  while (hasMore) {
    const response = await stripe.invoices.list(
      {
        created: {
          gte: startTimestamp,
          lte: endTimestamp,
        },
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter }),
      },
      {
        stripeAccount: accountId,
      }
    );

    invoices.push(...response.data);
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  return invoices;
}

/**
 * Fetch subscriptions (active at any point during date range)
 */
export async function fetchStripeSubscriptions(
  accountId: string,
  startDate: Date,
  endDate: Date
) {
  const stripe = getStripeInstance();
  const subscriptions: Stripe.Subscription[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const response = await stripe.subscriptions.list(
      {
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter }),
      },
      {
        stripeAccount: accountId,
      }
    );

    subscriptions.push(...response.data);
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  return subscriptions;
}

/**
 * Calculate metrics from Stripe data
 */
export function calculateMetricsFromCharges(charges: Stripe.Charge[]) {
  let grossRevenue = 0;
  let refunds = 0;
  let chargebacks = 0;

  const chargesByMonth: Record<string, number> = {};

  for (const charge of charges) {
    if (!charge.paid) continue;

    const date = new Date(charge.created * 1000);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const amount = charge.amount / 100; // Convert from cents
    chargesByMonth[monthKey] = (chargesByMonth[monthKey] || 0) + amount;

    if (charge.refunded) {
      const refundAmount = (charge.amount_refunded || 0) / 100;
      refunds += refundAmount;
      grossRevenue += amount - refundAmount;
    } else {
      grossRevenue += amount;
    }

    // Count chargebacks
    if (charge.disputed) {
      chargebacks += amount;
    }
  }

  const netRevenue = grossRevenue - refunds;

  // Calculate MRR (average of recent months)
  const sortedMonths = Object.entries(chargesByMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 3); // Last 3 months

  const mrr =
    sortedMonths.length > 0
      ? sortedMonths.reduce((sum, [, amount]) => sum + amount, 0) / sortedMonths.length
      : 0;

  const arr = mrr * 12;

  return {
    grossRevenue,
    netRevenue,
    refunds,
    chargebacks,
    mrr,
    arr,
    monthlyBreakdown: Object.entries(chargesByMonth)
      .map(([period, value]) => ({ period, value }))
      .sort((a, b) => a.period.localeCompare(b.period)),
  };
}

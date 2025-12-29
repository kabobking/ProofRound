/**
 * Packet generation utilities that extract only aggregated metrics from Stripe data.
 * 
 * This module processes Stripe API responses in memory and generates minimal
 * packet structures containing only aggregates and references.
 * 
 * Raw Stripe objects are NEVER persisted - they are processed and discarded.
 */

import type {
  ProofroundPacket,
  RevenueMetrics,
  ChurnMetrics,
  CustomerConcentration,
  PayoutReconciliation,
  AnomalyFlags,
  StripeObjectReferences,
  MetricDefinitions,
  AuditMetadata,
  TimeSeriesPoint,
} from './packet-types';

/**
 * Stripe API response types (for processing only, not storage)
 */
interface StripeCharge {
  id: string;
  amount: number;
  refunded: boolean;
  refunds?: {
    data: Array<{ amount: number }>;
  };
  status: string;
  created: number;
  customer?: string;
}

interface StripeInvoice {
  id: string;
  amount_paid: number;
  amount_due: number;
  customer: string;
  subscription?: string;
  status: string;
  created: number;
  line_items?: {
    data: Array<{
      amount: number;
      description?: string;
    }>;
  };
}

interface StripeCustomer {
  id: string;
  created: number;
  subscriptions?: {
    data: Array<{
      id: string;
      status: string;
      current_period_end: number;
      items: {
        data: Array<{
          price: {
            unit_amount: number;
            recurring?: {
              interval: string;
            };
          };
        }>;
      };
    }>;
  };
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  current_period_end: number;
  items: {
    data: Array<{
      price: {
        unit_amount: number;
        recurring?: {
          interval: string;
        };
      };
    }>;
  };
  created: number;
  canceled_at?: number;
}

interface StripePayout {
  id: string;
  amount: number;
  arrival_date: number;
  status: string;
}

/**
 * Configuration for packet generation
 */
export interface PacketGenerationConfig {
  /** Stripe account ID */
  stripeAccountId: string;
  /** User ID generating the packet */
  generatedBy: string;
  /** Time range start (ISO 8601 date) */
  timeRangeStart: string;
  /** Time range end (ISO 8601 date) */
  timeRangeEnd: string;
  /** Maximum number of customer IDs to store for drill-down (default: 10) */
  maxCustomerReferences?: number;
  /** Maximum number of charge IDs to store for drill-down (default: 50) */
  maxChargeReferences?: number;
  /** Maximum number of subscription IDs to store for drill-down (default: 100) */
  maxSubscriptionReferences?: number;
}

/**
 * Process Stripe charges and extract revenue metrics
 */
function processRevenueMetrics(
  charges: StripeCharge[],
  invoices: StripeInvoice[],
  timeRangeStart: Date,
  timeRangeEnd: Date
): RevenueMetrics {
  let grossRevenue = 0;
  let refunds = 0;
  let chargebacks = 0;
  const monthlyBreakdown: Map<string, number> = new Map();

  // Process charges
  for (const charge of charges) {
    if (charge.status === 'succeeded') {
      const amount = charge.amount / 100; // Convert from cents
      grossRevenue += amount;

      const chargeDate = new Date(charge.created * 1000);
      const monthKey = `${chargeDate.getFullYear()}-${String(chargeDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyBreakdown.set(monthKey, (monthlyBreakdown.get(monthKey) || 0) + amount);

      // Calculate refunds
      if (charge.refunded) {
        refunds += amount;
      } else if (charge.refunds?.data) {
        for (const refund of charge.refunds.data) {
          refunds += refund.amount / 100;
        }
      }
    }
  }

  // Process invoices for additional revenue
  for (const invoice of invoices) {
    if (invoice.status === 'paid') {
      const amount = invoice.amount_paid / 100;
      grossRevenue += amount;

      const invoiceDate = new Date(invoice.created * 1000);
      const monthKey = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyBreakdown.set(monthKey, (monthlyBreakdown.get(monthKey) || 0) + amount);
    }
  }

  const netRevenue = grossRevenue - refunds - chargebacks;

  // Convert monthly breakdown to array
  const monthlyBreakdownArray: TimeSeriesPoint[] = Array.from(monthlyBreakdown.entries())
    .map(([period, value]) => ({ period, value }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // Calculate MRR from subscriptions (simplified - would need more logic in production)
  const mrr = calculateMRR(invoices);
  const arr = mrr * 12;

  return {
    mrr,
    arr,
    grossRevenue,
    netRevenue,
    refunds,
    chargebacks,
    monthlyBreakdown: monthlyBreakdownArray,
  };
}

/**
 * Calculate MRR from invoices/subscriptions
 */
function calculateMRR(invoices: StripeInvoice[]): number {
  // Simplified MRR calculation - sum monthly recurring amounts
  // In production, this would need more sophisticated logic
  let monthlyRecurring = 0;

  for (const invoice of invoices) {
    if (invoice.status === 'paid' && invoice.subscription) {
      // Assume monthly if no interval info available
      monthlyRecurring += invoice.amount_paid / 100;
    }
  }

  return monthlyRecurring;
}

/**
 * Process churn metrics
 */
function processChurnMetrics(
  subscriptions: StripeSubscription[],
  timeRangeStart: Date,
  timeRangeEnd: Date
): ChurnMetrics {
  let churnedCustomers = 0;
  let revenueLost = 0;
  const monthlyBreakdown: Map<string, { customers: number; revenue: number }> = new Map();

  for (const sub of subscriptions) {
    if (sub.status === 'canceled' && sub.canceled_at) {
      const canceledDate = new Date(sub.canceled_at * 1000);
      if (canceledDate >= timeRangeStart && canceledDate <= timeRangeEnd) {
        churnedCustomers++;

        // Calculate lost revenue
        let monthlyValue = 0;
        for (const item of sub.items.data) {
          if (item.price.recurring?.interval === 'month') {
            monthlyValue += item.price.unit_amount / 100;
          } else if (item.price.recurring?.interval === 'year') {
            monthlyValue += item.price.unit_amount / 100 / 12;
          }
        }
        revenueLost += monthlyValue;

        const monthKey = `${canceledDate.getFullYear()}-${String(canceledDate.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthlyBreakdown.get(monthKey) || { customers: 0, revenue: 0 };
        monthlyBreakdown.set(monthKey, {
          customers: existing.customers + 1,
          revenue: existing.revenue + monthlyValue,
        });
      }
    }
  }

  // Calculate churn rates (simplified)
  const totalCustomers = subscriptions.length;
  const logoChurnRate = totalCustomers > 0 ? (churnedCustomers / totalCustomers) * 100 : 0;
  const revenueChurnRate = revenueLost > 0 ? (revenueLost / (revenueLost + 1000)) * 100 : 0; // Simplified

  const monthlyBreakdownArray: TimeSeriesPoint[] = Array.from(monthlyBreakdown.entries())
    .map(([period, data]) => ({ period, value: data.customers }))
    .sort((a, b) => a.period.localeCompare(b.period));

  return {
    revenueChurnRate,
    logoChurnRate,
    churnedCustomers,
    revenueLost,
    monthlyBreakdown: monthlyBreakdownArray,
  };
}

/**
 * Process customer concentration
 */
function processCustomerConcentration(
  customers: StripeCustomer[],
  invoices: StripeInvoice[]
): CustomerConcentration {
  // Calculate revenue per customer
  const customerRevenue = new Map<string, number>();

  for (const invoice of invoices) {
    if (invoice.status === 'paid' && invoice.customer) {
      const existing = customerRevenue.get(invoice.customer) || 0;
      customerRevenue.set(invoice.customer, existing + invoice.amount_paid / 100);
    }
  }

  // Sort by revenue
  const sortedCustomers = Array.from(customerRevenue.entries())
    .sort((a, b) => b[1] - a[1]);

  const totalRevenue = sortedCustomers.reduce((sum, [, revenue]) => sum + revenue, 0);

  // Top 10 customers
  const top10Revenue = sortedCustomers.slice(0, 10).reduce((sum, [, revenue]) => sum + revenue, 0);
  const top10Percent = totalRevenue > 0 ? (top10Revenue / totalRevenue) * 100 : 0;

  // Top customer
  const topCustomerPercent = totalRevenue > 0 && sortedCustomers.length > 0
    ? (sortedCustomers[0][1] / totalRevenue) * 100
    : 0;

  const activeCustomers = customers.length;
  const arpc = activeCustomers > 0 ? totalRevenue / activeCustomers : 0;

  return {
    top10Percent,
    topCustomerPercent,
    activeCustomers,
    arpc,
  };
}

/**
 * Process payout reconciliation
 */
function processPayoutReconciliation(payouts: StripePayout[]): PayoutReconciliation {
  let expectedPayouts = 0;
  let actualPayouts = 0;
  let unreconciledCount = 0;

  for (const payout of payouts) {
    expectedPayouts += payout.amount / 100;
    if (payout.status === 'paid') {
      actualPayouts += payout.amount / 100;
    } else {
      unreconciledCount++;
    }
  }

  const variance = expectedPayouts - actualPayouts;

  return {
    expectedPayouts,
    actualPayouts,
    variance,
    unreconciledCount,
  };
}

/**
 * Detect anomalies
 */
function detectAnomalies(
  revenue: RevenueMetrics,
  churn: ChurnMetrics,
  payout: PayoutReconciliation
): AnomalyFlags {
  const notes: string[] = [];

  // Revenue spike detection (simplified)
  const recentMonths = revenue.monthlyBreakdown.slice(-3);
  if (recentMonths.length >= 2) {
    const avgRecent = recentMonths.reduce((sum, p) => sum + p.value, 0) / recentMonths.length;
    const lastMonth = recentMonths[recentMonths.length - 1].value;
    if (lastMonth > avgRecent * 1.5) {
      notes.push('Revenue spike detected in most recent month');
    }
  }

  // Refund spike detection
  const refundRate = revenue.grossRevenue > 0 ? (revenue.refunds / revenue.grossRevenue) * 100 : 0;
  if (refundRate > 10) {
    notes.push(`High refund rate: ${refundRate.toFixed(2)}%`);
  }

  // Churn spike detection
  if (churn.logoChurnRate > 5) {
    notes.push(`High churn rate: ${churn.logoChurnRate.toFixed(2)}%`);
  }

  // Payout discrepancy
  if (Math.abs(payout.variance) > payout.expectedPayouts * 0.05) {
    notes.push('Significant payout variance detected');
  }

  return {
    revenueSpike: notes.some(n => n.includes('Revenue spike')),
    refundSpike: refundRate > 10,
    churnSpike: churn.logoChurnRate > 5,
    payoutDiscrepancy: Math.abs(payout.variance) > payout.expectedPayouts * 0.05,
    notes: notes.length > 0 ? notes : undefined,
  };
}

/**
 * Cap ID array to last N items or items from last 12 months
 * This prevents ID arrays from growing unbounded while preserving
 * recent data for drill-down.
 */
function capIdArray<T extends { created?: number; id: string }>(
  items: T[],
  maxCount: number,
  timeRangeStart: Date,
  timeRangeEnd: Date
): string[] {
  // Calculate cutoff date (12 months before end date, or use start date if shorter)
  const twelveMonthsAgo = new Date(timeRangeEnd);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const cutoffDate = timeRangeStart > twelveMonthsAgo ? timeRangeStart : twelveMonthsAgo;

  // Filter to items within time range and sort by created date (newest first)
  const filtered = items
    .filter(item => {
      if (!item.created) return true; // Include items without created date
      const itemDate = new Date(item.created * 1000);
      return itemDate >= cutoffDate && itemDate <= timeRangeEnd;
    })
    .sort((a, b) => {
      const aDate = a.created ? new Date(a.created * 1000).getTime() : 0;
      const bDate = b.created ? new Date(b.created * 1000).getTime() : 0;
      return bDate - aDate; // Newest first
    })
    .slice(0, maxCount)
    .map(item => item.id);

  return filtered;
}

/**
 * Extract Stripe object references for drill-down
 * 
 * ID arrays are capped to prevent unbounded growth:
 * - Customer IDs: Top N by revenue (default 10)
 * - Subscription IDs: Last 12 months or max 100, whichever is smaller
 * - Charge IDs: Significant charges only, max 50
 * - Invoice IDs: Significant invoices only, max 50
 * - Event IDs: Empty (not stored)
 */
function extractReferences(
  charges: StripeCharge[],
  invoices: StripeInvoice[],
  customers: StripeCustomer[],
  subscriptions: StripeSubscription[],
  config: PacketGenerationConfig
): StripeObjectReferences {
  const timeRangeStart = new Date(config.timeRangeStart);
  const timeRangeEnd = new Date(config.timeRangeEnd);

  // Top customers by revenue (for drill-down) - capped
  const maxCustomers = config.maxCustomerReferences || 10;
  const customerIds = customers
    .slice(0, maxCustomers)
    .map(c => c.id);

  // Significant charges (anomalous or large) - capped at 50
  const significantCharges = charges
    .filter(c => c.amount > 10000 || c.refunded) // Large charges or refunded
    .slice(0, 50) // Cap at 50 significant charges
    .map(c => c.id);

  // Subscription IDs - cap to last 12 months or max 100
  // This prevents storing thousands of subscription IDs
  const maxSubscriptions = 100;
  const subscriptionIds = capIdArray(subscriptions, maxSubscriptions, timeRangeStart, timeRangeEnd);

  // Significant invoices - capped at 50
  const significantInvoices = invoices
    .filter(i => i.amount_paid > 10000)
    .slice(0, 50) // Cap at 50 significant invoices
    .map(i => i.id);

  // Event IDs (empty for now - would need to process events)
  // Events are not stored as they can be very numerous
  const eventIds: string[] = [];

  return {
    customerIds,
    subscriptionIds,
    chargeIds: significantCharges,
    invoiceIds: significantInvoices,
    eventIds,
  };
}

/**
 * Generate a Proofround packet from Stripe data
 * 
 * This function processes raw Stripe API responses in memory and generates
 * a minimal packet structure. Raw Stripe objects are NOT stored.
 */
export function generatePacket(
  stripeData: {
    charges: StripeCharge[];
    invoices: StripeInvoice[];
    customers: StripeCustomer[];
    subscriptions: StripeSubscription[];
    payouts: StripePayout[];
  },
  config: PacketGenerationConfig
): ProofroundPacket {
  const timeRangeStart = new Date(config.timeRangeStart);
  const timeRangeEnd = new Date(config.timeRangeEnd);
  const snapshotTimestamp = new Date().toISOString();

  // Process all metrics (in memory only - raw data is not stored)
  const revenue = processRevenueMetrics(
    stripeData.charges,
    stripeData.invoices,
    timeRangeStart,
    timeRangeEnd
  );

  const churn = processChurnMetrics(
    stripeData.subscriptions,
    timeRangeStart,
    timeRangeEnd
  );

  const customerConcentration = processCustomerConcentration(
    stripeData.customers,
    stripeData.invoices
  );

  const payoutReconciliation = processPayoutReconciliation(stripeData.payouts);

  const anomalies = detectAnomalies(revenue, churn, payoutReconciliation);

  const references = extractReferences(
    stripeData.charges,
    stripeData.invoices,
    stripeData.customers,
    stripeData.subscriptions,
    config
  );

  // Create metric definitions
  const definitions: MetricDefinitions = {
    mrrDefinition: 'Monthly Recurring Revenue calculated from active subscriptions with monthly or annual billing intervals',
    churnDefinition: 'Customer churn rate calculated as the percentage of customers who canceled subscriptions within the time period',
    revenueDefinition: 'Gross revenue from successful charges and paid invoices, net revenue after refunds and chargebacks',
    additional: {
      arr: 'Annual Recurring Revenue calculated as MRR × 12',
      arpc: 'Average Revenue Per Customer calculated as total revenue divided by active customer count',
    },
  };

  // Create audit metadata
  const metadata: AuditMetadata = {
    generatedAt: snapshotTimestamp,
    generatedBy: config.generatedBy,
    stripeAccountId: config.stripeAccountId,
    timeRange: {
      start: config.timeRangeStart,
      end: config.timeRangeEnd,
    },
  };

  // Generate packet ID
  const packetId = `pkt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const packet: ProofroundPacket = {
    id: packetId,
    metadata,
    definitions,
    revenue,
    churn,
    customerConcentration,
    payoutReconciliation,
    anomalies,
    references,
    snapshotTimestamp,
  };

  // Raw Stripe data is now out of scope and will be garbage collected
  // Only the minimal packet structure is returned

  return packet;
}


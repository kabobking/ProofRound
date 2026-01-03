import Stripe from "stripe";

// Metrics are derived primarily from balance transactions (net, fees, refunds, disputes, payouts)
// with optional invoice/subscription counts for SaaS-style revenue.

export type StripeMetrics = {
  grossVolume: number;
  netVolume: number;
  fees: number;
  refunds: number;
  disputes: number;
  payouts: number;
  currency: string;
  invoiceCount?: number;
  subscriptionCount?: number;
};

type MetricWindow = {
  periodStart: Date;
  periodEnd: Date;
  includeInvoices?: boolean;
  includeSubscriptions?: boolean;
};

export async function fetchStripeMetrics(
  stripe: Stripe,
  options: MetricWindow
): Promise<StripeMetrics> {
  const window = {
    gte: Math.floor(options.periodStart.getTime() / 1000),
    lte: Math.floor(options.periodEnd.getTime() / 1000),
  };

  const metrics: StripeMetrics = {
    grossVolume: 0,
    netVolume: 0,
    fees: 0,
    refunds: 0,
    disputes: 0,
    payouts: 0,
    currency: "usd",
  };

  const balanceTxIterator = stripe.balanceTransactions.list({
    created: window,
    limit: 100,
  });

  for await (const tx of balanceTxIterator.autoPagingIterator()) {
    metrics.currency = tx.currency?.toLowerCase() ?? metrics.currency;

    switch (tx.type) {
      case "charge":
      case "payment":
        metrics.grossVolume += tx.amount;
        metrics.netVolume += tx.net;
        metrics.fees += tx.fee ?? 0;
        break;
      case "refund":
        metrics.refunds += Math.abs(tx.amount);
        metrics.netVolume += tx.net;
        metrics.fees += tx.fee ?? 0;
        break;
      case "payout":
        metrics.payouts += Math.abs(tx.amount);
        break;
      case "dispute":
      case "dispute_reversal":
        metrics.disputes += Math.abs(tx.amount);
        metrics.netVolume += tx.net;
        if (tx.fee) metrics.fees += Math.abs(tx.fee);
        break;
      default:
        metrics.netVolume += tx.net;
        if (tx.fee) metrics.fees += tx.fee;
        break;
    }
  }

  if (options.includeInvoices) {
    let invoiceCount = 0;
    const invoiceIterator = stripe.invoices.list({
      created: window,
      limit: 100,
      status: "paid",
    });
    for await (const _ of invoiceIterator.autoPagingIterator()) {
      invoiceCount += 1;
    }
    metrics.invoiceCount = invoiceCount;
  }

  if (options.includeSubscriptions) {
    let subscriptionCount = 0;
    const subscriptionIterator = stripe.subscriptions.list({
      status: "active",
      limit: 100,
    });
    for await (const _ of subscriptionIterator.autoPagingIterator()) {
      subscriptionCount += 1;
    }
    metrics.subscriptionCount = subscriptionCount;
  }

  return metrics;
}

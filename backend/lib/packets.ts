import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { getDb } from './firebase-admin';
import { getStripeClient } from './stripe';
import type Stripe from 'stripe';

type StartupDoc = {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  founderId: string;
  founderEmail: string;
  stripeAccountId?: string;
  industry?: string;
  stage?: string;
  location?: string;
};

type PacketMetrics = {
  mrr: number;
  arr: number;
  grossRevenue: number;
  netRevenue: number;
  refunds: number;
  chargebacks: number;
  monthlyBreakdown: Array<{ period: string; value: number }>;
  churnRate: number;
  activeCustomers: number;
  arpc: number;
};

type PacketRecord = {
  id: string;
  startupId?: string;
  stripeAccountId: string;
  generatedBy: string;
  timeRangeStart: string;
  timeRangeEnd: string;
  metrics: PacketMetrics;
  references: {
    customerIds: string[];
    chargeIds: string[];
    invoiceIds: string[];
    subscriptionIds: string[];
  };
  verified: boolean;
  verificationHash: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  views: number;
};

async function fetchAllCharges(stripeAccountId: string, startTs: number, endTs: number) {
  const stripe = getStripeClient();
  const charges = [] as Stripe.Charge[];
  let startingAfter: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await stripe.charges.list(
      {
        limit: 100,
        created: { gte: startTs, lte: endTs },
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      },
      { stripeAccount: stripeAccountId }
    );

    charges.push(...response.data);
    hasMore = response.has_more;
    startingAfter = response.data.at(-1)?.id;
  }

  return charges;
}

async function fetchAllInvoices(stripeAccountId: string, startTs: number, endTs: number) {
  const stripe = getStripeClient();
  const invoices = [] as Stripe.Invoice[];
  let startingAfter: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await stripe.invoices.list(
      {
        limit: 100,
        created: { gte: startTs, lte: endTs },
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      },
      { stripeAccount: stripeAccountId }
    );

    invoices.push(...response.data);
    hasMore = response.has_more;
    startingAfter = response.data.at(-1)?.id;
  }

  return invoices;
}

async function fetchAllSubscriptions(stripeAccountId: string) {
  const stripe = getStripeClient();
  const subscriptions = [] as Stripe.Subscription[];
  let startingAfter: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await stripe.subscriptions.list(
      {
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      },
      { stripeAccount: stripeAccountId }
    );

    subscriptions.push(...response.data);
    hasMore = response.has_more;
    startingAfter = response.data.at(-1)?.id;
  }

  return subscriptions;
}

function buildMetrics(charges: Stripe.Charge[], invoices: Stripe.Invoice[], subscriptions: Stripe.Subscription[]): PacketMetrics {
  let grossRevenue = 0;
  let refunds = 0;
  let chargebacks = 0;
  const monthlyBreakdown = new Map<string, number>();
  const activeCustomers = new Set<string>();

  for (const charge of charges) {
    if (charge.status !== 'succeeded' || !charge.created) continue;

    const amount = charge.amount / 100;
    grossRevenue += amount;
    if (charge.customer) {
      activeCustomers.add(String(charge.customer));
    }

    const monthKey = new Date(charge.created * 1000).toISOString().slice(0, 7);
    monthlyBreakdown.set(monthKey, (monthlyBreakdown.get(monthKey) || 0) + amount);

    if (charge.refunded) {
      refunds += amount;
    }

    if (charge.disputed) {
      chargebacks += amount;
    }
  }

  for (const invoice of invoices) {
    if (invoice.status !== 'paid' || !invoice.created) continue;

    const amount = invoice.amount_paid / 100;
    grossRevenue += amount;
    if (invoice.customer) {
      activeCustomers.add(String(invoice.customer));
    }

    const monthKey = new Date(invoice.created * 1000).toISOString().slice(0, 7);
    monthlyBreakdown.set(monthKey, (monthlyBreakdown.get(monthKey) || 0) + amount);
  }

  let recurringMonthly = 0;
  let churned = 0;

  for (const subscription of subscriptions) {
    if (subscription.status === 'canceled' && subscription.canceled_at) {
      churned += 1;
    }

    for (const item of subscription.items.data) {
      const unitAmount = item.price.unit_amount || 0;
      const interval = item.price.recurring?.interval;
      if (interval === 'month') {
        recurringMonthly += unitAmount / 100;
      } else if (interval === 'year') {
        recurringMonthly += unitAmount / 1200;
      }
    }
  }

  const mrr = recurringMonthly;
  const arr = mrr * 12;
  const activeCustomerCount = activeCustomers.size;

  return {
    mrr,
    arr,
    grossRevenue,
    netRevenue: grossRevenue - refunds - chargebacks,
    refunds,
    chargebacks,
    monthlyBreakdown: Array.from(monthlyBreakdown.entries())
      .map(([period, value]) => ({ period, value }))
      .sort((left, right) => left.period.localeCompare(right.period)),
    churnRate: subscriptions.length > 0 ? (churned / subscriptions.length) * 100 : 0,
    activeCustomers: activeCustomerCount,
    arpc: activeCustomerCount > 0 ? grossRevenue / activeCustomerCount : 0,
  };
}

function buildReferences(charges: Stripe.Charge[], invoices: Stripe.Invoice[], subscriptions: Stripe.Subscription[]) {
  const customerIds = Array.from(
    new Set([
      ...charges.map(charge => (typeof charge.customer === 'string' ? charge.customer : null)),
      ...invoices.map(invoice => (typeof invoice.customer === 'string' ? invoice.customer : null)),
    ].filter(Boolean) as string[])
  ).slice(0, 10);

  return {
    customerIds,
    chargeIds: charges.filter(charge => charge.amount > 10000 || charge.disputed).slice(0, 50).map(charge => charge.id),
    invoiceIds: invoices.filter(invoice => invoice.amount_paid > 10000).slice(0, 50).map(invoice => invoice.id),
    subscriptionIds: subscriptions.slice(0, 100).map(subscription => subscription.id),
  };
}

export async function createVerifiedPacket(startupId: string, range?: { start?: string; end?: string }) {
  const db = getDb();
  const startupSnap = await db.collection('startups').doc(startupId).get();
  if (!startupSnap.exists) {
    throw new Error(`Startup not found: ${startupId}`);
  }

  const startup = { id: startupSnap.id, ...startupSnap.data() } as StartupDoc;
  if (!startup.stripeAccountId) {
    throw new Error('Stripe is not connected for this startup yet');
  }

  const endDate = range?.end ? new Date(range.end) : new Date();
  const startDate = range?.start ? new Date(range.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const startTs = Math.floor(startDate.getTime() / 1000);
  const endTs = Math.floor(endDate.getTime() / 1000);

  const [charges, invoices, subscriptions] = await Promise.all([
    fetchAllCharges(startup.stripeAccountId, startTs, endTs),
    fetchAllInvoices(startup.stripeAccountId, startTs, endTs),
    fetchAllSubscriptions(startup.stripeAccountId),
  ]);

  const metrics = buildMetrics(charges, invoices, subscriptions);
  const references = buildReferences(charges, invoices, subscriptions);
  const createdAt = new Date().toISOString();
  const packetId = `pkt_${startupId}_${Date.now()}`;
  const packetData = {
    id: packetId,
    startupId,
    stripeAccountId: startup.stripeAccountId,
    generatedBy: startup.founderId,
    timeRangeStart: startDate.toISOString(),
    timeRangeEnd: endDate.toISOString(),
    metrics,
    references,
    verified: true,
    verificationHash: crypto
      .createHash('sha256')
      .update(JSON.stringify({ startupId, stripeAccountId: startup.stripeAccountId, metrics, references, createdAt }))
      .digest('hex'),
    createdAt,
    updatedAt: createdAt,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    views: 0,
  };

  await db.collection('proofround_packets').doc(packetId).set(packetData);

  return { startup, packet: packetData as PacketRecord };
}

export async function renderPacketPdf(startup: StartupDoc, packet: PacketRecord): Promise<Buffer> {
  const pdf = new PDFDocument({ size: 'A4', margin: 48 });
  const chunks: Buffer[] = [];

  const output = new Promise<Buffer>((resolve, reject) => {
    pdf.on('data', chunk => chunks.push(Buffer.from(chunk)));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
  });

  pdf.fontSize(22).fillColor('#0f172a').text('ProofRound Verified Revenue Packet', { align: 'center' });
  pdf.moveDown(0.5);
  pdf.fontSize(12).fillColor('#475569').text('Verified by ProofRound', { align: 'center' });
  pdf.moveDown(1);

  pdf.fontSize(16).fillColor('#0f172a').text(startup.name);
  if (startup.tagline) {
    pdf.fontSize(11).fillColor('#475569').text(startup.tagline);
  }
  pdf.moveDown(0.75);

  const rows: Array<[string, string]> = [
    ['Time range', `${packet.timeRangeStart} to ${packet.timeRangeEnd}`],
    ['MRR', `$${packet.metrics.mrr.toFixed(2)}`],
    ['ARR', `$${packet.metrics.arr.toFixed(2)}`],
    ['Gross revenue', `$${packet.metrics.grossRevenue.toFixed(2)}`],
    ['Net revenue', `$${packet.metrics.netRevenue.toFixed(2)}`],
    ['Refunds', `$${packet.metrics.refunds.toFixed(2)}`],
    ['Chargebacks', `$${packet.metrics.chargebacks.toFixed(2)}`],
    ['Churn rate', `${packet.metrics.churnRate.toFixed(2)}%`],
    ['Active customers', String(packet.metrics.activeCustomers)],
    ['ARPC', `$${packet.metrics.arpc.toFixed(2)}`],
  ];

  pdf.fontSize(12).fillColor('#0f172a');
  for (const [label, value] of rows) {
    pdf.text(`${label}: ${value}`);
  }

  pdf.moveDown(0.75);
  pdf.fontSize(12).fillColor('#0f172a').text('Monthly breakdown');
  for (const point of packet.metrics.monthlyBreakdown) {
    pdf.fontSize(10).fillColor('#475569').text(`${point.period}: $${point.value.toFixed(2)}`);
  }

  pdf.moveDown(0.75);
  pdf.fontSize(12).fillColor('#0f172a').text(`Verification hash: ${packet.verificationHash}`);
  pdf.fontSize(10).fillColor('#64748b').text(`Generated at ${packet.createdAt}`);
  pdf.text('This packet is generated from Stripe-backed data and verified by ProofRound.');
  pdf.end();

  return output;
}

export async function createPacketRequestRecord(data: { startupId: string; startupName?: string; requesterEmail?: string; requesterName?: string; priceUSD: number }) {
  const db = getDb();
  const createdAt = new Date().toISOString();
  const id = `req_${data.startupId}_${Date.now()}`;

  await db.collection('packet_requests').doc(id).set({
    id,
    ...data,
    status: 'requested',
    createdAt,
    updatedAt: createdAt,
  });

  return { id, createdAt };
}

export async function ensureConnectedStripeAccount(startupId: string) {
  const db = getDb();
  const stripe = getStripeClient();
  const startupRef = db.collection('startups').doc(startupId);
  const startupSnap = await startupRef.get();

  if (!startupSnap.exists) {
    throw new Error(`Startup not found: ${startupId}`);
  }

  const startup = { id: startupSnap.id, ...startupSnap.data() } as StartupDoc;
  if (startup.stripeAccountId) {
    return startup;
  }

  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email: startup.founderEmail,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  await startupRef.set(
    {
      stripeAccountId: account.id,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return { ...startup, stripeAccountId: account.id };
}

export function getFrontendBaseUrl() {
  return process.env.FRONTEND_BASE_URL || 'https://proofround.com';
}

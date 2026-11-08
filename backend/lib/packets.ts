import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { getDb } from './firebase-admin.js';
import { getStripeClient } from './stripe.js';
import { generatePdfWithBrowserless, getBrowserlessConfig } from './browserless.js';
import { generateInvestorSnapshotHtml } from './report-template.js';
import type Stripe from 'stripe';

export { generateInvestorSnapshotHtml } from './report-template.js';
export { generatePdfWithBrowserless, getBrowserlessConfig } from './browserless.js';

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
  monthlyBreakdown: Array<{
    period: string;
    value: number;
    monthKey?: string;
    grossRevenue?: number;
    refunds?: number;
    netRevenue?: number;
    transactions?: number;
  }>;
  churnRate: number;
  activeCustomers: number;
  arpc: number;
  subscriptionCount: number;
  activeSubscriptions: number;
  successfulPaymentsCount: number;
  failedPaymentsCount: number;
  totalTransactionsCount: number;
  refundCount: number;
  disputeCount: number;
  netRealizationRatio: number;
  refundRate: number;
  disputeRate: number;
  repeatCustomerRate: number | null;
  paymentMethods: Array<{ type: string; count: number; volume: number }>;
  growth: {
    oneMonth: number | null;
    threeMonth: number | null;
    sixMonth: number | null;
    commentary: string;
  };
  customerConcentration: {
    largestCustomerShare: number | null;
    topFiveCustomerShare: number | null;
    largestCustomerRevenue: number | null;
    topFiveCustomerRevenue: number | null;
    topThreeCustomerShare?: number | null;
    topThreeCustomerRevenue?: number | null;
    topCustomersList?: Array<{ label: string; revenue: number; share: number }>;
    available: boolean;
  };
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

type PdfFontSelection = {
  regular: string;
  bold: string;
};

function resolveFontFile(baseDirs: string[], names: string[]) {
  for (const dir of baseDirs) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function configurePdfFonts(pdf: PDFKit.PDFDocument): PdfFontSelection {
  const fontDirs = [
    path.resolve(process.cwd(), 'backend', 'assets', 'fonts'),
    path.resolve(process.cwd(), 'assets', 'fonts'),
    path.resolve(__dirname, '../assets/fonts'),
    path.resolve(__dirname, '../../backend/assets/fonts'),
  ];

  const regularFile = resolveFontFile(fontDirs, [
    'Geist-Regular.ttf',
    'Geist-Regular.otf',
    'Geist-Variable.ttf',
  ]);
  const boldFile = resolveFontFile(fontDirs, [
    'Geist-SemiBold.ttf',
    'Geist-SemiBold.otf',
    'Geist-Bold.ttf',
    'Geist-Bold.otf',
  ]);

  if (regularFile && boldFile) {
    pdf.registerFont('ProofroundGeistRegular', regularFile);
    pdf.registerFont('ProofroundGeistBold', boldFile);
    return {
      regular: 'ProofroundGeistRegular',
      bold: 'ProofroundGeistBold',
    };
  }

  return {
    regular: 'Helvetica',
    bold: 'Helvetica-Bold',
  };
}

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
  let refundCount = 0;
  let disputeCount = 0;
  let successfulPaymentsCount = 0;
  let failedPaymentsCount = 0;

  const monthlyStats = new Map<string, { grossRevenue: number; refunds: number; transactions: number }>();
  const activeCustomers = new Set<string>();
  const revenueByCustomer = new Map<string, { revenue: number; observations: number }>();
  const paymentMethodsMap = new Map<string, { count: number; volume: number }>();

  // Track invoice IDs and charge IDs to avoid double counting charges created for invoices
  const processedChargeIds = new Set<string>();

  const trackCustomerRevenue = (customerId: string | null | undefined, amount: number) => {
    if (!customerId) {
      return;
    }

    const current = revenueByCustomer.get(customerId) ?? { revenue: 0, observations: 0 };
    current.revenue += amount;
    current.observations += 1;
    revenueByCustomer.set(customerId, current);
  };

  const trackMonthly = (monthKey: string, amount: number, isRefund = false) => {
    const cur = monthlyStats.get(monthKey) ?? { grossRevenue: 0, refunds: 0, transactions: 0 };
    if (isRefund) {
      cur.refunds += amount;
    } else {
      cur.grossRevenue += amount;
      cur.transactions += 1;
    }
    monthlyStats.set(monthKey, cur);
  };

  for (const charge of charges) {
    if (charge.status === 'failed') {
      failedPaymentsCount += 1;
    }

    if (charge.status !== 'succeeded' || !charge.created) continue;

    processedChargeIds.add(charge.id);
    successfulPaymentsCount += 1;

    const amount = charge.amount / 100;
    grossRevenue += amount;
    if (charge.customer) {
      const customerId = String(charge.customer);
      activeCustomers.add(customerId);
      trackCustomerRevenue(customerId, amount);
    }

    const monthKey = new Date(charge.created * 1000).toISOString().slice(0, 7);
    trackMonthly(monthKey, amount, false);

    // Track payment method channels
    const rawType = (charge.payment_method_details as { type?: string } | null)?.type || (typeof charge.source === 'object' && charge.source && 'object' in charge.source ? String(charge.source.object) : 'card');
    const methodLabel = rawType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    const existingMethod = paymentMethodsMap.get(methodLabel) ?? { count: 0, volume: 0 };
    existingMethod.count += 1;
    existingMethod.volume += amount;
    paymentMethodsMap.set(methodLabel, existingMethod);

    if (charge.refunded || (charge.amount_refunded && charge.amount_refunded > 0)) {
      const refundAmt = charge.amount_refunded ? charge.amount_refunded / 100 : amount;
      refunds += refundAmt;
      refundCount += 1;
      trackMonthly(monthKey, refundAmt, true);
    }

    if (charge.disputed) {
      chargebacks += amount;
      disputeCount += 1;
    }
  }

  for (const invoice of invoices) {
    if (invoice.status === 'uncollectible') {
      failedPaymentsCount += 1;
    }

    if (invoice.status !== 'paid' || !invoice.created) continue;

    // Skip if invoice charge was already counted in charges to prevent double counting
    const chargeId = (invoice as { charge?: string | null }).charge;
    if (chargeId && processedChargeIds.has(String(chargeId))) {
      continue;
    }

    const amount = invoice.amount_paid / 100;
    grossRevenue += amount;
    successfulPaymentsCount += 1;

    if (invoice.customer) {
      const customerId = String(invoice.customer);
      activeCustomers.add(customerId);
      trackCustomerRevenue(customerId, amount);
    }

    const monthKey = new Date(invoice.created * 1000).toISOString().slice(0, 7);
    trackMonthly(monthKey, amount, false);

    const invoiceMethod = 'Invoice / Direct';
    const existingMethod = paymentMethodsMap.get(invoiceMethod) ?? { count: 0, volume: 0 };
    existingMethod.count += 1;
    existingMethod.volume += amount;
    paymentMethodsMap.set(invoiceMethod, existingMethod);
  }

  let recurringMonthly = 0;
  let churned = 0;
  let activeSubscriptions = 0;

  for (const subscription of subscriptions) {
    if (subscription.status === 'canceled' && subscription.canceled_at) {
      churned += 1;
    }

    if (subscription.status === 'active' || subscription.status === 'trialing') {
      activeSubscriptions += 1;
      if (subscription.customer) {
        activeCustomers.add(String(subscription.customer));
      }

      for (const item of subscription.items.data) {
        const unitAmount = item.price.unit_amount || 0;
        const interval = item.price.recurring?.interval;
        const quantity = item.quantity || 1;
        const itemTotal = (unitAmount * quantity) / 100;

        if (interval === 'month') {
          recurringMonthly += itemTotal;
        } else if (interval === 'year') {
          recurringMonthly += itemTotal / 12;
        } else if (interval === 'week') {
          recurringMonthly += (itemTotal * 52) / 12;
        } else if (interval === 'day') {
          recurringMonthly += (itemTotal * 365) / 12;
        }
      }
    }
  }

  const mrr = recurringMonthly;
  const arr = mrr * 12;
  const activeCustomerCount = activeCustomers.size;
  const customerRevenueEntries = Array.from(revenueByCustomer.values()).sort((left, right) => right.revenue - left.revenue);
  const largestCustomerRevenue = customerRevenueEntries[0]?.revenue ?? null;
  const topThreeCustomerRevenue = customerRevenueEntries.slice(0, 3).reduce((sum, entry) => sum + entry.revenue, 0);
  const topFiveCustomerRevenue = customerRevenueEntries.slice(0, 5).reduce((sum, entry) => sum + entry.revenue, 0);
  const repeatCustomerCount = customerRevenueEntries.filter(entry => entry.observations > 1).length;

  const topCustomersList = customerRevenueEntries.slice(0, 5).map((entry, idx) => ({
    label: `Customer ${idx + 1}`,
    revenue: entry.revenue,
    share: grossRevenue > 0 ? entry.revenue / grossRevenue : 0,
  }));

  const sortedMonthlyBreakdown = Array.from(monthlyStats.entries())
    .map(([monthKey, stat]) => {
      const [year, monthNum] = monthKey.split('-');
      const d = new Date(Number(year), Number(monthNum) - 1, 1);
      const period = !isNaN(d.getTime())
        ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : monthKey;
      const net = Math.max(0, stat.grossRevenue - stat.refunds);
      return {
        period,
        monthKey,
        grossRevenue: stat.grossRevenue,
        refunds: stat.refunds,
        netRevenue: net,
        transactions: stat.transactions,
        value: stat.grossRevenue,
      };
    })
    .sort((a, b) => (a.monthKey || a.period).localeCompare(b.monthKey || b.period));

  const growthAt = (monthsBack: number) => {
    if (sortedMonthlyBreakdown.length <= monthsBack) {
      return null;
    }

    const current = sortedMonthlyBreakdown.at(-1)?.value ?? 0;
    const prior = sortedMonthlyBreakdown.at(-(monthsBack + 1))?.value;
    if (typeof prior !== 'number' || prior <= 0) {
      return null;
    }

    return (current - prior) / prior;
  };

  const monthlyTrend = (() => {
    const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    if (sortedMonthlyBreakdown.length === 0) {
      return 'No processed Stripe transaction volume or recurring invoices were detected for this connected account during the requested date range.';
    }

    if (sortedMonthlyBreakdown.length === 1) {
      const onlyPoint = sortedMonthlyBreakdown[0];
      return `Baseline revenue recorded for ${onlyPoint.period} stands at ${currency.format(onlyPoint.value)}. Sequential multi-month growth velocity will populate as additional monthly billing cycles are completed.`;
    }

    const first = sortedMonthlyBreakdown[0];
    const last = sortedMonthlyBreakdown.at(-1)!;
    const direction = last.value >= first.value ? 'increased' : 'declined';
    const delta = Math.abs(last.value - first.value);
    const deltaPct = first.value > 0 ? Math.abs((last.value - first.value) / first.value) : null;
    const peak = sortedMonthlyBreakdown.reduce((current, item) => (item.value > current.value ? item : current), sortedMonthlyBreakdown[0]);

    return deltaPct !== null
      ? `Over the verified reporting period, monthly revenue ${direction} from ${currency.format(first.value)} (${first.period}) to ${currency.format(last.value)} (${last.period}), representing a ${(deltaPct * 100).toFixed(1)}% shift (${currency.format(delta)} net change). Peak monthly volume was achieved in ${peak.period} at ${currency.format(peak.value)}.`
      : `Monthly revenue stands at ${currency.format(last.value)} for ${last.period}. Peak monthly volume was achieved in ${peak.period} at ${currency.format(peak.value)}.`;
  })();

  const netRev = Math.max(0, grossRevenue - refunds - chargebacks);
  const netRealizationRatio = grossRevenue > 0 ? (netRev / grossRevenue) * 100 : 100;
  const refundRate = grossRevenue > 0 ? (refunds / grossRevenue) * 100 : 0;
  const disputeRate = grossRevenue > 0 ? (chargebacks / grossRevenue) * 100 : 0;

  const paymentMethods = Array.from(paymentMethodsMap.entries())
    .map(([type, data]) => ({ type, count: data.count, volume: data.volume }))
    .sort((a, b) => b.volume - a.volume);

  return {
    mrr,
    arr,
    grossRevenue,
    netRevenue: netRev,
    refunds,
    chargebacks,
    monthlyBreakdown: sortedMonthlyBreakdown,
    churnRate: subscriptions.length > 0 ? (churned / subscriptions.length) * 100 : 0,
    activeCustomers: activeCustomerCount,
    arpc: activeCustomerCount > 0 ? grossRevenue / activeCustomerCount : 0,
    subscriptionCount: subscriptions.length,
    activeSubscriptions,
    successfulPaymentsCount,
    failedPaymentsCount,
    totalTransactionsCount: successfulPaymentsCount + failedPaymentsCount,
    refundCount,
    disputeCount,
    netRealizationRatio,
    refundRate,
    disputeRate,
    repeatCustomerRate: activeCustomerCount > 0 ? repeatCustomerCount / activeCustomerCount : null,
    paymentMethods,
    growth: {
      oneMonth: growthAt(1),
      threeMonth: growthAt(3),
      sixMonth: growthAt(6),
      commentary: monthlyTrend,
    },
    customerConcentration: {
      largestCustomerShare: grossRevenue > 0 && largestCustomerRevenue !== null ? largestCustomerRevenue / grossRevenue : null,
      topThreeCustomerShare: grossRevenue > 0 && customerRevenueEntries.length >= 1 ? topThreeCustomerRevenue / grossRevenue : null,
      topFiveCustomerShare: grossRevenue > 0 ? topFiveCustomerRevenue / grossRevenue : null,
      largestCustomerRevenue,
      topThreeCustomerRevenue: customerRevenueEntries.length >= 1 ? topThreeCustomerRevenue : null,
      topFiveCustomerRevenue,
      topCustomersList,
      available: grossRevenue > 0 && customerRevenueEntries.length > 0,
    },
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

  // ProofRound verified packets are returned directly as inline PDFs without saving to Firestore.
  return { startup, packet: packetData as PacketRecord };
}

export async function renderPacketPdf(startup: StartupDoc, packet: PacketRecord): Promise<Buffer> {
  return renderInvestorPacketPdf(startup, packet);
}

// SVG Vector Path Data from public/logo.svg (viewBox: 350 265 504 100)
const SVG_VIEWBOX_X = 350;
const SVG_VIEWBOX_Y = 265;
const SVG_MARK_PATH =
  "M352 267.085L396.78 267.09L396.78 281.373L387.63 291.203L404.28 308.946L415.51 296.845L425.83 296.839L425.84 363L352.01 363L352 267.085Z M424.98 270.662L430.07 275.617L404.31 303.453L392.77 291.215L397.65 285.961L404.3 293.055L424.98 270.662Z M400.53 267C400.6 267.08 400.67 267.157 400.74 267.233C400.74 267.233 400.89 267.384 400.89 267.384C401.48 268.005 402.07 268.625 402.67 269.241C405.24 271.883 407.79 274.549 410.37 277.184C410.97 277.801 411.58 278.418 412.17 279.05L404.28 287.596L400.54 283.557L400.53 267Z M418.95 293.07L422.27 289.445L425.77 293.08L418.95 293.07Z";

const SVG_TEXT_PATH =
  "M444.75 288.86C454.14 288.701 467.7 287.048 476.25 292.017C481.88 295.29 484.5 301.529 483.56 307.918C482.15 317.533 475.02 323.24 465.46 323.448C461.72 323.53 457.97 323.44 454.23 323.477L454.24 341.206L444.77 341.215L444.75 288.86Z M454.67 297.433C456.87 297.327 459.07 297.3 461.27 297.352C465.52 297.453 471.76 298.579 473.87 302.867C475.36 305.891 473.72 309.695 471.77 312.119C468.89 315.694 458.22 314.781 454.24 314.771C454.3 308.984 453.82 303.157 454.67 297.433Z M499.32 307.596C504.36 304.362 504.97 303.128 511.19 302.468C511.66 305.922 511.62 307.893 511.64 311.726C510.74 311.895 509.84 312.078 508.96 312.279C500.51 314.18 498.48 319.579 498.66 328.067C498.75 332.453 499.21 336.824 499.27 341.212C497.44 341.318 492.4 341.772 490.8 340.729C490.03 340.231 490.18 336.65 490.17 335.947C490.12 325.006 490.23 314.064 490.16 303.123C493.09 303.16 496.03 303.129 498.94 303.468L499.32 307.596Z M534.48 302.092C545.57 302.051 554.61 311.01 554.67 322.111C554.72 333.212 545.77 342.26 534.67 342.329C523.55 342.399 514.49 333.432 514.43 322.311C514.38 311.189 523.35 302.133 534.48 302.092Z M534.47 311.042C540.69 311.007 545.74 316.035 545.74 322.25C545.74 328.464 540.69 333.493 534.48 333.458C528.31 333.424 523.33 328.416 523.33 322.25C523.33 316.084 528.31 311.076 534.47 311.042Z M579.95 302.053C591.15 301.964 600.28 311.02 600.28 322.222C600.28 333.424 591.15 342.48 579.95 342.391C568.88 342.302 559.95 333.298 559.95 322.222C559.95 311.146 568.88 302.142 579.95 302.053Z M580.15 310.974C586.29 311.002 591.27 315.958 591.32 322.097C591.38 328.235 586.49 333.279 580.35 333.416C576.31 333.507 572.53 331.413 570.46 327.937C568.39 324.461 568.35 320.14 570.36 316.628C572.37 313.115 576.11 310.955 580.15 310.974Z M603.31 303.316C604.53 303.195 605.76 303.144 606.98 303.108C608.57 303.06 609.08 302.325 609.68 300.879C611.93 295.427 610.17 292.007 616.16 289.306C618.08 288.438 625.53 286.459 627.29 287.741C627.97 288.232 627.6 293.807 627.41 294.95C625.17 296.031 623.52 296.18 621.24 296.858C618.96 297.537 618.31 300.102 618.78 302.239C619.04 303.443 621.64 303.258 622.54 303.271C624.36 303.297 626.18 303.285 628 303.272L627.97 311.374L618.57 311.238C618.82 318.44 618.8 325.649 618.71 332.855C618.68 335.648 618.45 338.435 618.25 341.222L609.41 341.196C609.51 332.263 609.79 323.318 609.24 314.401C609.18 313.527 609.09 312.656 608.97 311.789C607.6 311.457 606.18 311.317 604.9 310.744C602.43 309.636 603.05 305.458 603.31 303.316Z M633.77 288.803C641.24 288.731 651.99 287.821 659.44 289.436C667.02 291.079 673.88 297.274 673.46 305.524C673.11 312.535 668.9 317.073 663.39 320.841C663.64 321.363 663.9 321.881 664.18 322.393C667.2 328.001 670.48 333.469 673.54 339.055C673.92 339.751 674.29 340.453 674.62 341.176L664.26 341.21L653.43 322.391L643.22 322.358L643.24 341.205L633.77 341.215L633.77 288.803Z M643.36 297.366C647.91 297.321 658.01 296.892 662.29 300.721C665.46 303.56 663.7 308.14 661.59 311.096C658.72 315.117 647.47 314.253 643.33 314.066L643.36 297.366Z M697.44 302.091C708.61 301.916 717.78 310.863 717.9 322.034C718.01 333.204 709.01 342.331 697.84 342.378C686.76 342.425 677.72 333.513 677.61 322.433C677.5 311.353 686.36 302.264 697.44 302.091Z M697.84 310.976C703.97 311.021 708.92 315.972 708.98 322.098C709.03 328.225 704.16 333.264 698.04 333.418C693.99 333.519 690.2 331.429 688.12 327.948C686.04 324.467 686 320.137 688.02 316.62C690.03 313.103 693.79 310.946 697.84 310.976Z M724.29 303.109L733.51 303.16C733.46 309.161 732.46 323.138 734.34 328.97C735.32 332.017 739.1 333.474 742.02 333.827C754.19 335.297 751.39 307.943 751.23 303.11L760.38 303.16L760.33 341.308C759.35 341.353 758.36 341.399 757.38 341.425C753.55 341.524 752.77 340.811 750.63 337.724C749.17 338.444 747.8 339.315 746.42 340.184C742.26 342.81 737.39 342.941 732.89 341.027C724.34 337.393 723.78 325.049 723.83 317.194C723.86 312.496 724.2 307.806 724.29 303.109Z M778.17 306.882C782.03 304.885 783.81 302.571 788.4 302.399C800.35 301.951 804.08 309.595 804.87 320.386C805.38 327.325 804.63 334.286 804.6 341.244L795.63 341.238C795.67 335.85 795.84 330.462 795.79 325.074C795.76 321.089 796.02 316.046 793.01 312.944C790.85 310.726 786.25 309.894 783.54 311.459C778.59 314.313 778.19 319.436 778.13 324.576C778.07 330.118 778.16 335.662 778.24 341.204L769.18 341.209L769.03 303.126L777.81 303.431L778.17 306.882Z M842.92 288.251L851.99 288.276L851.81 341.217C851.12 341.256 850.43 341.318 849.73 341.342C845.53 341.487 844.89 341.458 842.72 337.875C838.82 340.019 834.64 342.046 830.19 342.06C824.63 342.077 819.76 339.796 816.1 335.677C808.53 327.179 809.84 312.305 819.35 305.75C827.16 300.364 835.52 302.006 842.91 307.168L842.92 288.251Z M831.88 310.864C838.13 311.002 843.08 316.162 842.98 322.409C842.87 328.656 837.73 333.639 831.48 333.557C825.2 333.476 820.17 328.297 820.28 322.011C820.4 315.724 825.59 310.725 831.88 310.864Z";

export function drawFullSvgLogo(
  pdf: PDFKit.PDFDocument,
  x: number,
  y: number,
  scale = 0.28,
  markColor = "#4F46E5",
  textColor = "#0F172A"
) {
  pdf.save();
  pdf.translate(x, y);
  pdf.scale(scale);
  pdf.translate(-SVG_VIEWBOX_X, -SVG_VIEWBOX_Y);
  pdf.path(SVG_MARK_PATH).fill(markColor);
  pdf.path(SVG_TEXT_PATH).fill(textColor);
  pdf.restore();
}

function drawMarkSvgLogo(
  pdf: PDFKit.PDFDocument,
  x: number,
  y: number,
  size = 18,
  markColor = "#4F46E5"
) {
  const scale = size / 96;
  pdf.save();
  pdf.translate(x, y);
  pdf.scale(scale);
  pdf.translate(-352, -267);
  pdf.path(SVG_MARK_PATH).fill(markColor);
  pdf.restore();
}

export async function renderLocalFallbackPdf(startup: StartupDoc, packet: PacketRecord): Promise<Buffer> {
  const pdf = new PDFDocument({ size: "A4", margin: 0 });
  const pdfFonts = configurePdfFonts(pdf);
  const chunks: Buffer[] = [];

  const output = new Promise<Buffer>((resolve, reject) => {
    pdf.on("data", chunk => chunks.push(Buffer.from(chunk)));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
  });

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_X = 40;
  const MARGIN_TOP = 40;
  const MARGIN_BOTTOM = 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
  const TOTAL_PAGES = 3;

  const colors = {
    bg: "#ffffff",
    cardBg: "#ffffff",
    cardSubtle: "#f8fafc",
    cardBorder: "#e2e8f0",
    accent: "#4f46e5",
    accentLight: "#f5f3ff",
    accentBorder: "#c7d2fe",
    textPrimary: "#0f172a",
    textSecondary: "#334155",
    textMuted: "#64748b",
    borderLight: "#e2e8f0",
    successBg: "#ecfdf5",
    successText: "#059669",
    successBorder: "#a7f3d0",
    warningBg: "#fffbeb",
    warningText: "#b45309",
    warningBorder: "#fde68a",
    dangerBg: "#fef2f2",
    dangerText: "#dc2626",
    dangerBorder: "#fecaca",
  };

  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const decimalCurrency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const percent = new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const wholeNumber = new Intl.NumberFormat("en-US");

  const formatDateShort = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
        });
  };

  const drawPanel = (x: number, y: number, w: number, h: number, opts: { fill?: string; stroke?: string; radius?: number; lineWidth?: number } = {}) => {
    const fill = opts.fill ?? colors.cardBg;
    const stroke = opts.stroke ?? colors.cardBorder;
    const radius = opts.radius ?? 6;
    pdf.save();
    pdf.roundedRect(x, y, w, h, radius);
    if (fill && stroke) {
      pdf.lineWidth(opts.lineWidth ?? 0.75).fillAndStroke(fill, stroke);
    } else if (fill) {
      pdf.fill(fill);
    } else if (stroke) {
      pdf.lineWidth(opts.lineWidth ?? 0.75).stroke(stroke);
    }
    pdf.restore();
  };

  const drawBadge = (text: string, x: number, y: number, opts: { fill?: string; stroke?: string; textColor?: string; fontSize?: number; height?: number } = {}) => {
    const fill = opts.fill ?? colors.accentLight;
    const stroke = opts.stroke ?? colors.accentBorder;
    const textColor = opts.textColor ?? colors.accent;
    const fontSize = opts.fontSize ?? 7.5;
    const height = opts.height ?? 16;

    pdf.font(pdfFonts.bold).fontSize(fontSize);
    const textW = pdf.widthOfString(text);
    const padX = 7;
    const badgeW = textW + padX * 2;

    pdf.save();
    pdf.roundedRect(x, y, badgeW, height, 4).lineWidth(0.5).fillAndStroke(fill, stroke);
    pdf.fillColor(textColor).text(text, x, y + (height - fontSize) / 2 - 0.5, { width: badgeW, align: "center" });
    pdf.restore();

    return badgeW;
  };

  const drawMetricCard = (x: number, y: number, w: number, h: number, opts: { label: string; value: string; subtitle?: string; highlight?: boolean; valueSize?: number }) => {
    drawPanel(x, y, w, h, {
      fill: opts.highlight ? colors.accentLight : colors.cardBg,
      stroke: opts.highlight ? colors.accentBorder : colors.cardBorder,
      radius: 6,
      lineWidth: opts.highlight ? 1 : 0.75,
    });

    pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(opts.highlight ? colors.accent : colors.textMuted);
    pdf.text(opts.label.toUpperCase(), x + 10, y + 9, { width: w - 20, ellipsis: true });

    pdf.font(pdfFonts.bold).fontSize(opts.valueSize ?? 17).fillColor(opts.highlight ? colors.accent : colors.textPrimary);
    pdf.text(opts.value, x + 10, y + 25, { width: w - 20, ellipsis: true });

    if (opts.subtitle) {
      pdf.font(pdfFonts.regular).fontSize(7.5).fillColor(colors.textMuted);
      pdf.text(opts.subtitle, x + 10, y + h - 17, { width: w - 20, ellipsis: true });
    }
  };

  const drawFooter = (page: number) => {
    const y = PAGE_HEIGHT - MARGIN_BOTTOM;
    pdf.save();
    pdf.moveTo(MARGIN_X, y - 10).lineTo(PAGE_WIDTH - MARGIN_X, y - 10).lineWidth(0.5).stroke(colors.borderLight);
    pdf.font(pdfFonts.regular).fontSize(7.5).fillColor(colors.textMuted);
    pdf.text(`ProofRound · Verified Investor Snapshot · Report ID: ${packet.id}`, MARGIN_X, y - 2);
    pdf.text(`Page ${page} of ${TOTAL_PAGES}`, PAGE_WIDTH - MARGIN_X - 100, y - 2, { width: 100, align: "right" });
    pdf.restore();
  };

  const drawRunningHeader = (title: string) => {
    drawMarkSvgLogo(pdf, MARGIN_X, MARGIN_TOP - 2, 18, colors.accent);
    pdf.font(pdfFonts.bold).fontSize(10).fillColor(colors.accent).text("ProofRound", MARGIN_X + 24, MARGIN_TOP);
    pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textMuted).text(`|   ${title}`, MARGIN_X + 88, MARGIN_TOP + 1);

    pdf.save();
    pdf.moveTo(MARGIN_X, MARGIN_TOP + 22).lineTo(PAGE_WIDTH - MARGIN_X, MARGIN_TOP + 22).lineWidth(0.5).stroke(colors.borderLight);
    pdf.restore();
  };

  const m = packet.metrics;
  const grossRev = m.grossRevenue;
  const netRev = m.netRevenue;
  const netRealizationRatio = m.netRealizationRatio ?? (grossRev > 0 ? (netRev / grossRev) * 100 : 100);
  const disputeRate = m.disputeRate ?? (grossRev > 0 ? (m.chargebacks / grossRev) * 100 : 0);
  const refundRate = m.refundRate ?? (grossRev > 0 ? (m.refunds / grossRev) * 100 : 0);
  const repeatRate = m.repeatCustomerRate !== null ? percent.format(m.repeatCustomerRate) : "N/A";

  // =========================================================================
  // PAGE 1: INVESTOR SNAPSHOT
  // =========================================================================
  pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(colors.bg);

  // Top-Left Brand Vector Logo (Same icon as subsequent pages)
  drawMarkSvgLogo(pdf, MARGIN_X, MARGIN_TOP - 2, 18, colors.accent);
  pdf.font(pdfFonts.bold).fontSize(10).fillColor(colors.accent).text("ProofRound", MARGIN_X + 24, MARGIN_TOP);

  // Top-Right Header Info (Removed STRIPE-CONNECTED DILIGENCE badge)
  const headerRightX = PAGE_WIDTH - MARGIN_X - 260;
  pdf.font(pdfFonts.bold).fontSize(14).fillColor(colors.textPrimary).text("Verified Investor Snapshot", headerRightX, MARGIN_TOP + 2, { width: 260, align: "right" });
  pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textMuted).text("Stripe-connected revenue snapshot for startup diligence", headerRightX, MARGIN_TOP + 20, { width: 260, align: "right" });

  // Divider
  pdf.save();
  pdf.moveTo(MARGIN_X, 78).lineTo(PAGE_WIDTH - MARGIN_X, 78).lineWidth(0.5).stroke(colors.borderLight);
  pdf.restore();

  // Startup Header
  let curY = 92;
  pdf.font(pdfFonts.bold).fontSize(20).fillColor(colors.textPrimary).text(startup.name, MARGIN_X, curY);
  curY += 26;

  const descriptionText = startup.tagline || startup.description || "Verified company with connected Stripe financial ledger.";
  pdf.font(pdfFonts.regular).fontSize(9.5).fillColor(colors.textSecondary).text(descriptionText, MARGIN_X, curY, { width: CONTENT_WIDTH, height: 16, ellipsis: true });
  curY += 24;

  // 2-Column Metadata Box: Showing only REPORTING PERIOD and SNAPSHOT TIMESTAMP
  const metaBoxH = 44;
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, metaBoxH, { fill: colors.cardSubtle, stroke: colors.cardBorder });
  const colW2 = (CONTENT_WIDTH - 24) / 2;

  pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.textMuted).text("REPORTING PERIOD", MARGIN_X + 14, curY + 8);
  pdf.font(pdfFonts.bold).fontSize(9).fillColor(colors.textPrimary).text(
    `${formatDateShort(packet.timeRangeStart)} – ${formatDateShort(packet.timeRangeEnd)}`,
    MARGIN_X + 14,
    curY + 22
  );

  pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.textMuted).text("SNAPSHOT TIMESTAMP", MARGIN_X + colW2 + 14, curY + 8);
  pdf.font(pdfFonts.bold).fontSize(9).fillColor(colors.textPrimary).text(
    formatDateShort(packet.createdAt),
    MARGIN_X + colW2 + 14,
    curY + 22
  );

  curY += metaBoxH + 16;

  // Executive Diligence Summary Box
  const execSummary = (() => {
    if (grossRev <= 0) {
      return `During the verified reporting period from ${formatDateShort(packet.timeRangeStart)} to ${formatDateShort(packet.timeRangeEnd)}, no processed Stripe revenue transactions or recurring invoices were detected for ${startup.name}. Direct read-only Stripe ledger inspection indicates pre-revenue operations or transaction processing outside this connected Stripe account.`;
    }

    const parts: string[] = [];
    parts.push(
      `Between ${formatDateShort(packet.timeRangeStart)} and ${formatDateShort(packet.timeRangeEnd)}, ${startup.name} generated ${currency.format(grossRev)} in gross processed Stripe volume across ${wholeNumber.format(m.successfulPaymentsCount || m.activeCustomers)} successful transactions, realizing ${currency.format(netRev)} in net revenue (${netRealizationRatio.toFixed(1)}% net realization ratio).`
    );

    if (m.mrr > 0 || m.activeSubscriptions > 0) {
      parts.push(
        `Contracted subscription revenue represents ${currency.format(m.mrr)} MRR (${currency.format(m.arr)} ARR) across ${wholeNumber.format(m.activeSubscriptions || m.subscriptionCount)} active recurring subscriptions with an observed cohort churn rate of ${m.churnRate.toFixed(1)}%.`
      );
    } else {
      parts.push(
        `Transactional volume spans ${wholeNumber.format(m.activeCustomers)} billed customer accounts with an average revenue per customer (ARPC) of ${decimalCurrency.format(m.arpc)}.`
      );
    }

    const disputeDetail = m.chargebacks > 0
      ? `formal dispute claims totaled ${currency.format(m.chargebacks)} (${disputeRate.toFixed(2)}% dispute rate)`
      : `dispute rate was 0.00% (${currency.format(0)} in chargebacks)`;
    const refundDetail = m.refunds > 0
      ? `refund volume totaled ${currency.format(m.refunds)} (${refundRate.toFixed(1)}% of volume)`
      : `refund volume was ${currency.format(0)}`;

    parts.push(`Payment risk remained well-controlled: ${refundDetail}, and ${disputeDetail}.`);

    return parts.join(" ");
  })();

  const execBoxH = 76;
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, execBoxH, { fill: colors.cardSubtle, stroke: colors.cardBorder });
  pdf.save();
  pdf.roundedRect(MARGIN_X, curY, 4, execBoxH, 2).fill(colors.accent);
  pdf.restore();

  pdf.font(pdfFonts.bold).fontSize(8).fillColor(colors.accent).text("EXECUTIVE DILIGENCE SUMMARY", MARGIN_X + 14, curY + 9);
  pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textSecondary).text(execSummary, MARGIN_X + 14, curY + 23, {
    width: CONTENT_WIDTH - 28,
    lineGap: 3,
  });

  curY += execBoxH + 18;

  // Core Financial Highlights - 4 KPI Cards
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Traction Overview & Key Financial Highlights", MARGIN_X, curY);
  curY += 16;

  const cardW = (CONTENT_WIDTH - 9 * 3) / 4;
  drawMetricCard(MARGIN_X, curY, cardW, 72, { label: "Gross Revenue", value: currency.format(grossRev), subtitle: "Total volume processed", highlight: true });
  drawMetricCard(MARGIN_X + (cardW + 9), curY, cardW, 72, { label: "Net Revenue", value: currency.format(netRev), subtitle: "Net realized volume" });
  drawMetricCard(MARGIN_X + (cardW + 9) * 2, curY, cardW, 72, { label: "MRR", value: currency.format(m.mrr), subtitle: "Monthly recurring run rate", highlight: true });
  drawMetricCard(MARGIN_X + (cardW + 9) * 3, curY, cardW, 72, { label: "ARR", value: currency.format(m.arr), subtitle: "Annualized run rate (MRR×12)" });

  curY += 86;

  // Unit Economics & Quality Grid - 4 KPI Cards
  drawMetricCard(MARGIN_X, curY, cardW, 70, { label: "Active Customers", value: wholeNumber.format(m.activeCustomers), subtitle: "Distinct accounts billed" });
  drawMetricCard(MARGIN_X + (cardW + 9), curY, cardW, 70, { label: "ARPC", value: decimalCurrency.format(m.arpc), subtitle: "Avg revenue / customer" });
  drawMetricCard(MARGIN_X + (cardW + 9) * 2, curY, cardW, 70, { label: "Net Realization", value: `${netRealizationRatio.toFixed(1)}%`, subtitle: "Net revenue / Gross" });
  drawMetricCard(MARGIN_X + (cardW + 9) * 3, curY, cardW, 70, { label: "Repeat Rate", value: repeatRate, subtitle: "Accounts with >1 charge" });

  curY += 84;

  // Payment Integrity & Risk Baseline (Single full-width card with increased padding)
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Payment Integrity & Risk Baseline", MARGIN_X, curY);
  curY += 22; // Increased padding between title and card below it

  const refundCardH = 82;
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, refundCardH, { fill: colors.cardSubtle, stroke: colors.cardBorder });
  pdf.font(pdfFonts.bold).fontSize(8).fillColor(colors.textMuted).text("REFUNDS & CHARGEBACK ANALYSIS", MARGIN_X + 14, curY + 10);

  const disputeStatus = disputeRate < 1.0 ? "Low Dispute Risk (Stripe ecosystem benchmark < 1.0%)" : "Elevated Dispute Activity";
  const bullets = [
    `• Total Refunds: ${currency.format(m.refunds)} (${refundRate.toFixed(1)}% of gross volume)`,
    `• Disputes / Chargebacks: ${currency.format(m.chargebacks)} (${disputeRate.toFixed(2)}% chargeback rate)`,
    `• Baseline Assessment: ${disputeStatus}`,
  ];

  let bulletY = curY + 26;
  for (const b of bullets) {
    pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textSecondary).text(b, MARGIN_X + 14, bulletY, { width: CONTENT_WIDTH - 28 });
    bulletY += 16; // Generous padding between each bullet point
  }

  curY += refundCardH + 18;

  // Diligence Notice Box (Properly fit the text within its box constraints gracefully)
  const noticeTitle = "DILIGENCE & CONFIDENTIALITY NOTICE";
  const noticeText =
    "ProofRound connects directly to the company's Stripe account via read-only OAuth to verify financial performance. Figures represent actual ledger data recorded in Stripe during the stated reporting window. This snapshot does not account for off-platform sales, non-Stripe payment processors, or bank wires.";

  pdf.font(pdfFonts.regular).fontSize(8);
  const textH = pdf.heightOfString(noticeText, { width: CONTENT_WIDTH - 28, lineGap: 2 });
  const noticeH = Math.max(72, Math.ceil(24 + textH + 12));

  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, noticeH, { fill: colors.cardSubtle, stroke: colors.cardBorder });
  pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.textMuted).text(noticeTitle, MARGIN_X + 14, curY + 10);
  pdf.font(pdfFonts.regular).fontSize(8).fillColor(colors.textMuted).text(
    noticeText,
    MARGIN_X + 14,
    curY + 24,
    { width: CONTENT_WIDTH - 28, lineGap: 2 }
  );

  drawFooter(1);

  // =========================================================================
  // PAGE 2: REVENUE AND GROWTH
  // =========================================================================
  pdf.addPage();
  pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(colors.bg);
  drawRunningHeader("Revenue Trajectory & Historical Growth");

  curY = MARGIN_TOP + 36;
  pdf.font(pdfFonts.bold).fontSize(16).fillColor(colors.textPrimary).text("Revenue Trajectory & Historical Growth", MARGIN_X, curY);
  curY += 24; // Increased padding between title and subtitle
  pdf.font(pdfFonts.regular).fontSize(9).fillColor(colors.textMuted).text(
    "Sequential monthly progression, growth velocity, and payment method distribution.",
    MARGIN_X,
    curY
  );
  curY += 24;

  // Growth Velocity Cards (3 Cards)
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Sequential Growth Velocity", MARGIN_X, curY);
  curY += 20; // Increased padding between title and cards

  const cardW3 = (CONTENT_WIDTH - 12 * 2) / 3;
  const growth1 = m.growth.oneMonth !== null ? percent.format(m.growth.oneMonth) : "N/A";
  const growth3 = m.growth.threeMonth !== null ? percent.format(m.growth.threeMonth) : "N/A";
  const growth6 = m.growth.sixMonth !== null ? percent.format(m.growth.sixMonth) : "N/A";

  drawMetricCard(MARGIN_X, curY, cardW3, 68, { label: "1-Month Growth (MoM)", value: growth1, subtitle: "Last 30-day velocity", highlight: true });
  drawMetricCard(MARGIN_X + cardW3 + 12, curY, cardW3, 68, { label: "3-Month Growth", value: growth3, subtitle: "Quarterly expansion velocity" });
  drawMetricCard(MARGIN_X + (cardW3 + 12) * 2, curY, cardW3, 68, { label: "6-Month Growth", value: growth6, subtitle: "Half-year expansion velocity" });

  curY += 80;

  // Commentary Box
  const commentaryBoxH = 50;
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, commentaryBoxH, { fill: colors.accentLight, stroke: colors.accentBorder });
  pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.accent).text("GROWTH & TRAJECTORY COMMENTARY", MARGIN_X + 14, curY + 8);
  const commentaryText = m.growth.commentary || "No growth commentary available from current Stripe observations.";
  pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textSecondary).text(commentaryText, MARGIN_X + 14, curY + 20, {
    width: CONTENT_WIDTH - 28,
    lineGap: 2.5,
  });

  curY += commentaryBoxH + 20;

  // Monthly Revenue Visual Chart
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Monthly Revenue Visual History", MARGIN_X, curY);
  curY += 20; // Increased padding between title and graph

  const monthlyPoints = m.monthlyBreakdown.slice(-8);
  const maxVal = Math.max(...monthlyPoints.map(p => p.value), 1);
  const chartH = 135;

  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, chartH, { fill: colors.cardSubtle, stroke: colors.cardBorder });

  if (monthlyPoints.length === 0) {
    pdf.font(pdfFonts.regular).fontSize(9.5).fillColor(colors.textMuted).text(
      "No recurring monthly Stripe revenue observations detected during this reporting window.\nHistorical monthly volume will plot automatically as Stripe payment activity is recorded.",
      MARGIN_X + 20, curY + 52, { width: CONTENT_WIDTH - 40, align: "center", lineGap: 4 }
    );
  } else {
    // Draw gridlines
    const gridY0 = curY + chartH - 28;
    const gridH = chartH - 48;

    for (let g = 0; g <= 4; g++) {
      const lineY = gridY0 - (g / 4) * gridH;
      pdf.save();
      pdf.moveTo(MARGIN_X + 15, lineY).lineTo(PAGE_WIDTH - MARGIN_X - 15, lineY).lineWidth(0.5).stroke(colors.borderLight);
      pdf.restore();
    }

    // Draw bars
    const numBars = monthlyPoints.length;
    const barAvailW = CONTENT_WIDTH - 40;
    const colStep = barAvailW / numBars;
    const barW = Math.min(36, colStep * 0.65);

    monthlyPoints.forEach((point, i) => {
      const barX = MARGIN_X + 20 + i * colStep + (colStep - barW) / 2;
      const normH = Math.max(4, (point.value / maxVal) * gridH);
      const barY = gridY0 - normH;
      const isPeak = point.value === maxVal && point.value > 0;

      pdf.save();
      pdf.roundedRect(barX, barY, barW, normH, 3).fill(isPeak ? colors.accent : colors.accentBorder);
      pdf.restore();

      // Bar label (value on top)
      const valStr = point.value >= 1000 ? `$${(point.value / 1000).toFixed(1)}k` : `$${Math.round(point.value)}`;
      pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(isPeak ? colors.accent : colors.textSecondary);
      pdf.text(valStr, barX - 10, barY - 11, { width: barW + 20, align: "center" });

      // Month label on bottom
      pdf.font(pdfFonts.regular).fontSize(7.5).fillColor(colors.textMuted);
      pdf.text(point.period, barX - 10, gridY0 + 6, { width: barW + 20, align: "center" });

      if (isPeak && numBars > 1) {
        drawBadge("PEAK", barX + (barW - 28) / 2, barY - 24, { fill: colors.accentLight, stroke: colors.accentBorder, textColor: colors.accent, fontSize: 6, height: 11 });
      }
    });
  }

  curY += chartH + 22;

  // Monthly Breakdown Table
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Monthly Revenue Breakdown Ledger", MARGIN_X, curY);
  curY += 20; // Increased padding between title and table

  // Table Header
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 20, { fill: colors.cardSubtle, stroke: colors.cardBorder, radius: 4 });
  pdf.font(pdfFonts.bold).fontSize(7).fillColor(colors.textMuted);
  pdf.text("PERIOD / MONTH", MARGIN_X + 12, curY + 6);
  pdf.text("GROSS VOLUME", MARGIN_X + 130, curY + 6);
  pdf.text("NET REALIZED", MARGIN_X + 235, curY + 6);
  pdf.text("% OF WINDOW", MARGIN_X + 335, curY + 6);
  pdf.text("RELATIVE VOLUME", MARGIN_X + 415, curY + 6);
  curY += 24;

  const tablePoints = m.monthlyBreakdown.slice(-5);
  const totalWindowVal = tablePoints.reduce((acc, p) => acc + p.value, 0) || 1;

  if (tablePoints.length === 0) {
    drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 30, { fill: colors.cardSubtle, stroke: colors.cardBorder, radius: 4 });
    pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textMuted).text("No monthly revenue records detected in the selected reporting window.", MARGIN_X + 12, curY + 10);
    curY += 38;
  } else {
    tablePoints.forEach((p, idx) => {
      drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 24, {
        fill: idx % 2 === 0 ? colors.cardBg : colors.cardSubtle,
        stroke: colors.cardBorder,
        radius: 3,
      });

      const isPeak = p.value === maxVal;
      const pctOfWindow = ((p.value / totalWindowVal) * 100).toFixed(1) + "%";
      pdf.font(pdfFonts.bold).fontSize(8).fillColor(colors.textPrimary).text(p.period, MARGIN_X + 12, curY + 8);
      pdf.font(pdfFonts.bold).fontSize(8.5).fillColor(colors.accent).text(currency.format(p.value), MARGIN_X + 130, curY + 8);
      pdf.font(pdfFonts.regular).fontSize(8).fillColor(colors.textSecondary).text(currency.format(p.value * (netRealizationRatio / 100)), MARGIN_X + 235, curY + 8);
      pdf.font(pdfFonts.regular).fontSize(8).fillColor(colors.textSecondary).text(pctOfWindow, MARGIN_X + 335, curY + 8);

      // Bar indicator
      const barMaxW = 75;
      const barW = Math.max(4, Math.min(barMaxW, (p.value / maxVal) * barMaxW));
      pdf.save();
      pdf.roundedRect(MARGIN_X + 415, curY + 7, barW, 9, 3).fill(isPeak ? colors.accent : colors.accentBorder);
      pdf.restore();

      curY += 26;
    });
  }

  curY += 18;

  // Payment Channels & Transaction Volume - 3 Cards
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Payment Channels & Transaction Execution", MARGIN_X, curY);
  curY += 20; // Increased padding between title and cards

  const primaryMethod = m.paymentMethods && m.paymentMethods.length > 0 ? m.paymentMethods[0].type : "Card";
  const primaryCount = m.paymentMethods && m.paymentMethods.length > 0 ? `${m.paymentMethods[0].count} payments` : "Standard processing";

  drawMetricCard(MARGIN_X, curY, cardW3, 68, {
    label: "Successful Payments",
    value: `${wholeNumber.format(m.successfulPaymentsCount || 0)} charges`,
    subtitle: "Settled Stripe ledger transactions",
  });
  drawMetricCard(MARGIN_X + cardW3 + 12, curY, cardW3, 68, {
    label: "Failed Payments",
    value: `${wholeNumber.format(m.failedPaymentsCount || 0)} failed`,
    subtitle: "Declined or uncollectible payments",
  });
  drawMetricCard(MARGIN_X + (cardW3 + 12) * 2, curY, cardW3, 68, {
    label: "Primary Channel",
    value: primaryMethod,
    subtitle: primaryCount,
  });

  drawFooter(2);

  // =========================================================================
  // PAGE 3: CUSTOMER AND REVENUE QUALITY
  // =========================================================================
  pdf.addPage();
  pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(colors.bg);
  drawRunningHeader("Customer Quality, Unit Economics & Risk");

  curY = MARGIN_TOP + 36;
  pdf.font(pdfFonts.bold).fontSize(16).fillColor(colors.textPrimary).text("Customer Quality, Unit Economics & Risk", MARGIN_X, curY);
  curY += 24; // Increased padding between title and subtitle
  pdf.font(pdfFonts.regular).fontSize(9).fillColor(colors.textMuted).text(
    "Cohort concentration, subscription retention, and dispute risk baseline.",
    MARGIN_X,
    curY
  );
  curY += 28;

  // Customer Concentration & Dependency
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Customer Concentration & Dependency", MARGIN_X, curY);
  curY += 20; // Increased padding between title and cards

  const conc = m.customerConcentration;
  const largestShareText = conc.largestCustomerShare !== null ? `${percent.format(conc.largestCustomerShare)} (${conc.largestCustomerRevenue ? currency.format(conc.largestCustomerRevenue) : "N/A"})` : "N/A";
  const topFiveShareText = conc.topFiveCustomerShare !== null ? `${percent.format(conc.topFiveCustomerShare)} (${conc.topFiveCustomerRevenue ? currency.format(conc.topFiveCustomerRevenue) : "N/A"})` : "N/A";
  const cardW2 = (CONTENT_WIDTH - 12) / 2;

  drawMetricCard(MARGIN_X, curY, cardW2, 74, {
    label: "Largest Customer Share",
    value: largestShareText,
    subtitle: "Top customer contribution to gross volume",
    highlight: true,
  });
  drawMetricCard(MARGIN_X + cardW2 + 12, curY, cardW2, 74, {
    label: "Top 5 Customers Share",
    value: topFiveShareText,
    subtitle: "Top 5 accounts contribution to gross volume",
  });

  // Removed CONCENTRATION RISK RATING section as requested
  curY += 74 + 28;

  // Subscription Contract Health & Retention
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Subscription Contract Health & Retention", MARGIN_X, curY);
  curY += 20; // Increased padding between title and cards

  drawMetricCard(MARGIN_X, curY, cardW3, 74, {
    label: "Active Subscriptions",
    value: `${wholeNumber.format(m.activeSubscriptions || m.subscriptionCount)} active`,
    subtitle: "Ongoing recurring Stripe contracts",
  });
  drawMetricCard(MARGIN_X + cardW3 + 12, curY, cardW3, 74, {
    label: "Annualized Run Rate",
    value: currency.format(m.arr),
    subtitle: "Contracted run rate (MRR×12)",
  });
  drawMetricCard(MARGIN_X + (cardW3 + 12) * 2, curY, cardW3, 74, {
    label: "Observed Churn Rate",
    value: `${m.churnRate.toFixed(1)}%`,
    subtitle: "Canceled contracts / total cohort",
  });

  curY += 74 + 28;

  // Payment Quality & Dispute Records
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Payment Quality & Dispute Records", MARGIN_X, curY);
  curY += 20; // Increased padding between title and cards

  drawMetricCard(MARGIN_X, curY, cardW3, 74, {
    label: "Total Refunds",
    value: `${currency.format(m.refunds)} (${refundRate.toFixed(1)}%)`,
    subtitle: `${m.refundCount || 0} refunded transactions`,
  });
  drawMetricCard(MARGIN_X + cardW3 + 12, curY, cardW3, 74, {
    label: "Disputes & Chargebacks",
    value: `${currency.format(m.chargebacks)} (${disputeRate.toFixed(1)}%)`,
    subtitle: `${m.disputeCount || 0} formal dispute claims`,
  });
  drawMetricCard(MARGIN_X + (cardW3 + 12) * 2, curY, cardW3, 74, {
    label: "Net Volume Ratio",
    value: `${netRealizationRatio.toFixed(1)}%`,
    subtitle: "Net revenue realized / gross",
  });

  curY += 74 + 32;

  // Portfolio Diligence & Resilience Summary (Replacing Cryptographic Ledger section)
  const summaryBoxH = 108;
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, summaryBoxH, { fill: colors.cardSubtle, stroke: colors.cardBorder });
  pdf.save();
  pdf.roundedRect(MARGIN_X, curY, 4, summaryBoxH, 2).fill(colors.accent);
  pdf.restore();

  pdf.font(pdfFonts.bold).fontSize(8).fillColor(colors.accent).text("PORTFOLIO RETENTION & REVENUE RESILIENCE DILIGENCE SUMMARY", MARGIN_X + 14, curY + 10);

  const top5ShareVal = conc.topFiveCustomerShare ?? 0;
  const diversificationAssessment = top5ShareVal < 0.25
    ? "Low customer concentration (<25% from top 5 accounts) indicates healthy revenue diversification and resilience against individual account attrition."
    : top5ShareVal < 0.5
      ? "Moderate customer concentration (25%–50% from top 5 accounts) indicates a growing customer base with meaningful top-account contribution."
      : "High customer concentration (>50% from top 5 accounts) reflects early enterprise or key-account dependency typical of initial scaling stages.";

  const retentionAssessment = m.churnRate < 5.0
    ? `Strong subscription contract retention with a low observed churn rate of ${m.churnRate.toFixed(1)}%, supporting high customer lifetime value.`
    : `Subscription contract churn rate of ${m.churnRate.toFixed(1)}% observed across recurring accounts during this period.`;

  const qualityAssessment = disputeRate < 1.0
    ? `Payment integrity metrics demonstrate stable operations with a ${netRealizationRatio.toFixed(1)}% net revenue realization ratio and dispute rates below 1.0%.`
    : `Payment integrity metrics indicate a ${netRealizationRatio.toFixed(1)}% net realization ratio with ${disputeRate.toFixed(2)}% dispute activity.`;

  const page3Summary = `${diversificationAssessment} ${retentionAssessment} ${qualityAssessment} All figures reflect direct read-only Stripe API verification across charges, customer profiles, and recurring subscriptions.`;

  pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textSecondary).text(page3Summary, MARGIN_X + 14, curY + 26, {
    width: CONTENT_WIDTH - 28,
    lineGap: 3,
  });

  drawFooter(3);

  pdf.end();
  return output;
}

export async function renderInvestorPacketPdf(
  startup: StartupDoc,
  packet: PacketRecord
): Promise<Buffer> {
  const html = generateInvestorSnapshotHtml(startup, packet);
  const { isConfigured } = getBrowserlessConfig();

  if (isConfigured || process.env.BROWSERLESS_URL) {
    try {
      return await generatePdfWithBrowserless(html);
    } catch (err) {
      console.warn('[Browserless] Remote Browserless PDF generation failed, falling back to local generator:', err);
    }
  } else {
    try {
      return await generatePdfWithBrowserless(html);
    } catch {
      // Browserless not configured in current environment, proceed to fallback
    }
  }

  return renderLocalFallbackPdf(startup, packet);
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

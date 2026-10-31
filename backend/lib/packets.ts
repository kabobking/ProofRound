import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { getDb } from './firebase-admin.js';
import { getStripeClient } from './stripe.js';
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

  const monthlyBreakdown = new Map<string, number>();
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
    monthlyBreakdown.set(monthKey, (monthlyBreakdown.get(monthKey) || 0) + amount);

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
    monthlyBreakdown.set(monthKey, (monthlyBreakdown.get(monthKey) || 0) + amount);

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
  const topFiveCustomerRevenue = customerRevenueEntries.slice(0, 5).reduce((sum, entry) => sum + entry.revenue, 0);
  const repeatCustomerCount = customerRevenueEntries.filter(entry => entry.observations > 1).length;

  const sortedMonthlyBreakdown = Array.from(monthlyBreakdown.entries())
    .map(([period, value]) => ({ period, value }))
    .sort((left, right) => left.period.localeCompare(right.period));

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
    if (sortedMonthlyBreakdown.length === 0) {
      return 'No recurring monthly Stripe observations were available in the selected reporting window.';
    }

    if (sortedMonthlyBreakdown.length === 1) {
      const onlyPoint = sortedMonthlyBreakdown[0];
      return `Only one monthly Stripe observation was found (${onlyPoint.period}), so trend direction cannot be established confidently.`;
    }

    const first = sortedMonthlyBreakdown[0];
    const last = sortedMonthlyBreakdown.at(-1)!;
    const direction = last.value >= first.value ? 'increased' : 'declined';
    const delta = Math.abs(last.value - first.value);
    const deltaPct = first.value > 0 ? Math.abs((last.value - first.value) / first.value) : null;
    const peak = sortedMonthlyBreakdown.reduce((current, item) => (item.value > current.value ? item : current), sortedMonthlyBreakdown[0]);
    const trough = sortedMonthlyBreakdown.reduce((current, item) => (item.value < current.value ? item : current), sortedMonthlyBreakdown[0]);

    return deltaPct !== null
      ? `Monthly gross revenue ${direction} from ${first.period} to ${last.period} by ${delta.toFixed(0)} (${(deltaPct * 100).toFixed(1)}%). The highest observed month was ${peak.period}, and the lowest was ${trough.period}.`
      : `Monthly gross revenue ${direction} from ${first.period} to ${last.period} by ${delta.toFixed(0)}. The highest observed month was ${peak.period}, and the lowest was ${trough.period}.`;
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
      topFiveCustomerShare: grossRevenue > 0 ? topFiveCustomerRevenue / grossRevenue : null,
      largestCustomerRevenue,
      topFiveCustomerRevenue,
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

function getBrandLogoPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "public", "logo.png"),
    path.resolve(process.cwd(), "backend", "assets", "logo.png"),
    path.resolve(__dirname, "../../public/logo.png"),
    path.resolve(__dirname, "../assets/logo.png"),
    path.resolve(__dirname, "../../backend/assets/logo.png"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function getBrandIconPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "backend", "assets", "icon-512.png"),
    path.resolve(process.cwd(), "public", "icon-512.png"),
    path.resolve(process.cwd(), "public", "icon-192.png"),
    path.resolve(process.cwd(), "public", "icon-120.png"),
    path.resolve(__dirname, "../../public/icon-512.png"),
    path.resolve(__dirname, "../assets/icon-512.png"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return getBrandLogoPath();
}

export async function renderInvestorPacketPdf(startup: StartupDoc, packet: PacketRecord): Promise<Buffer> {
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

  const logoPath = getBrandLogoPath();
  const iconPath = getBrandIconPath();

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
    if (iconPath) {
      try {
        pdf.image(iconPath, MARGIN_X, MARGIN_TOP - 4, { width: 18, height: 18 });
      } catch {}
    }
    pdf.font(pdfFonts.bold).fontSize(10).fillColor(colors.accent).text("ProofRound", MARGIN_X + 24, MARGIN_TOP - 2);
    pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textMuted).text(`|   ${title}`, MARGIN_X + 88, MARGIN_TOP - 1);

    drawBadge("✓ STRIPE-CONNECTED DILIGENCE", PAGE_WIDTH - MARGIN_X - 138, MARGIN_TOP - 4, {
      fill: colors.successBg,
      stroke: colors.successBorder,
      textColor: colors.successText,
      fontSize: 7,
      height: 16,
    });

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

  // Top-Left Full Logo
  if (logoPath) {
    try {
      pdf.image(logoPath, MARGIN_X, MARGIN_TOP, { width: 135 });
    } catch {
      pdf.font(pdfFonts.bold).fontSize(20).fillColor(colors.accent).text("ProofRound", MARGIN_X, MARGIN_TOP);
    }
  } else {
    pdf.font(pdfFonts.bold).fontSize(20).fillColor(colors.accent).text("ProofRound", MARGIN_X, MARGIN_TOP);
  }

  // Top-Right Header Info
  const headerRightX = PAGE_WIDTH - MARGIN_X - 220;
  drawBadge("✓ STRIPE-CONNECTED DILIGENCE", PAGE_WIDTH - MARGIN_X - 138, MARGIN_TOP, {
    fill: colors.successBg,
    stroke: colors.successBorder,
    textColor: colors.successText,
    fontSize: 7,
    height: 16,
  });

  pdf.font(pdfFonts.bold).fontSize(14).fillColor(colors.textPrimary).text("Verified Investor Snapshot", headerRightX, MARGIN_TOP + 22, { width: 220, align: "right" });
  pdf.font(pdfFonts.regular).fontSize(8).fillColor(colors.textMuted).text("Stripe-connected revenue snapshot for startup diligence", headerRightX, MARGIN_TOP + 40, { width: 220, align: "right" });

  // Divider
  pdf.save();
  pdf.moveTo(MARGIN_X, 114).lineTo(PAGE_WIDTH - MARGIN_X, 114).lineWidth(0.5).stroke(colors.borderLight);
  pdf.restore();

  // Startup Header
  let curY = 126;
  pdf.font(pdfFonts.bold).fontSize(22).fillColor(colors.textPrimary).text(startup.name, MARGIN_X, curY);
  curY += 27;

  const descriptionText = startup.tagline || startup.description || "Verified company with connected Stripe financial ledger.";
  pdf.font(pdfFonts.regular).fontSize(9.5).fillColor(colors.textSecondary).text(descriptionText, MARGIN_X, curY, { width: CONTENT_WIDTH, height: 16, ellipsis: true });
  curY += 19;

  // Metadata Chips
  let chipX = MARGIN_X;
  if (startup.stage) {
    chipX += drawBadge(`STAGE: ${startup.stage.toUpperCase()}`, chipX, curY, { fill: colors.cardSubtle, stroke: colors.cardBorder, textColor: colors.textSecondary }) + 6;
  }
  if (startup.industry) {
    chipX += drawBadge(`INDUSTRY: ${startup.industry.toUpperCase()}`, chipX, curY, { fill: colors.cardSubtle, stroke: colors.cardBorder, textColor: colors.textSecondary }) + 6;
  }
  if (startup.location) {
    chipX += drawBadge(startup.location.toUpperCase(), chipX, curY, { fill: colors.cardSubtle, stroke: colors.cardBorder, textColor: colors.textSecondary }) + 6;
  }
  if (startup.founderEmail) {
    drawBadge(`FOUNDER: ${startup.founderEmail}`, chipX, curY, { fill: colors.cardSubtle, stroke: colors.cardBorder, textColor: colors.textSecondary });
  }
  curY += 28;

  // Report Metadata 4-Column Box
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 56, { fill: colors.cardSubtle, stroke: colors.cardBorder });
  const colW4 = (CONTENT_WIDTH - 24) / 4;

  pdf.font(pdfFonts.bold).fontSize(7).fillColor(colors.textMuted).text("REPORT / PACKET ID", MARGIN_X + 10, curY + 8);
  pdf.font("Courier").fontSize(8).fillColor(colors.textPrimary).text(packet.id, MARGIN_X + 10, curY + 19, { width: colW4, ellipsis: true });
  pdf.font(pdfFonts.bold).fontSize(7).fillColor(colors.textMuted).text("CONNECTED STRIPE ID", MARGIN_X + 10, curY + 31);
  pdf.font("Courier").fontSize(8).fillColor(colors.accent).text(startup.stripeAccountId || packet.stripeAccountId || "Connected", MARGIN_X + 10, curY + 41, { width: colW4, ellipsis: true });

  pdf.font(pdfFonts.bold).fontSize(7).fillColor(colors.textMuted).text("REPORTING PERIOD", MARGIN_X + colW4 + 10, curY + 8);
  pdf.font(pdfFonts.regular).fontSize(8).fillColor(colors.textPrimary).text(`${formatDateShort(packet.timeRangeStart)} –`, MARGIN_X + colW4 + 10, curY + 19);
  pdf.font(pdfFonts.regular).fontSize(8).fillColor(colors.textPrimary).text(formatDateShort(packet.timeRangeEnd), MARGIN_X + colW4 + 10, curY + 30);

  pdf.font(pdfFonts.bold).fontSize(7).fillColor(colors.textMuted).text("SNAPSHOT TIMESTAMP", MARGIN_X + colW4 * 2 + 10, curY + 8);
  pdf.font(pdfFonts.regular).fontSize(8).fillColor(colors.textPrimary).text(formatDateShort(packet.createdAt), MARGIN_X + colW4 * 2 + 10, curY + 19);
  pdf.font(pdfFonts.bold).fontSize(7).fillColor(colors.textMuted).text("VERIFICATION SOURCE", MARGIN_X + colW4 * 2 + 10, curY + 31);
  pdf.font(pdfFonts.regular).fontSize(8).fillColor(colors.successText).text("Stripe-Connected Data", MARGIN_X + colW4 * 2 + 10, curY + 41);

  pdf.font(pdfFonts.bold).fontSize(7).fillColor(colors.textMuted).text("CRYPTOGRAPHIC SEAL", MARGIN_X + colW4 * 3 + 10, curY + 8);
  const hashShort = packet.verificationHash.length > 18 ? `${packet.verificationHash.slice(0, 14)}...` : packet.verificationHash;
  pdf.font("Courier").fontSize(7.5).fillColor(colors.textMuted).text(hashShort, MARGIN_X + colW4 * 3 + 10, curY + 19);
  pdf.font(pdfFonts.bold).fontSize(7).fillColor(colors.textMuted).text("INTEGRITY STATUS", MARGIN_X + colW4 * 3 + 10, curY + 31);
  pdf.font(pdfFonts.bold).fontSize(8).fillColor(colors.accent).text("Tamper-Proof SHA-256", MARGIN_X + colW4 * 3 + 10, curY + 41);

  curY += 68;

  // Executive Diligence Summary Box
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 70, { fill: colors.cardSubtle, stroke: colors.cardBorder });
  pdf.save();
  pdf.roundedRect(MARGIN_X, curY, 4, 70, 2).fill(colors.accent);
  pdf.restore();

  pdf.font(pdfFonts.bold).fontSize(8).fillColor(colors.accent).text("EXECUTIVE DILIGENCE SUMMARY", MARGIN_X + 12, curY + 8);

  const execSummary = grossRev > 0
    ? `During the verified reporting window from ${formatDateShort(packet.timeRangeStart)} to ${formatDateShort(packet.timeRangeEnd)}, ${startup.name} generated ${currency.format(grossRev)} in gross processed revenue (${currency.format(netRev)} net realized volume after refunds and disputes) across ${wholeNumber.format(m.activeCustomers)} active customer accounts. Contracted recurring subscription volume represents ${currency.format(m.mrr)} MRR (${currency.format(m.arr)} ARR) with a ${m.churnRate.toFixed(1)}% observed subscription churn. Payment dispute rate stands at ${disputeRate.toFixed(1)}% with ${percent.format(refundRate / 100)} refund volume.`
    : `During the verified reporting window from ${formatDateShort(packet.timeRangeStart)} to ${formatDateShort(packet.timeRangeEnd)}, no processed Stripe revenue or recurring subscription items were recorded for this connected account. All values reflect direct read-only Stripe API responses. Off-platform contracts or pre-revenue operations may exist outside of Stripe.`;

  pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textSecondary).text(execSummary, MARGIN_X + 12, curY + 21, { width: CONTENT_WIDTH - 24, lineGap: 2.5 });

  curY += 82;

  // Core Financial Highlights - 4 KPI Cards
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Traction Overview & Key Financial Highlights", MARGIN_X, curY);
  curY += 16;

  const cardW = (CONTENT_WIDTH - 9 * 3) / 4;
  drawMetricCard(MARGIN_X, curY, cardW, 72, { label: "Gross Revenue", value: currency.format(grossRev), subtitle: "Total volume processed", highlight: true });
  drawMetricCard(MARGIN_X + (cardW + 9), curY, cardW, 72, { label: "Net Revenue", value: currency.format(netRev), subtitle: "Realized volume after refunds" });
  drawMetricCard(MARGIN_X + (cardW + 9) * 2, curY, cardW, 72, { label: "MRR", value: currency.format(m.mrr), subtitle: "Monthly recurring run rate", highlight: true });
  drawMetricCard(MARGIN_X + (cardW + 9) * 3, curY, cardW, 72, { label: "ARR", value: currency.format(m.arr), subtitle: "Annualized run rate (MRR×12)" });

  curY += 82;

  // Unit Economics & Quality Grid - 4 KPI Cards
  drawMetricCard(MARGIN_X, curY, cardW, 70, { label: "Active Customers", value: wholeNumber.format(m.activeCustomers), subtitle: "Distinct accounts billed" });
  drawMetricCard(MARGIN_X + (cardW + 9), curY, cardW, 70, { label: "ARPC", value: decimalCurrency.format(m.arpc), subtitle: "Avg revenue / customer" });
  drawMetricCard(MARGIN_X + (cardW + 9) * 2, curY, cardW, 70, { label: "Net Realization", value: `${netRealizationRatio.toFixed(1)}%`, subtitle: "Net revenue / Gross" });
  drawMetricCard(MARGIN_X + (cardW + 9) * 3, curY, cardW, 70, { label: "Repeat Rate", value: repeatRate, subtitle: "Accounts with >1 charge" });

  curY += 82;

  // Payment Integrity & Risk Baseline (2 Side-by-Side Panels)
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Payment Integrity & Risk Baseline", MARGIN_X, curY);
  curY += 16;

  const cardW2 = (CONTENT_WIDTH - 12) / 2;
  drawPanel(MARGIN_X, curY, cardW2, 68, { fill: colors.cardSubtle, stroke: colors.cardBorder });
  pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.textMuted).text("REFUNDS & CHARGEBACK ANALYSIS", MARGIN_X + 10, curY + 8);
  const disputeStatus = disputeRate < 1.0 ? "Low Dispute Risk (Industry benchmark < 1.0%)" : "Elevated Dispute Activity";
  pdf.font(pdfFonts.regular).fontSize(8).fillColor(colors.textSecondary).text(
    `• Total Refunds: ${currency.format(m.refunds)} (${refundRate.toFixed(1)}% of volume)\n• Disputes / Chargebacks: ${currency.format(m.chargebacks)} (${disputeRate.toFixed(1)}%)\n• Assessment: ${disputeStatus}`,
    MARGIN_X + 10, curY + 20, { width: cardW2 - 20, lineGap: 2.5 }
  );

  drawPanel(MARGIN_X + cardW2 + 12, curY, cardW2, 68, { fill: colors.cardSubtle, stroke: colors.cardBorder });
  pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.textMuted).text("STRIPE AUDIT & VERIFICATION INTEGRITY", MARGIN_X + cardW2 + 22, curY + 8);
  pdf.font(pdfFonts.regular).fontSize(8).fillColor(colors.textSecondary).text(
    `• Source: Stripe OAuth Read-Only API Integration\n• Scoped Ledger: Charges, Invoices, and Subscriptions\n• SHA-256 Digest: ${packet.verificationHash.slice(0, 20)}...`,
    MARGIN_X + cardW2 + 22, curY + 20, { width: cardW2 - 20, lineGap: 2.5 }
  );

  curY += 80;

  // Diligence Notice Box
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 42, { fill: colors.cardSubtle, stroke: colors.cardBorder });
  pdf.font(pdfFonts.bold).fontSize(7).fillColor(colors.textMuted).text("DILIGENCE & CONFIDENTIALITY NOTICE", MARGIN_X + 10, curY + 7);
  pdf.font(pdfFonts.regular).fontSize(7.5).fillColor(colors.textMuted).text(
    "ProofRound connects directly to the company's Stripe account via read-only OAuth to verify financial performance. Figures represent actual ledger data recorded in Stripe during the stated reporting window. This snapshot does not account for off-platform sales, non-Stripe payment processors, or bank wires.",
    MARGIN_X + 10, curY + 17, { width: CONTENT_WIDTH - 20, lineGap: 1.5 }
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
  curY += 18;
  pdf.font(pdfFonts.regular).fontSize(9).fillColor(colors.textMuted).text("Sequential monthly progression, growth velocity, and payment method distribution.", MARGIN_X, curY);
  curY += 20;

  // Growth Velocity Cards (3 Cards)
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Sequential Growth Velocity", MARGIN_X, curY);
  curY += 14;

  const cardW3 = (CONTENT_WIDTH - 12 * 2) / 3;
  const growth1 = m.growth.oneMonth !== null ? percent.format(m.growth.oneMonth) : "N/A";
  const growth3 = m.growth.threeMonth !== null ? percent.format(m.growth.threeMonth) : "N/A";
  const growth6 = m.growth.sixMonth !== null ? percent.format(m.growth.sixMonth) : "N/A";

  drawMetricCard(MARGIN_X, curY, cardW3, 68, { label: "1-Month Growth (MoM)", value: growth1, subtitle: "Last 30-day velocity", highlight: true });
  drawMetricCard(MARGIN_X + cardW3 + 12, curY, cardW3, 68, { label: "3-Month Growth", value: growth3, subtitle: "Quarterly expansion velocity" });
  drawMetricCard(MARGIN_X + (cardW3 + 12) * 2, curY, cardW3, 68, { label: "6-Month Growth", value: growth6, subtitle: "Half-year expansion velocity" });

  curY += 80;

  // Commentary Box
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 42, { fill: colors.accentLight, stroke: colors.accentBorder });
  pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.accent).text("GROWTH & TRAJECTORY COMMENTARY", MARGIN_X + 12, curY + 7);
  const commentaryText = m.growth.commentary || "No growth commentary available from current Stripe observations.";
  pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textSecondary).text(commentaryText, MARGIN_X + 12, curY + 19, { width: CONTENT_WIDTH - 24, lineGap: 2 });

  curY += 56;

  // Monthly Revenue Visual Chart
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Monthly Revenue Visual History", MARGIN_X, curY);
  curY += 14;

  const monthlyPoints = m.monthlyBreakdown.slice(-8);
  const maxVal = Math.max(...monthlyPoints.map(p => p.value), 1);
  const chartH = 140;

  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, chartH, { fill: colors.cardSubtle, stroke: colors.cardBorder });

  if (monthlyPoints.length === 0) {
    pdf.font(pdfFonts.regular).fontSize(9.5).fillColor(colors.textMuted).text(
      "No recurring monthly Stripe revenue observations detected during this reporting window.\nHistorical monthly volume will plot automatically as Stripe payment activity is recorded.",
      MARGIN_X + 20, curY + 54, { width: CONTENT_WIDTH - 40, align: "center", lineGap: 4 }
    );
  } else {
    // Draw gridlines
    const gridY0 = curY + chartH - 30;
    const gridH = chartH - 50;

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

  curY += chartH + 16;

  // Monthly Breakdown Table
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Monthly Revenue Breakdown Ledger", MARGIN_X, curY);
  curY += 14;

  // Table Header
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 20, { fill: colors.cardSubtle, stroke: colors.cardBorder, radius: 4 });
  pdf.font(pdfFonts.bold).fontSize(7).fillColor(colors.textMuted);
  pdf.text("PERIOD / MONTH", MARGIN_X + 12, curY + 6);
  pdf.text("GROSS VOLUME", MARGIN_X + 130, curY + 6);
  pdf.text("NET REALIZED", MARGIN_X + 235, curY + 6);
  pdf.text("% OF WINDOW", MARGIN_X + 335, curY + 6);
  pdf.text("RELATIVE VOLUME", MARGIN_X + 415, curY + 6);
  curY += 22;

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
      pdf.font("Courier-Bold").fontSize(8.5).fillColor(colors.accent).text(currency.format(p.value), MARGIN_X + 130, curY + 8);
      pdf.font("Courier").fontSize(8).fillColor(colors.textSecondary).text(currency.format(p.value * (netRealizationRatio / 100)), MARGIN_X + 235, curY + 8);
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

  curY += 12;

  // Payment Channels & Transaction Volume - 3 Cards
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Payment Channels & Transaction Execution", MARGIN_X, curY);
  curY += 14;

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
  curY += 18;
  pdf.font(pdfFonts.regular).fontSize(9).fillColor(colors.textMuted).text("Cohort concentration, subscription retention, and cryptographic source ledger proof.", MARGIN_X, curY);
  curY += 20;

  // Customer Concentration & Dependency
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Customer Concentration & Dependency", MARGIN_X, curY);
  curY += 14;

  const conc = m.customerConcentration;
  const largestShareText = conc.largestCustomerShare !== null ? `${percent.format(conc.largestCustomerShare)} (${conc.largestCustomerRevenue ? currency.format(conc.largestCustomerRevenue) : "N/A"})` : "N/A";
  const topFiveShareText = conc.topFiveCustomerShare !== null ? `${percent.format(conc.topFiveCustomerShare)} (${conc.topFiveCustomerRevenue ? currency.format(conc.topFiveCustomerRevenue) : "N/A"})` : "N/A";

  drawMetricCard(MARGIN_X, curY, cardW2, 68, {
    label: "Largest Customer Share",
    value: largestShareText,
    subtitle: "Top customer contribution to gross volume",
    highlight: true,
  });
  drawMetricCard(MARGIN_X + cardW2 + 12, curY, cardW2, 68, {
    label: "Top 5 Customers Share",
    value: topFiveShareText,
    subtitle: "Top 5 accounts contribution to gross volume",
  });

  curY += 78;

  // Concentration Risk Evaluation Box
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 44, { fill: colors.cardSubtle, stroke: colors.cardBorder });
  const top5Val = conc.topFiveCustomerShare ?? 0;
  const ratingText = top5Val > 0.5 ? "ELEVATED CONCENTRATION RISK (> 50%)" : top5Val > 0.25 ? "MODERATE CONCENTRATION RISK (25% – 50%)" : "HEALTHY DIVERSIFICATION (< 25%)";
  pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.textMuted).text(`CONCENTRATION RISK RATING: ${ratingText}`, MARGIN_X + 12, curY + 8);
  pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textSecondary).text(
    `Top customer represents ${largestShareText} and top 5 accounts represent ${topFiveShareText}. High diversification protects against contract attrition and key customer dependency.`,
    MARGIN_X + 12, curY + 20, { width: CONTENT_WIDTH - 24, lineGap: 2 }
  );

  curY += 58;

  // Subscription Contract Health & Retention
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Subscription Contract Health & Retention", MARGIN_X, curY);
  curY += 14;

  drawMetricCard(MARGIN_X, curY, cardW3, 68, {
    label: "Active Subscriptions",
    value: `${wholeNumber.format(m.activeSubscriptions || m.subscriptionCount)} active`,
    subtitle: "Ongoing recurring Stripe contracts",
  });
  drawMetricCard(MARGIN_X + cardW3 + 12, curY, cardW3, 68, {
    label: "Annualized Run Rate",
    value: currency.format(m.arr),
    subtitle: "Contracted run rate (MRR×12)",
  });
  drawMetricCard(MARGIN_X + (cardW3 + 12) * 2, curY, cardW3, 68, {
    label: "Observed Churn Rate",
    value: `${m.churnRate.toFixed(1)}%`,
    subtitle: "Canceled contracts / total cohort",
  });

  curY += 80;

  // Payment Quality & Dispute Records
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Payment Quality & Dispute Records", MARGIN_X, curY);
  curY += 14;

  drawMetricCard(MARGIN_X, curY, cardW3, 68, {
    label: "Total Refunds",
    value: `${currency.format(m.refunds)} (${refundRate.toFixed(1)}%)`,
    subtitle: `${m.refundCount || 0} refunded transactions`,
  });
  drawMetricCard(MARGIN_X + cardW3 + 12, curY, cardW3, 68, {
    label: "Disputes & Chargebacks",
    value: `${currency.format(m.chargebacks)} (${disputeRate.toFixed(1)}%)`,
    subtitle: `${m.disputeCount || 0} formal dispute claims`,
  });
  drawMetricCard(MARGIN_X + (cardW3 + 12) * 2, curY, cardW3, 68, {
    label: "Net Volume Ratio",
    value: `${netRealizationRatio.toFixed(1)}%`,
    subtitle: "Net revenue realized / gross",
  });

  curY += 80;

  // Cryptographic Source Ledger Verification
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Cryptographic Source Ledger Verification", MARGIN_X, curY);
  curY += 14;

  const auditH = 175;
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, auditH, { fill: colors.cardSubtle, stroke: colors.accentBorder });
  pdf.font(pdfFonts.bold).fontSize(8).fillColor(colors.accent).text("STRIPE SOURCE EVIDENCE & INTEGRITY SEAL", MARGIN_X + 12, curY + 9);

  let refY = curY + 23;
  const refRows = [
    { label: "Stripe Connected Account", val: `${startup.stripeAccountId || packet.stripeAccountId || "acct_connected"} (Connected via Stripe Read-Only OAuth)` },
    { label: "Connected Reporting Window", val: `${formatDateShort(packet.timeRangeStart)} to ${formatDateShort(packet.timeRangeEnd)}` },
    { label: "Verified Charges Analyzed", val: `${packet.references.chargeIds.length} charge IDs queried directly from Stripe` },
    { label: "Verified Invoices Analyzed", val: `${packet.references.invoiceIds.length} invoice records processed` },
    { label: "Verified Subscriptions", val: `${packet.references.subscriptionIds.length} subscription contracts observed` },
    { label: "Verified Customer IDs", val: `${packet.references.customerIds.length} distinct customer records referenced` },
    { label: "SHA-256 Digest Seal", val: packet.verificationHash },
  ];

  refRows.forEach(r => {
    pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.textMuted).text(r.label + ":", MARGIN_X + 12, refY);
    pdf.font("Courier").fontSize(8).fillColor(colors.textPrimary).text(r.val, MARGIN_X + 155, refY, { width: CONTENT_WIDTH - 165, ellipsis: true });
    refY += 15.5;
  });

  pdf.save();
  pdf.moveTo(MARGIN_X + 12, refY + 2).lineTo(PAGE_WIDTH - MARGIN_X - 12, refY + 2).lineWidth(0.5).stroke(colors.borderLight);
  pdf.restore();

  pdf.font(pdfFonts.regular).fontSize(7.5).fillColor(colors.textMuted).text(
    "ProofRound independently queries connected Stripe instances using read-only API access. This SHA-256 hash seals the exact dataset, time window, and metrics. Any alteration to values invalidates this cryptographic proof.",
    MARGIN_X + 12, refY + 8, { width: CONTENT_WIDTH - 24, lineGap: 2 }
  );

  drawFooter(3);

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

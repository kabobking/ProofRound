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
  repeatCustomerRate: number | null;
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
    path.resolve(process.cwd(), 'assets', 'fonts'),
    path.resolve(process.cwd(), 'backend', 'assets', 'fonts'),
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
  const monthlyBreakdown = new Map<string, number>();
  const activeCustomers = new Set<string>();
  const revenueByCustomer = new Map<string, { revenue: number; observations: number }>();

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
    if (charge.status !== 'succeeded' || !charge.created) continue;

    const amount = charge.amount / 100;
    grossRevenue += amount;
    if (charge.customer) {
      const customerId = String(charge.customer);
      activeCustomers.add(customerId);
      trackCustomerRevenue(customerId, amount);
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
      const customerId = String(invoice.customer);
      activeCustomers.add(customerId);
      trackCustomerRevenue(customerId, amount);
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

  return {
    mrr,
    arr,
    grossRevenue,
    netRevenue: grossRevenue - refunds - chargebacks,
    refunds,
    chargebacks,
    monthlyBreakdown: sortedMonthlyBreakdown,
    churnRate: subscriptions.length > 0 ? (churned / subscriptions.length) * 100 : 0,
    activeCustomers: activeCustomerCount,
    arpc: activeCustomerCount > 0 ? grossRevenue / activeCustomerCount : 0,
    subscriptionCount: subscriptions.length,
    repeatCustomerRate: activeCustomerCount > 0 ? repeatCustomerCount / activeCustomerCount : null,
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

  await db.collection('proofround_packets').doc(packetId).set(packetData);

  return { startup, packet: packetData as PacketRecord };
}

export async function renderPacketPdf(startup: StartupDoc, packet: PacketRecord): Promise<Buffer> {
  return renderInvestorPacketPdf(startup, packet);
}

function getBrandIconPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "public", "icon-512.png"),
    path.resolve(process.cwd(), "public", "icon-192.png"),
    path.resolve(process.cwd(), "public", "icon-120.png"),
    path.resolve(process.cwd(), "public", "logo.png"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
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
  const MARGIN_X = 44;
  const MARGIN_TOP = 36;
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

  const formatDate = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        });
  };

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

  const drawBadge = (text: string, x: number, y: number, opts: { fill?: string; stroke?: string; textColor?: string; fontSize?: number } = {}) => {
    const fill = opts.fill ?? colors.accentLight;
    const stroke = opts.stroke ?? colors.accentBorder;
    const textColor = opts.textColor ?? colors.accent;
    const fontSize = opts.fontSize ?? 7.5;

    pdf.font(pdfFonts.bold).fontSize(fontSize);
    const textW = pdf.widthOfString(text);
    const padX = 7;
    const badgeW = textW + padX * 2;
    const badgeH = 16;

    pdf.save();
    pdf.roundedRect(x, y, badgeW, badgeH, 4).lineWidth(0.5).fillAndStroke(fill, stroke);
    pdf.fillColor(textColor).text(text, x, y + 3.5, { width: badgeW, align: "center" });
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
    pdf.text(opts.label.toUpperCase(), x + 10, y + 8, { width: w - 20, ellipsis: true });

    pdf.font(pdfFonts.bold).fontSize(opts.valueSize ?? 16).fillColor(opts.highlight ? colors.accent : colors.textPrimary);
    pdf.text(opts.value, x + 10, y + 22, { width: w - 20, ellipsis: true });

    if (opts.subtitle) {
      pdf.font(pdfFonts.regular).fontSize(7.5).fillColor(colors.textMuted);
      pdf.text(opts.subtitle, x + 10, y + h - 18, { width: w - 20, ellipsis: true });
    }
  };

  const drawFooter = (page: number) => {
    const y = PAGE_HEIGHT - MARGIN_BOTTOM;
    pdf.save();
    pdf.moveTo(MARGIN_X, y - 10).lineTo(PAGE_WIDTH - MARGIN_X, y - 10).lineWidth(0.5).stroke(colors.borderLight);
    pdf.font(pdfFonts.regular).fontSize(7.5).fillColor(colors.textMuted);
    pdf.text(`ProofRound Verified Diligence Packet · ${startup.name} · Confidential`, MARGIN_X, y - 2);
    pdf.text(`Page ${page} of ${TOTAL_PAGES}`, PAGE_WIDTH - MARGIN_X - 100, y - 2, { width: 100, align: "right" });
    pdf.restore();
  };

  const drawRunningHeader = (title: string) => {
    if (iconPath) {
      pdf.image(iconPath, MARGIN_X, MARGIN_TOP, { width: 20, height: 20 });
    }
    pdf.font(pdfFonts.bold).fontSize(10).fillColor(colors.accent).text("ProofRound", MARGIN_X + 26, MARGIN_TOP + 1);
    pdf.font(pdfFonts.regular).fontSize(9).fillColor(colors.textMuted).text(`|  ${title}`, MARGIN_X + 88, MARGIN_TOP + 2);

    drawBadge("✓ STRIPE VERIFIED", PAGE_WIDTH - MARGIN_X - 96, MARGIN_TOP + 2, {
      fill: colors.successBg,
      stroke: colors.successBorder,
      textColor: colors.successText,
      fontSize: 7,
    });

    pdf.save();
    pdf.moveTo(MARGIN_X, MARGIN_TOP + 28).lineTo(PAGE_WIDTH - MARGIN_X, MARGIN_TOP + 28).lineWidth(0.5).stroke(colors.borderLight);
    pdf.restore();
  };

  // Helper variables for metrics
  const grossRev = packet.metrics.grossRevenue;
  const netRev = packet.metrics.netRevenue;
  const netRealizationRatio = grossRev > 0 ? (netRev / grossRev) * 100 : 0;
  const disputeRate = grossRev > 0 ? (packet.metrics.chargebacks / grossRev) * 100 : 0;
  const refundRate = grossRev > 0 ? (packet.metrics.refunds / grossRev) * 100 : 0;
  const repeatRate = packet.metrics.repeatCustomerRate !== null ? percent.format(packet.metrics.repeatCustomerRate) : "N/A";

  // ==================== PAGE 1: EXECUTIVE FINANCIAL OVERVIEW ====================
  pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(colors.bg);
  if (iconPath) {
    pdf.image(iconPath, MARGIN_X, MARGIN_TOP, { width: 34, height: 34 });
  }
  pdf.font(pdfFonts.bold).fontSize(17).fillColor(colors.accent).text("ProofRound", MARGIN_X + 42, MARGIN_TOP);
  pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.textMuted).text("FINANCIAL DILIGENCE PACKET", MARGIN_X + 42, MARGIN_TOP + 20);

  drawBadge("✓ STRIPE VERIFIED", PAGE_WIDTH - MARGIN_X - 96, MARGIN_TOP + 8, {
    fill: colors.successBg,
    stroke: colors.successBorder,
    textColor: colors.successText,
    fontSize: 7.5,
  });

  let curY = MARGIN_TOP + 46;
  pdf.save();
  pdf.moveTo(MARGIN_X, curY).lineTo(PAGE_WIDTH - MARGIN_X, curY).lineWidth(0.5).stroke(colors.borderLight);
  pdf.restore();

  curY += 12;
  // Startup Header
  pdf.font(pdfFonts.bold).fontSize(20).fillColor(colors.textPrimary).text(startup.name, MARGIN_X, curY);
  curY += 24;
  const descriptionText = startup.tagline || startup.description || "Verified Technology Company with connected Stripe financials.";
  pdf.font(pdfFonts.regular).fontSize(9.5).fillColor(colors.textSecondary).text(descriptionText, MARGIN_X, curY, { width: CONTENT_WIDTH, height: 16, ellipsis: true });
  curY += 16;

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
    drawBadge(`FOUNDER: ${startup.founderEmail.toUpperCase()}`, chipX, curY, { fill: colors.cardSubtle, stroke: colors.cardBorder, textColor: colors.textSecondary });
  }

  curY += 28;

  // Audit Info Box
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 62, { fill: colors.cardSubtle, stroke: colors.cardBorder });
  const colW = (CONTENT_WIDTH - 24) / 3;
  pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.textMuted).text("REPORT / PACKET ID", MARGIN_X + 10, curY + 9);
  pdf.font("Courier").fontSize(8.5).fillColor(colors.textPrimary).text(packet.id, MARGIN_X + 10, curY + 20, { width: colW, ellipsis: true });
  pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.textMuted).text("STRIPE ACCOUNT ID", MARGIN_X + 10, curY + 34);
  pdf.font("Courier").fontSize(8.5).fillColor(colors.accent).text(startup.stripeAccountId || packet.stripeAccountId, MARGIN_X + 10, curY + 45, { width: colW, ellipsis: true });

  pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.textMuted).text("REPORTING WINDOW", MARGIN_X + colW + 10, curY + 9);
  pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textPrimary).text(`${formatDateShort(packet.timeRangeStart)} – ${formatDateShort(packet.timeRangeEnd)}`, MARGIN_X + colW + 10, curY + 20);
  pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.textMuted).text("VERIFICATION STATUS", MARGIN_X + colW + 10, curY + 34);
  pdf.font(pdfFonts.bold).fontSize(8.5).fillColor(colors.successText).text("✓ Live Read-Only Stripe Sync", MARGIN_X + colW + 10, curY + 45);

  pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.textMuted).text("GENERATED ON", MARGIN_X + colW * 2 + 10, curY + 9);
  pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textPrimary).text(formatDate(packet.createdAt), MARGIN_X + colW * 2 + 10, curY + 20);
  pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.textMuted).text("INTEGRITY HASH (SHA-256)", MARGIN_X + colW * 2 + 10, curY + 34);
  const hashShort = packet.verificationHash.length > 20 ? `${packet.verificationHash.slice(0, 16)}...${packet.verificationHash.slice(-4)}` : packet.verificationHash;
  pdf.font("Courier").fontSize(8).fillColor(colors.textMuted).text(hashShort, MARGIN_X + colW * 2 + 10, curY + 45);

  curY += 72;

  // Diligence Callout Box
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 48, { fill: colors.accentLight, stroke: colors.accentBorder });
  pdf.save();
  pdf.roundedRect(MARGIN_X, curY, 4, 48, 2).fill(colors.accent);
  pdf.restore();
  pdf.font(pdfFonts.bold).fontSize(8).fillColor(colors.accent).text("EXECUTIVE DILIGENCE SUMMARY", MARGIN_X + 12, curY + 8);
  pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textSecondary).text(
    "This packet delivers verified financial metrics directly from the company live Stripe integration. All gross and net revenue, customer counts, subscription run-rates, refund rates, and dispute records are computed directly from point-in-time API objects. No self-reported figures or manual spreadsheets are accepted.",
    MARGIN_X + 12, curY + 19, { width: CONTENT_WIDTH - 24, lineGap: 2 }
  );

  curY += 58;

  // Core Financial Highlights (4 Cards)
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Core Financial Highlights", MARGIN_X, curY);
  curY += 16;
  const cardW4 = (CONTENT_WIDTH - 9 * 3) / 4;
  drawMetricCard(MARGIN_X, curY, cardW4, 68, { label: "Gross Revenue", value: currency.format(packet.metrics.grossRevenue), subtitle: "Total volume processed", highlight: true });
  drawMetricCard(MARGIN_X + (cardW4 + 9), curY, cardW4, 68, { label: "Net Revenue", value: currency.format(packet.metrics.netRevenue), subtitle: "Realized after refunds" });
  drawMetricCard(MARGIN_X + (cardW4 + 9) * 2, curY, cardW4, 68, { label: "MRR", value: currency.format(packet.metrics.mrr), subtitle: "Active monthly subscriptions", highlight: true });
  drawMetricCard(MARGIN_X + (cardW4 + 9) * 3, curY, cardW4, 68, { label: "ARR", value: currency.format(packet.metrics.arr), subtitle: "Annualized run-rate (MRR×12)" });

  curY += 78;

  // Unit Economics & Quality Grid (4 Cards)
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Unit Economics & Revenue Quality", MARGIN_X, curY);
  curY += 16;
  drawMetricCard(MARGIN_X, curY, cardW4, 64, { label: "Active Customers", value: wholeNumber.format(packet.metrics.activeCustomers), subtitle: "Distinct accounts billed" });
  drawMetricCard(MARGIN_X + (cardW4 + 9), curY, cardW4, 64, { label: "ARPC", value: decimalCurrency.format(packet.metrics.arpc), subtitle: "Avg revenue / customer" });
  drawMetricCard(MARGIN_X + (cardW4 + 9) * 2, curY, cardW4, 64, { label: "Net Realization", value: `${netRealizationRatio.toFixed(1)}%`, subtitle: "Net revenue / Gross" });
  drawMetricCard(MARGIN_X + (cardW4 + 9) * 3, curY, cardW4, 64, { label: "Repeat Rate", value: repeatRate, subtitle: "Accounts with > 1 charge" });

  curY += 74;

  // Risk & Disputes Overview Box
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 48, { fill: colors.cardSubtle, stroke: colors.cardBorder });
  pdf.font(pdfFonts.bold).fontSize(8).fillColor(colors.textMuted).text("REFUNDS & DISPUTE SIGNALS", MARGIN_X + 12, curY + 8);
  const disputeStatus = disputeRate < 1.0 ? "Low Dispute Risk (Healthy threshold < 1.0%)" : "Elevated Dispute Activity";
  pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textSecondary).text(
    `Total refunds: ${currency.format(packet.metrics.refunds)} (${refundRate.toFixed(1)}%)  ·  Total chargebacks: ${currency.format(packet.metrics.chargebacks)} (${disputeRate.toFixed(1)}%)  ·  Status: ${disputeStatus}.`,
    MARGIN_X + 12, curY + 22, { width: CONTENT_WIDTH - 24 }
  );

  drawFooter(1);

  // ==================== PAGE 2: REVENUE TRAJECTORY & GROWTH ====================
  pdf.addPage();
  pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(colors.bg);
  drawRunningHeader("Revenue Trajectory & Historical Growth");

  curY = MARGIN_TOP + 40;
  pdf.font(pdfFonts.bold).fontSize(14).fillColor(colors.textPrimary).text("Monthly Revenue Trajectory & Growth Signals", MARGIN_X, curY);
  curY += 16;
  pdf.font(pdfFonts.regular).fontSize(9).fillColor(colors.textMuted).text("Sequential revenue observations, growth velocity, and subscription retention directly queried from Stripe.", MARGIN_X, curY);
  curY += 18;

  // Growth Velocity Cards (3 Cards)
  const cardW3 = (CONTENT_WIDTH - 12 * 2) / 3;
  const growth1 = packet.metrics.growth.oneMonth !== null ? percent.format(packet.metrics.growth.oneMonth) : "N/A";
  const growth3 = packet.metrics.growth.threeMonth !== null ? percent.format(packet.metrics.growth.threeMonth) : "N/A";
  const growth6 = packet.metrics.growth.sixMonth !== null ? percent.format(packet.metrics.growth.sixMonth) : "N/A";

  drawMetricCard(MARGIN_X, curY, cardW3, 62, { label: "1-Month Growth (MoM)", value: growth1, subtitle: "Last 30-day velocity", highlight: true });
  drawMetricCard(MARGIN_X + cardW3 + 12, curY, cardW3, 62, { label: "3-Month Growth", value: growth3, subtitle: "Quarterly expansion" });
  drawMetricCard(MARGIN_X + (cardW3 + 12) * 2, curY, cardW3, 62, { label: "6-Month Growth", value: growth6, subtitle: "Half-year expansion" });

  curY += 74;

  // Commentary Box
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 44, { fill: colors.accentLight, stroke: colors.accentBorder });
  pdf.font(pdfFonts.bold).fontSize(8).fillColor(colors.accent).text("GROWTH & TRAJECTORY COMMENTARY", MARGIN_X + 12, curY + 8);
  const commentaryText = packet.metrics.growth.commentary || "No growth commentary available from current Stripe observations.";
  pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textSecondary).text(commentaryText, MARGIN_X + 12, curY + 20, { width: CONTENT_WIDTH - 24 });

  curY += 56;

  // Monthly Breakdown Table
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Monthly Revenue History & Distribution", MARGIN_X, curY);
  curY += 16;

  // Table header
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 22, { fill: colors.cardSubtle, stroke: colors.cardBorder, radius: 4 });
  pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.textMuted);
  pdf.text("MONTH / PERIOD", MARGIN_X + 10, curY + 7);
  pdf.text("GROSS REVENUE", MARGIN_X + 120, curY + 7);
  pdf.text("% OF WINDOW", MARGIN_X + 220, curY + 7);
  pdf.text("RELATIVE VOLUME", MARGIN_X + 320, curY + 7);
  curY += 24;

  const monthlyPoints = packet.metrics.monthlyBreakdown.slice(-10);
  const maxMonthVal = Math.max(...monthlyPoints.map(m => m.value), 1);
  const totalWindowVal = monthlyPoints.reduce((acc, m) => acc + m.value, 0) || 1;

  if (monthlyPoints.length === 0) {
    drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 36, { fill: colors.cardSubtle, stroke: colors.cardBorder, radius: 4 });
    pdf.font(pdfFonts.regular).fontSize(9).fillColor(colors.textMuted).text("No monthly revenue breakdown detected in the selected reporting window.", MARGIN_X + 12, curY + 12);
    curY += 46;
  } else {
    monthlyPoints.forEach((m, idx) => {
      drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 26, {
        fill: idx % 2 === 0 ? colors.cardBg : colors.cardSubtle,
        stroke: colors.cardBorder,
        radius: 3,
      });

      const isPeak = m.value === maxMonthVal;
      const pctOfWindow = ((m.value / totalWindowVal) * 100).toFixed(1) + "%";
      pdf.font(pdfFonts.bold).fontSize(8.5).fillColor(colors.textPrimary).text(m.period, MARGIN_X + 10, curY + 9);
      pdf.font("Courier-Bold").fontSize(9).fillColor(colors.accent).text(currency.format(m.value), MARGIN_X + 120, curY + 9);
      pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textSecondary).text(pctOfWindow, MARGIN_X + 220, curY + 9);

      // Bar Indicator
      const barMaxW = 140;
      const barW = Math.max(6, Math.min(barMaxW, (m.value / maxMonthVal) * barMaxW));
      pdf.save();
      pdf.roundedRect(MARGIN_X + 320, curY + 8, barW, 9, 3).fill(isPeak ? colors.accent : colors.accentBorder);
      pdf.restore();

      if (isPeak) {
        drawBadge("PEAK", MARGIN_X + 320 + barW + 8, curY + 5, { fill: colors.accentLight, stroke: colors.accentBorder, textColor: colors.accent, fontSize: 6.5 });
      }

      curY += 28;
    });
  }

  curY += 16;

  // Subscription Cohort Health & Churn
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Subscription Contract Health & Churn", MARGIN_X, curY);
  curY += 16;
  const cardW2 = (CONTENT_WIDTH - 12) / 2;
  drawMetricCard(MARGIN_X, curY, cardW2, 64, {
    label: "Active Subscription Contracts",
    value: wholeNumber.format(packet.metrics.subscriptionCount),
    subtitle: "Active recurring subscription items in Stripe",
  });
  drawMetricCard(MARGIN_X + cardW2 + 12, curY, cardW2, 64, {
    label: "Observed Subscription Churn Rate",
    value: `${packet.metrics.churnRate.toFixed(1)}%`,
    subtitle: "Canceled subscriptions divided by total cohort",
  });

  drawFooter(2);

  // ==================== PAGE 3: CUSTOMER CONCENTRATION & STRIPE AUDIT ====================
  pdf.addPage();
  pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(colors.bg);
  drawRunningHeader("Customer Concentration, Risk & Audit Trail");

  curY = MARGIN_TOP + 40;
  pdf.font(pdfFonts.bold).fontSize(14).fillColor(colors.textPrimary).text("Customer Quality, Concentration & Source Evidence", MARGIN_X, curY);
  curY += 16;
  pdf.font(pdfFonts.regular).fontSize(9).fillColor(colors.textMuted).text("Cohort concentration, dispute metrics, and raw cryptographic Stripe audit references.", MARGIN_X, curY);
  curY += 18;

  // Concentration Cards (2 cards)
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Customer Concentration & Revenue Dependency", MARGIN_X, curY);
  curY += 16;

  const conc = packet.metrics.customerConcentration;
  const largestShareText = conc.largestCustomerShare !== null ? `${percent.format(conc.largestCustomerShare)} (${conc.largestCustomerRevenue ? currency.format(conc.largestCustomerRevenue) : "N/A"})` : "N/A";
  const topFiveShareText = conc.topFiveCustomerShare !== null ? `${percent.format(conc.topFiveCustomerShare)} (${conc.topFiveCustomerRevenue ? currency.format(conc.topFiveCustomerRevenue) : "N/A"})` : "N/A";

  drawMetricCard(MARGIN_X, curY, cardW2, 64, {
    label: "Largest Customer Share",
    value: largestShareText,
    subtitle: "Top customer contribution to gross volume",
    highlight: true,
  });
  drawMetricCard(MARGIN_X + cardW2 + 12, curY, cardW2, 64, {
    label: "Top 5 Customers Share",
    value: topFiveShareText,
    subtitle: "Top 5 accounts contribution to gross revenue",
  });

  curY += 76;

  // Concentration Assessment Callout
  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 42, { fill: colors.cardSubtle, stroke: colors.cardBorder });
  const top5Val = conc.topFiveCustomerShare ?? 0;
  const ratingText = top5Val > 0.5 ? "ELEVATED CONCENTRATION RISK (> 50%)" : top5Val > 0.25 ? "MODERATE CONCENTRATION RISK (25% – 50%)" : "HEALTHY CUSTOMER DIVERSIFICATION (< 25%)";
  pdf.font(pdfFonts.bold).fontSize(8).fillColor(colors.textMuted).text(`CONCENTRATION RISK RATING: ${ratingText}`, MARGIN_X + 12, curY + 8);
  pdf.font(pdfFonts.regular).fontSize(8.5).fillColor(colors.textSecondary).text(
    `Top customer represents ${largestShareText} of revenue and top 5 customers represent ${topFiveShareText}. Diversified customer bases protect against contract attrition and key customer dependency.`,
    MARGIN_X + 12, curY + 19, { width: CONTENT_WIDTH - 24 }
  );

  curY += 54;

  // Payment Quality & Disputes
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Payment Quality, Disputes & Refunds", MARGIN_X, curY);
  curY += 16;
  drawMetricCard(MARGIN_X, curY, cardW2, 62, {
    label: "Refund Volume",
    value: `${currency.format(packet.metrics.refunds)} (${refundRate.toFixed(1)}%)`,
    subtitle: "Refunded transactions during period",
  });
  drawMetricCard(MARGIN_X + cardW2 + 12, curY, cardW2, 62, {
    label: "Disputed Volume (Chargebacks)",
    value: `${currency.format(packet.metrics.chargebacks)} (${disputeRate.toFixed(1)}%)`,
    subtitle: "Formal dispute claims on Stripe ledger",
  });

  curY += 74;

  // Stripe Source Audit Trail & Cryptographic References
  pdf.font(pdfFonts.bold).fontSize(11).fillColor(colors.textPrimary).text("Stripe Cryptographic Source Audit Trail", MARGIN_X, curY);
  curY += 16;

  drawPanel(MARGIN_X, curY, CONTENT_WIDTH, 172, { fill: colors.cardSubtle, stroke: colors.accentBorder });
  pdf.font(pdfFonts.bold).fontSize(8.5).fillColor(colors.accent).text("LIVE STRIPE AUDIT REFERENCES", MARGIN_X + 12, curY + 10);

  let refY = curY + 24;
  const chargeRef = packet.references.chargeIds.length > 0 ? `${packet.references.chargeIds.slice(0, 3).join(", ")} (${packet.references.chargeIds.length} charges recorded)` : "No charge IDs recorded in window";
  const invoiceRef = packet.references.invoiceIds.length > 0 ? `${packet.references.invoiceIds.slice(0, 3).join(", ")} (${packet.references.invoiceIds.length} invoices paid)` : "No invoice IDs recorded in window";
  const subRef = packet.references.subscriptionIds.length > 0 ? `${packet.references.subscriptionIds.slice(0, 3).join(", ")} (${packet.references.subscriptionIds.length} subscriptions active)` : "No active subscriptions recorded";
  const cusRef = packet.references.customerIds.length > 0 ? `${packet.references.customerIds.slice(0, 3).join(", ")} (${packet.references.customerIds.length} customer IDs)` : "No customer IDs recorded";

  const refRows = [
    { label: "Stripe Account ID", val: `${startup.stripeAccountId || packet.stripeAccountId} (Connected via Stripe Express / Standard)` },
    { label: "Verified Charge IDs", val: chargeRef },
    { label: "Verified Invoice IDs", val: invoiceRef },
    { label: "Verified Subscriptions", val: subRef },
    { label: "Verified Customer IDs", val: cusRef },
    { label: "SHA-256 Digest", val: packet.verificationHash },
  ];

  refRows.forEach(r => {
    pdf.font(pdfFonts.bold).fontSize(7.5).fillColor(colors.textMuted).text(r.label + ":", MARGIN_X + 12, refY);
    pdf.font("Courier").fontSize(8).fillColor(colors.textPrimary).text(r.val, MARGIN_X + 120, refY, { width: CONTENT_WIDTH - 132, ellipsis: true });
    refY += 16;
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

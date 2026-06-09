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

  const pdf = new PDFDocument({ size: 'A4', margin: 0 });
  const pdfFonts = configurePdfFonts(pdf);
  const chunks: Buffer[] = [];

  const output = new Promise<Buffer>((resolve, reject) => {
    pdf.on('data', chunk => chunks.push(Buffer.from(chunk)));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
  });

  const colors = {
    paper: '#ffffff',
    surface: '#ffffff',
    surfaceMuted: '#fbfcfb',
    border: '#d6ddd5',
    borderStrong: '#b8c3b6',
    text: '#111111',
    muted: '#5f6762',
    mutedSoft: '#78827d',
    accent: '#116b3a',
    accentSoft: '#e4f0e7',
    grid: '#e8ece8',
  };

  const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  const decimalCurrency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const percent = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const wholeNumber = new Intl.NumberFormat('en-US');

  const formatDate = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        });
  };

  const truncateMiddle = (text: string, maxChars: number) => {
    if (text.length <= maxChars) {
      return text;
    }

    if (maxChars <= 3) {
      return '.'.repeat(maxChars);
    }

    const frontLength = Math.ceil((maxChars - 3) / 2);
    const backLength = Math.floor((maxChars - 3) / 2);
    return `${text.slice(0, frontLength)}...${text.slice(text.length - backLength)}`;
  };

  const shortReportId = (packetId: string) => truncateMiddle(packetId, 18);
  const shortHash = (hash: string) => `${hash.slice(0, 12)}...`;
  const formatHash = (value: string) => value.match(/.{1,8}/g)?.join(' ') ?? value;

  const PAGE_WIDTH = pdf.page.width;
  const PAGE_HEIGHT = pdf.page.height;
  const MARGIN_X = 48;
  const MARGIN_TOP = 48;
  const MARGIN_BOTTOM = 56;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
  const FOOTER_Y = PAGE_HEIGHT - 40;
  const CARD_PADDING = 14;
  const SECTION_GAP = 22;
  const ROW_GAP = 12;
  const LINE_HEIGHT = 14;
  const GRID_GAP = 16;
  const CARD_WIDTH = (CONTENT_WIDTH - GRID_GAP) / 2;
  const PAGE1_CARD_HEIGHT = 86;
  const PAGE3_CARD_HEIGHT = 86;
  const totalPages = 4;

  const paintPageBackground = () => {
    pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(colors.paper);
  };

  const startPage = () => {
    paintPageBackground();
    pdf.fillColor(colors.text);
    pdf.strokeColor(colors.border);
  };

  const drawPanel = (x: number, y: number, w: number, h: number, options?: { fill?: string; stroke?: string; radius?: number }) => {
    const fill = options?.fill ?? colors.surface;
    const stroke = options?.stroke ?? colors.border;
    const radius = options?.radius ?? 7;
    pdf.save();
    pdf.roundedRect(x, y, w, h, radius).fillAndStroke(fill, stroke);
    pdf.restore();
  };

  const drawTextBox = (
    text: string,
    x: number,
    y: number,
    widthValue: number,
    options?: {
      font?: string;
      fontSize?: number;
      color?: string;
      align?: 'left' | 'center' | 'right' | 'justify';
      lineGap?: number;
      height?: number;
      ellipsis?: boolean;
      characterSpacing?: number;
    }
  ) => {
    pdf.font(options?.font ?? pdfFonts.regular)
      .fillColor(options?.color ?? colors.text)
      .fontSize(options?.fontSize ?? 9.5)
      .text(text, x, y, {
        width: widthValue,
        align: options?.align ?? 'left',
        lineGap: options?.lineGap ?? 2,
        height: options?.height,
        ellipsis: options?.ellipsis ?? false,
        characterSpacing: options?.characterSpacing,
      });

    return y + pdf.heightOfString(text, {
      width: widthValue,
      align: options?.align ?? 'left',
      lineGap: options?.lineGap ?? 2,
    });
  };

  const drawLabelValue = (label: string, value: string, x: number, y: number, widthValue: number) => {
    drawTextBox(label.toUpperCase(), x, y, widthValue, {
      font: pdfFonts.bold,
      fontSize: 8.5,
      color: colors.muted,
      characterSpacing: 0.8,
      ellipsis: true,
      height: LINE_HEIGHT,
    });

    drawTextBox(value, x, y + LINE_HEIGHT, widthValue, {
      font: 'Courier',
      fontSize: 8.8,
      color: colors.text,
      ellipsis: true,
      height: LINE_HEIGHT,
    });

    return y + LINE_HEIGHT * 2;
  };

  const drawSectionHeader = (title: string, subtitle: string | undefined, x: number, y: number, widthValue: number) => {
    drawTextBox(title, x, y, widthValue, {
      font: pdfFonts.bold,
      fontSize: 14,
      color: colors.text,
      ellipsis: true,
      height: LINE_HEIGHT + 4,
    });
    if (subtitle) {
      drawTextBox(subtitle, x, y + 18, widthValue, {
        font: pdfFonts.regular,
        fontSize: 9.5,
        color: colors.muted,
        lineGap: 1.5,
        height: 34,
      });
    }
  };

  const drawMetricCard = (params: {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    value: string;
    detail?: string;
    emphasis?: boolean;
    fill?: string;
  }) => {
    drawPanel(params.x, params.y, params.w, params.h, {
      fill: params.fill ?? colors.surface,
      stroke: params.emphasis ? colors.borderStrong : colors.border,
      radius: 7,
    });

    const innerWidth = params.w - CARD_PADDING * 2;
    const labelY = params.y + CARD_PADDING - 1;
    drawTextBox(params.label.toUpperCase(), params.x + CARD_PADDING, labelY, innerWidth, {
      font: pdfFonts.bold,
      fontSize: 8.5,
      color: colors.muted,
      characterSpacing: 0.8,
      ellipsis: true,
      height: LINE_HEIGHT,
    });

    drawTextBox(params.value, params.x + CARD_PADDING, params.y + CARD_PADDING + 14, innerWidth, {
      font: 'Courier',
      fontSize: params.emphasis ? 22 : 17,
      color: colors.text,
      ellipsis: true,
      height: LINE_HEIGHT + 10,
    });

    if (params.detail) {
      drawTextBox(params.detail, params.x + CARD_PADDING, params.y + params.h - CARD_PADDING - LINE_HEIGHT + 1, innerWidth, {
        font: pdfFonts.regular,
        fontSize: 8.2,
        color: colors.mutedSoft,
        lineGap: 1,
        height: LINE_HEIGHT,
        ellipsis: true,
      });
    }
  };

  const drawFooter = (pageNumber: number) => {
    const lineY = FOOTER_Y - 10;
    pdf.save();
    pdf.moveTo(MARGIN_X, lineY).lineTo(PAGE_WIDTH - MARGIN_X, lineY).lineWidth(0.5).stroke(colors.border);
    pdf.restore();

    const footerText = `ProofRound Verified Packet · ${shortReportId(packet.id)} · Generated ${formatDate(packet.createdAt)} · Page ${pageNumber} of ${totalPages}`;
    drawTextBox(footerText, MARGIN_X, FOOTER_Y - 3, CONTENT_WIDTH, {
      font: pdfFonts.regular,
      fontSize: 8,
      color: colors.muted,
      ellipsis: true,
      height: LINE_HEIGHT,
    });
  };

  const ensureSpace = (currentY: number, sectionHeight: number) => {
    if (currentY + sectionHeight > FOOTER_Y - 20) {
      pdf.addPage();
      startPage();
      return MARGIN_TOP;
    }

    return currentY;
  };

  const drawExecutiveSummary = (x: number, y: number, widthValue: number, heightValue: number) => {
    drawPanel(x, y, widthValue, heightValue, { fill: colors.surfaceMuted, stroke: colors.border, radius: 7 });
    drawTextBox('EXECUTIVE SUMMARY', x + CARD_PADDING, y + CARD_PADDING, widthValue - CARD_PADDING * 2, {
      font: pdfFonts.bold,
      fontSize: 9,
      color: colors.text,
      characterSpacing: 0.8,
      ellipsis: true,
      height: LINE_HEIGHT,
    });
    drawTextBox(
      'This packet contains a point-in-time snapshot of Stripe-backed revenue metrics generated using read-only API access. It is intended to help founders share standardized revenue verification during fundraising and acquisition discussions.',
      x + CARD_PADDING,
      y + CARD_PADDING + 14,
      widthValue - CARD_PADDING * 2,
      {
        font: pdfFonts.regular,
        fontSize: 9.8,
        color: colors.text,
        lineGap: 3,
        height: heightValue - 34,
      }
    );
  };

  const revenueCommentary = () => {
    const points = packet.metrics.monthlyBreakdown.slice(-6);
    if (points.length === 0) {
      return 'No trend commentary is available without recurring monthly revenue data.';
    }

    if (points.length === 1) {
      return `The reporting window contains a single observed revenue point of ${currency.format(points[0].value)}.`;
    }

    const first = points[0].value;
    const last = points[points.length - 1].value;
    const delta = last - first;
    const deltaPct = first > 0 ? Math.abs(delta / first) : 0;
    const direction = delta >= 0 ? 'increased' : 'decreased';
    const peak = points.reduce((current, item) => (item.value > current.value ? item : current), points[0]);
    const trough = points.reduce((current, item) => (item.value < current.value ? item : current), points[0]);

    return `Gross revenue ${direction} by ${currency.format(Math.abs(delta))} (${percent.format(deltaPct)} change) across the window. The highest monthly point was ${currency.format(peak.value)} in ${peak.period}, while the lowest was ${currency.format(trough.value)} in ${trough.period}.`;
  };

  const drawMonthlyChart = (x: number, y: number, w: number, h: number) => {
    drawPanel(x, y, w, h, { fill: colors.surface, stroke: colors.border, radius: 7 });
    drawTextBox('Revenue history', x + CARD_PADDING, y + CARD_PADDING - 1, w - CARD_PADDING * 2, {
      font: pdfFonts.bold,
      fontSize: 12,
      color: colors.text,
      ellipsis: true,
      height: LINE_HEIGHT + 2,
    });
    drawTextBox('Monthly gross revenue based on connected Stripe data', x + CARD_PADDING, y + CARD_PADDING + 14, w - CARD_PADDING * 2, {
      font: pdfFonts.regular,
      fontSize: 9,
      color: colors.muted,
      lineGap: 2,
      height: 28,
    });

    const points = packet.metrics.monthlyBreakdown.slice(-6);
    if (points.length === 0) {
      const emptyCardWidth = Math.min(w - 64, 360);
      const emptyCardX = x + (w - emptyCardWidth) / 2;
      const emptyCardY = y + 74;
      drawPanel(emptyCardX, emptyCardY, emptyCardWidth, 112, { fill: colors.surfaceMuted, stroke: colors.border, radius: 7 });
      drawTextBox('No recurring monthly revenue detected during this reporting window.', emptyCardX + CARD_PADDING, emptyCardY + 26, emptyCardWidth - CARD_PADDING * 2, {
        font: pdfFonts.bold,
        fontSize: 10,
        color: colors.text,
        align: 'center',
        lineGap: 2,
        height: 28,
      });
      drawTextBox('The revenue history section is intentionally left blank because the connected Stripe account did not produce recurring monthly observations in this period.', emptyCardX + CARD_PADDING, emptyCardY + 54, emptyCardWidth - CARD_PADDING * 2, {
        font: pdfFonts.regular,
        fontSize: 9,
        color: colors.muted,
        align: 'center',
        lineGap: 2,
        height: 36,
      });
      return;
    }

    const chartX = x + 56;
    const chartY = y + 60;
    const chartW = w - 86;
    const chartH = h - 112;
    const maxValue = Math.max(...points.map(point => point.value), 1);
    const minValue = Math.min(...points.map(point => point.value), 0);
    const paddedMax = maxValue === minValue ? maxValue + 1 : maxValue;
    const baseline = chartY + chartH;

    pdf.save();
    pdf.strokeColor(colors.grid).lineWidth(0.5);
    for (let i = 0; i <= 4; i += 1) {
      const gridY = chartY + (chartH / 4) * i;
      pdf.moveTo(chartX, gridY).lineTo(chartX + chartW, gridY).stroke();
    }
    pdf.restore();

    const stepX = points.length > 1 ? chartW / (points.length - 1) : 0;
    const toY = (value: number) => chartY + chartH - ((value - minValue) / Math.max(paddedMax - minValue, 1)) * chartH;

    pdf.save();
    pdf.lineWidth(1.4).strokeColor(colors.text).fillColor(colors.text);
    points.forEach((point, index) => {
      const px = chartX + stepX * index;
      const py = toY(point.value);
      if (index === 0) {
        pdf.moveTo(px, py);
      } else {
        pdf.lineTo(px, py);
      }
    });
    pdf.stroke();
    pdf.restore();

    points.forEach((point, index) => {
      const px = chartX + stepX * index;
      const py = toY(point.value);
      pdf.save();
      pdf.circle(px, py, 2.5).fillAndStroke(colors.paper, colors.text);
      pdf.restore();
      drawTextBox(point.period, px - 16, baseline + 6, 32, {
        font: pdfFonts.regular,
        fontSize: 8,
        color: colors.mutedSoft,
        align: 'center',
        height: LINE_HEIGHT,
        ellipsis: true,
      });
    });

    drawTextBox(currency.format(Math.max(minValue, 0)), x + 12, chartY + chartH - 4, 38, {
      font: 'Courier',
      fontSize: 8.5,
      color: colors.text,
      align: 'right',
      height: LINE_HEIGHT,
      ellipsis: true,
    });
    drawTextBox(currency.format(paddedMax), x + 12, chartY - 4, 38, {
      font: 'Courier',
      fontSize: 8.5,
      color: colors.text,
      align: 'right',
      height: LINE_HEIGHT,
      ellipsis: true,
    });
  };

  const drawReferenceList = (title: string, values: string[], x: number, y: number, w: number, maxItems = 6) => {
    drawTextBox(title, x, y, w, {
      font: pdfFonts.bold,
      fontSize: 10,
      color: colors.text,
      ellipsis: true,
      height: LINE_HEIGHT,
    });
    const items = values.slice(0, maxItems);
    let cursorY = y + 14;
    if (items.length === 0) {
      drawTextBox('No Stripe object references captured for this category.', x, cursorY, w, {
        font: pdfFonts.regular,
        fontSize: 8.5,
        color: colors.muted,
        lineGap: 1.5,
        height: 28,
      });
      return cursorY + 14;
    }

    items.forEach(value => {
      drawTextBox(value, x, cursorY, w, {
        font: 'Courier',
        fontSize: 8.3,
        color: colors.muted,
        ellipsis: true,
        height: LINE_HEIGHT,
      });
      cursorY += 12;
    });

    if (values.length > items.length) {
      drawTextBox(`and ${values.length - items.length} more`, x, cursorY, w, {
        font: pdfFonts.regular,
        fontSize: 8,
        color: colors.mutedSoft,
        height: LINE_HEIGHT,
      });
      cursorY += 12;
    }

    return cursorY + 4;
  };

  const drawDisclaimerBlock = (x: number, y: number, w: number, h: number) => {
    drawPanel(x, y, w, h, { fill: colors.surfaceMuted, stroke: colors.border, radius: 7 });
    drawTextBox('LIMITATIONS / DISCLAIMER', x + 14, y + 12, w - 28, {
      font: pdfFonts.bold,
      fontSize: 10,
      color: colors.text,
      ellipsis: true,
      height: LINE_HEIGHT,
    });
    drawTextBox(
      'This report reflects a point-in-time snapshot of revenue processed through a connected Stripe account using read-only API access. Metrics may exclude revenue processed outside Stripe.',
      x + 14,
      y + 28,
      w - 28,
      { font: pdfFonts.regular, fontSize: 9.3, color: colors.text, lineGap: 2, height: h - 38 }
    );
  };

  const grossRevenue = packet.metrics.grossRevenue;
  const disputeRate = grossRevenue > 0 ? packet.metrics.chargebacks / grossRevenue : 0;
  const repeatCustomerRate: number | null = null;

  startPage();

  let currentY = MARGIN_TOP;
  const headerHeight = 164;
  drawPanel(MARGIN_X, currentY, CONTENT_WIDTH, headerHeight, { fill: colors.surface, stroke: colors.borderStrong, radius: 8 });
  drawTextBox('Stripe-Verified Snapshot', MARGIN_X + CARD_PADDING, currentY + 16, CONTENT_WIDTH - CARD_PADDING * 2, {
    font: pdfFonts.bold,
    fontSize: 22,
    color: colors.text,
    ellipsis: true,
    height: LINE_HEIGHT + 8,
  });
  drawTextBox('Generated from connected Stripe API data', MARGIN_X + CARD_PADDING, currentY + 46, CONTENT_WIDTH - CARD_PADDING * 2, {
    font: pdfFonts.regular,
    fontSize: 10,
    color: colors.muted,
    height: LINE_HEIGHT + 2,
  });
  drawTextBox('Point-in-time revenue verification', MARGIN_X + CARD_PADDING, currentY + 64, CONTENT_WIDTH - CARD_PADDING * 2, {
    font: pdfFonts.regular,
    fontSize: 11,
    color: colors.text,
    height: LINE_HEIGHT + 2,
  });
  drawTextBox(startup.name, MARGIN_X + CARD_PADDING, currentY + 82, CONTENT_WIDTH - CARD_PADDING * 2, {
    font: pdfFonts.regular,
    fontSize: 9.2,
    color: colors.mutedSoft,
    ellipsis: true,
    height: LINE_HEIGHT,
  });

  const metaGridY = currentY + 102;
  const metaGridWidth = CONTENT_WIDTH - CARD_PADDING * 2;
  const metaColWidth = (metaGridWidth - GRID_GAP) / 2;
  drawLabelValue('Startup', truncateMiddle(startup.name, 36), MARGIN_X + CARD_PADDING, metaGridY, metaColWidth);
  drawLabelValue('Generated', formatDate(packet.createdAt), MARGIN_X + CARD_PADDING + metaColWidth + GRID_GAP, metaGridY, metaColWidth);
  drawLabelValue('Verification ID', shortReportId(packet.id), MARGIN_X + CARD_PADDING, metaGridY + 34, metaColWidth);
  drawLabelValue('Integrity Hash', shortHash(packet.verificationHash), MARGIN_X + CARD_PADDING + metaColWidth + GRID_GAP, metaGridY + 34, metaColWidth);

  currentY += headerHeight + SECTION_GAP;
  const summaryHeight = 76;
  currentY = ensureSpace(currentY, summaryHeight);
  drawExecutiveSummary(MARGIN_X, currentY, CONTENT_WIDTH, summaryHeight);

  currentY += summaryHeight + SECTION_GAP;
  const page1SectionHeight = 24 + PAGE1_CARD_HEIGHT * 2 + ROW_GAP;
  currentY = ensureSpace(currentY, page1SectionHeight);
  drawSectionHeader('Revenue Metrics', 'Gross revenue is presented as the primary figure, followed by the remaining revenue indicators.', MARGIN_X, currentY, CONTENT_WIDTH);
  currentY += 24;
  const grossCardY = currentY;
  const grossCardX = MARGIN_X;
  const netCardX = MARGIN_X + CARD_WIDTH + GRID_GAP;
  drawMetricCard({ x: grossCardX, y: grossCardY, w: CARD_WIDTH, h: PAGE1_CARD_HEIGHT, label: 'Gross Revenue', value: currency.format(packet.metrics.grossRevenue), detail: 'Primary revenue figure for diligence review', emphasis: true, fill: colors.surface });
  drawMetricCard({ x: netCardX, y: grossCardY, w: CARD_WIDTH, h: PAGE1_CARD_HEIGHT, label: 'Net Revenue', value: currency.format(packet.metrics.netRevenue), detail: 'After refunds and chargebacks' });
  drawMetricCard({ x: grossCardX, y: grossCardY + PAGE1_CARD_HEIGHT + ROW_GAP, w: CARD_WIDTH, h: PAGE1_CARD_HEIGHT, label: 'MRR', value: currency.format(packet.metrics.mrr), detail: 'Monthly recurring revenue' });
  drawMetricCard({ x: netCardX, y: grossCardY + PAGE1_CARD_HEIGHT + ROW_GAP, w: CARD_WIDTH, h: PAGE1_CARD_HEIGHT, label: 'ARR', value: currency.format(packet.metrics.arr), detail: 'Annualized recurring revenue' });
  drawFooter(1);

  pdf.addPage();
  startPage();
  currentY = MARGIN_TOP;
  drawSectionHeader('Revenue History', 'The chart is intentionally minimal, monochrome, and audit-oriented.', MARGIN_X, currentY, CONTENT_WIDTH);
  currentY += 24;
  drawMonthlyChart(MARGIN_X, currentY, CONTENT_WIDTH, 250);

  currentY += 268;
  const monthlyPoints = packet.metrics.monthlyBreakdown.slice(-6);
  const page2CommentaryHeight = monthlyPoints.length > 0 ? 220 : 150;
  currentY = ensureSpace(currentY + SECTION_GAP, page2CommentaryHeight);
  drawPanel(MARGIN_X, currentY, CONTENT_WIDTH, page2CommentaryHeight, { fill: colors.surfaceMuted, stroke: colors.border, radius: 7 });
  drawTextBox('Revenue Trend Commentary', MARGIN_X + CARD_PADDING, currentY + CARD_PADDING - 1, CONTENT_WIDTH - CARD_PADDING * 2, {
    font: pdfFonts.bold,
    fontSize: 12,
    color: colors.text,
    ellipsis: true,
    height: LINE_HEIGHT + 2,
  });
  drawTextBox(revenueCommentary(), MARGIN_X + CARD_PADDING, currentY + 34, CONTENT_WIDTH - CARD_PADDING * 2, {
    font: pdfFonts.regular,
    fontSize: 10,
    color: colors.text,
    lineGap: 2.5,
    height: 44,
  });

  if (monthlyPoints.length === 0) {
    drawTextBox('If no recurring monthly revenue is present, the history section remains intentionally blank apart from the empty-state card above.', MARGIN_X + CARD_PADDING, currentY + 82, CONTENT_WIDTH - CARD_PADDING * 2, {
      font: pdfFonts.regular,
      fontSize: 9,
      color: colors.muted,
      lineGap: 2,
      height: 30,
    });
  } else {
    drawTextBox('Monthly revenue points', MARGIN_X + CARD_PADDING, currentY + 84, CONTENT_WIDTH - CARD_PADDING * 2, {
      font: pdfFonts.bold,
      fontSize: 10,
      color: colors.text,
      height: LINE_HEIGHT,
    });
    const tableTop = currentY + 104;
    const tableLeft = MARGIN_X + CARD_PADDING;
    const tableWidth = CONTENT_WIDTH - CARD_PADDING * 2;
    pdf.save();
    pdf.moveTo(tableLeft, tableTop + 14).lineTo(tableLeft + tableWidth, tableTop + 14).lineWidth(0.5).stroke(colors.border);
    pdf.restore();
    monthlyPoints.forEach((point, index) => {
      const rowY = tableTop + 20 + index * 18;
      drawTextBox(point.period, tableLeft, rowY, 70, {
        font: pdfFonts.regular,
        fontSize: 9,
        color: colors.muted,
        height: LINE_HEIGHT,
        ellipsis: true,
      });
      drawTextBox(currency.format(point.value), tableLeft + 90, rowY, tableWidth - 90, {
        font: 'Courier',
        fontSize: 9,
        color: colors.text,
        align: 'right',
        height: LINE_HEIGHT,
        ellipsis: true,
      });
    });
  }
  drawFooter(2);

  pdf.addPage();
  startPage();
  currentY = MARGIN_TOP;
  drawSectionHeader('Customer and Subscription Metrics', 'Customer counts and per-account metrics are presented with audit-style restraint.', MARGIN_X, currentY, CONTENT_WIDTH);
  currentY += 24;

  const columnGap = GRID_GAP;
  const columnWidth = (CONTENT_WIDTH - columnGap) / 2;
  const sectionBlockHeight = 324;
  drawPanel(MARGIN_X, currentY, columnWidth, sectionBlockHeight, { fill: colors.surface, stroke: colors.border, radius: 7 });
  drawPanel(MARGIN_X + columnWidth + columnGap, currentY, columnWidth, sectionBlockHeight, { fill: colors.surfaceMuted, stroke: colors.border, radius: 7 });

  drawTextBox('Customer metrics', MARGIN_X + CARD_PADDING, currentY + CARD_PADDING - 1, columnWidth - CARD_PADDING * 2, {
    font: pdfFonts.bold,
    fontSize: 12,
    color: colors.text,
    ellipsis: true,
    height: LINE_HEIGHT + 2,
  });
  drawMetricCard({ x: MARGIN_X + CARD_PADDING, y: currentY + 38, w: columnWidth - CARD_PADDING * 2, h: PAGE3_CARD_HEIGHT, label: 'Active Customers', value: wholeNumber.format(packet.metrics.activeCustomers), detail: 'Unique customer count in the reporting window' });
  drawMetricCard({ x: MARGIN_X + CARD_PADDING, y: currentY + 136, w: columnWidth - CARD_PADDING * 2, h: PAGE3_CARD_HEIGHT, label: 'ARPC', value: decimalCurrency.format(packet.metrics.arpc), detail: 'Average revenue per customer' });
  let repeatCustomerRateValue = 'N/A';
  let repeatCustomerRateDetail = 'Placeholder if unavailable from the current Stripe snapshot';
  if (repeatCustomerRate !== null) {
    repeatCustomerRateValue = percent.format(repeatCustomerRate as number);
    repeatCustomerRateDetail = 'Calculated from repeat purchases';
  }
  drawMetricCard({ x: MARGIN_X + CARD_PADDING, y: currentY + 234, w: columnWidth - CARD_PADDING * 2, h: PAGE3_CARD_HEIGHT, label: 'Repeat Customer Rate', value: repeatCustomerRateValue, detail: repeatCustomerRateDetail });

  drawTextBox('Risk & quality', MARGIN_X + columnWidth + columnGap + CARD_PADDING, currentY + CARD_PADDING - 1, columnWidth - CARD_PADDING * 2, {
    font: pdfFonts.bold,
    fontSize: 12,
    color: colors.text,
    ellipsis: true,
    height: LINE_HEIGHT + 2,
  });
  drawMetricCard({ x: MARGIN_X + columnWidth + columnGap + CARD_PADDING, y: currentY + 38, w: columnWidth - CARD_PADDING * 2, h: PAGE3_CARD_HEIGHT, label: 'Refunds', value: currency.format(packet.metrics.refunds), detail: 'Refunded volume during the period' });
  drawMetricCard({ x: MARGIN_X + columnWidth + columnGap + CARD_PADDING, y: currentY + 136, w: columnWidth - CARD_PADDING * 2, h: PAGE3_CARD_HEIGHT, label: 'Chargebacks', value: currency.format(packet.metrics.chargebacks), detail: 'Disputed volume during the period' });
  drawMetricCard({ x: MARGIN_X + columnWidth + columnGap + CARD_PADDING, y: currentY + 234, w: columnWidth - CARD_PADDING * 2, h: PAGE3_CARD_HEIGHT, label: 'Dispute Rate', value: percent.format(disputeRate), detail: 'Chargebacks divided by gross revenue' });

  currentY += sectionBlockHeight + SECTION_GAP;
  const qualityContextHeight = 112;
  currentY = ensureSpace(currentY, qualityContextHeight);
  drawPanel(MARGIN_X, currentY, CONTENT_WIDTH, qualityContextHeight, { fill: colors.surfaceMuted, stroke: colors.border, radius: 7 });
  drawTextBox('Quality context', MARGIN_X + CARD_PADDING, currentY + CARD_PADDING - 1, CONTENT_WIDTH - CARD_PADDING * 2, {
    font: pdfFonts.bold,
    fontSize: 11,
    color: colors.text,
    ellipsis: true,
    height: LINE_HEIGHT + 2,
  });
  drawTextBox(
    'Refunds and chargebacks are shown separately so diligence reviewers can distinguish customer-favorable adjustments from disputed payment volume. The packet remains intentionally conservative and does not infer any off-Stripe revenue quality measures.',
    MARGIN_X + CARD_PADDING,
    currentY + 34,
    CONTENT_WIDTH - CARD_PADDING * 2,
    { font: pdfFonts.regular, fontSize: 9.5, color: colors.text, lineGap: 2, height: 52 }
  );
  drawFooter(3);

  pdf.addPage();
  startPage();
  currentY = MARGIN_TOP;
  drawSectionHeader('Verification Methodology', 'The last page documents how the packet is derived and what it does not attempt to prove.', MARGIN_X, currentY, CONTENT_WIDTH);
  currentY += 24;

  const methodologyHeight = 120;
  currentY = ensureSpace(currentY, methodologyHeight);
  drawPanel(MARGIN_X, currentY, CONTENT_WIDTH, methodologyHeight, { fill: colors.surfaceMuted, stroke: colors.border, radius: 7 });
  drawTextBox('Methodology', MARGIN_X + CARD_PADDING, currentY + CARD_PADDING - 1, CONTENT_WIDTH - CARD_PADDING * 2, {
    font: pdfFonts.bold,
    fontSize: 11,
    color: colors.text,
    ellipsis: true,
    height: LINE_HEIGHT + 2,
  });
  const methodologyNotes = [
    'Metrics are generated from a connected Stripe account using read-only API access.',
    'Gross revenue combines succeeded charges and paid invoices within the selected time window.',
    'Net revenue subtracts refunded and disputed amounts from gross revenue.',
    'MRR and ARR are derived from active subscription pricing intervals.',
    'The integrity hash is derived from the startup, time window, metrics, references, and generation timestamp.',
  ];
  let noteY = currentY + 32;
  methodologyNotes.forEach(note => {
    drawTextBox(`• ${note}`, MARGIN_X + CARD_PADDING, noteY, CONTENT_WIDTH - CARD_PADDING * 2, {
      font: pdfFonts.regular,
      fontSize: 9.1,
      color: colors.text,
      lineGap: 1.3,
      height: 18,
    });
    noteY += 18;
  });

  currentY += methodologyHeight + SECTION_GAP;
  const metadataHeight = 192;
  currentY = ensureSpace(currentY, metadataHeight);
  drawPanel(MARGIN_X, currentY, CONTENT_WIDTH, metadataHeight, { fill: colors.surface, stroke: colors.border, radius: 7 });
  drawTextBox('Verification Metadata', MARGIN_X + CARD_PADDING, currentY + CARD_PADDING - 1, CONTENT_WIDTH - CARD_PADDING * 2, {
    font: pdfFonts.bold,
    fontSize: 11,
    color: colors.text,
    ellipsis: true,
    height: LINE_HEIGHT + 2,
  });
  const metadataColWidth = (CONTENT_WIDTH - CARD_PADDING * 2 - GRID_GAP) / 2;
  drawLabelValue('Startup', truncateMiddle(startup.name, 36), MARGIN_X + CARD_PADDING, currentY + 34, metadataColWidth);
  drawLabelValue('Generated', formatDate(packet.createdAt), MARGIN_X + CARD_PADDING + metadataColWidth + GRID_GAP, currentY + 34, metadataColWidth);
  drawLabelValue('Report ID', shortReportId(packet.id), MARGIN_X + CARD_PADDING, currentY + 68, metadataColWidth);
  drawLabelValue('Integrity Hash', shortHash(packet.verificationHash), MARGIN_X + CARD_PADDING + metadataColWidth + GRID_GAP, currentY + 68, metadataColWidth);
  drawTextBox('Full report ID', MARGIN_X + CARD_PADDING, currentY + 106, CONTENT_WIDTH - CARD_PADDING * 2, {
    font: pdfFonts.bold,
    fontSize: 8.5,
    color: colors.muted,
    height: LINE_HEIGHT,
  });
  drawTextBox(packet.id, MARGIN_X + CARD_PADDING, currentY + 120, CONTENT_WIDTH - CARD_PADDING * 2, {
    font: 'Courier',
    fontSize: 8.2,
    color: colors.text,
    lineGap: 1.1,
    height: 22,
  });
  drawTextBox('Full integrity hash', MARGIN_X + CARD_PADDING, currentY + 146, CONTENT_WIDTH - CARD_PADDING * 2, {
    font: pdfFonts.bold,
    fontSize: 8.5,
    color: colors.muted,
    height: LINE_HEIGHT,
  });
  drawTextBox(packet.verificationHash, MARGIN_X + CARD_PADDING, currentY + 160, CONTENT_WIDTH - CARD_PADDING * 2, {
    font: 'Courier',
    fontSize: 7.9,
    color: colors.text,
    lineGap: 1.1,
    height: 24,
  });

  const referenceGroups: Array<{ title: string; values: string[] }> = [
    { title: 'Stripe Charge IDs', values: packet.references.chargeIds },
    { title: 'Stripe Invoice IDs', values: packet.references.invoiceIds },
    { title: 'Stripe Subscription IDs', values: packet.references.subscriptionIds },
    { title: 'Stripe Customer IDs', values: packet.references.customerIds },
  ];

  currentY += metadataHeight + SECTION_GAP;
  const evidenceHeight = 168;
  currentY = ensureSpace(currentY, evidenceHeight);
  drawPanel(MARGIN_X, currentY, CONTENT_WIDTH, evidenceHeight, { fill: colors.surfaceMuted, stroke: colors.border, radius: 7 });
  drawTextBox('Stripe Evidence References', MARGIN_X + CARD_PADDING, currentY + CARD_PADDING - 1, CONTENT_WIDTH - CARD_PADDING * 2, {
    font: pdfFonts.bold,
    fontSize: 11,
    color: colors.text,
    ellipsis: true,
    height: LINE_HEIGHT + 2,
  });
  const leftEvidenceWidth = (CONTENT_WIDTH - CARD_PADDING * 2 - GRID_GAP) / 2;
  const rightEvidenceX = MARGIN_X + CARD_PADDING + leftEvidenceWidth + GRID_GAP;
  drawReferenceList(referenceGroups[0].title, referenceGroups[0].values, MARGIN_X + CARD_PADDING, currentY + 34, leftEvidenceWidth, 3);
  drawReferenceList(referenceGroups[1].title, referenceGroups[1].values, rightEvidenceX, currentY + 34, leftEvidenceWidth, 3);
  drawReferenceList(referenceGroups[2].title, referenceGroups[2].values, MARGIN_X + CARD_PADDING, currentY + 94, leftEvidenceWidth, 3);
  drawReferenceList(referenceGroups[3].title, referenceGroups[3].values, rightEvidenceX, currentY + 94, leftEvidenceWidth, 3);

  currentY += evidenceHeight + SECTION_GAP;
  const disclaimerHeight = 92;
  currentY = ensureSpace(currentY, disclaimerHeight);
  drawDisclaimerBlock(MARGIN_X, currentY, CONTENT_WIDTH, disclaimerHeight);
  drawTextBox(
    'The packet is informational only and does not replace accounting, legal, or investment diligence. All references are included for traceability and do not grant write access to the Stripe account.',
    MARGIN_X + CARD_PADDING,
    currentY + 56,
    CONTENT_WIDTH - CARD_PADDING * 2,
    { font: pdfFonts.regular, fontSize: 8.5, color: colors.mutedSoft, lineGap: 1.2, height: 28 }
  );
  drawFooter(4);

  pdf.end();

  return output;
}

export async function renderInvestorPacketPdf(startup: StartupDoc, packet: PacketRecord): Promise<Buffer> {
  const pdf = new PDFDocument({ size: 'A4', margin: 0 });
  const pdfFonts = configurePdfFonts(pdf);
  const chunks: Buffer[] = [];

  const output = new Promise<Buffer>((resolve, reject) => {
    pdf.on('data', chunk => chunks.push(Buffer.from(chunk)));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
  });

  const colors = {
    paper: '#ffffff',
    surface: '#ffffff',
    surfaceMuted: '#f8faf8',
    border: '#d6ddd5',
    borderStrong: '#b8c3b6',
    text: '#111111',
    muted: '#5d6661',
    mutedSoft: '#7a847f',
    accent: '#116b3a',
    accentSoft: '#e4f0e7',
    grid: '#e8ece8',
  };

  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const decimalCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const percent = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const wholeNumber = new Intl.NumberFormat('en-US');
  const PAGE_WIDTH = pdf.page.width;
  const PAGE_HEIGHT = pdf.page.height;
  const MARGIN_X = 60;
  const MARGIN_TOP = 56;
  const FOOTER_Y = PAGE_HEIGHT - 56;
  const CONTENT_BOTTOM = FOOTER_Y - 18;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
  const SECTION_GAP = 22;
  const CARD_PADDING = 20;
  const COLUMN_GAP = 18;
  const PAGE_GAP = 18;
  const MIN_METRIC_HEIGHT = 104;

  const state = { page: 1, y: MARGIN_TOP };

  const formatDate = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        });
  };

  const truncateMiddle = (text: string, maxChars: number) => {
    if (text.length <= maxChars) return text;
    if (maxChars <= 3) return '.'.repeat(maxChars);
    const frontLength = Math.ceil((maxChars - 3) / 2);
    const backLength = Math.floor((maxChars - 3) / 2);
    return `${text.slice(0, frontLength)}...${text.slice(text.length - backLength)}`;
  };

  const shortReportId = (packetId: string) => truncateMiddle(packetId, 18);
  const shortHash = (hash: string) => `${hash.slice(0, 12)}...`;
  const formatHash = (value: string) => value.match(/.{1,8}/g)?.join(' ') ?? value;

  const measureText = (text: string, width: number, options?: { font?: string; fontSize?: number; lineGap?: number; align?: 'left' | 'center' | 'right' | 'justify' }) => {
    if (options?.font) {
      pdf.font(options.font);
    }
    if (options?.fontSize) {
      pdf.fontSize(options.fontSize);
    }
    return pdf.heightOfString(text, {
      width,
      align: options?.align ?? 'left',
      lineGap: options?.lineGap ?? 2,
    });
  };

  const drawText = (
    text: string,
    x: number,
    y: number,
    width: number,
    options?: {
      font?: string;
      fontSize?: number;
      color?: string;
      lineGap?: number;
      align?: 'left' | 'center' | 'right' | 'justify';
      ellipsis?: boolean;
      height?: number;
      characterSpacing?: number;
    }
  ) => {
    pdf.font(options?.font ?? pdfFonts.regular).fontSize(options?.fontSize ?? 9.6).fillColor(options?.color ?? colors.text).text(text, x, y, {
      width,
      align: options?.align ?? 'left',
      lineGap: options?.lineGap ?? 2,
      ellipsis: options?.ellipsis ?? false,
      height: options?.height,
      characterSpacing: options?.characterSpacing,
    });
    return y + measureText(text, width, { lineGap: options?.lineGap, align: options?.align });
  };

  const drawPanel = (x: number, y: number, w: number, h: number, options?: { fill?: string; stroke?: string; radius?: number }) => {
    pdf.save();
    pdf.roundedRect(x, y, w, h, options?.radius ?? 8).fillAndStroke(options?.fill ?? colors.surface, options?.stroke ?? colors.border);
    pdf.restore();
  };

  const drawBadge = (x: number, y: number, label: string, accent = false) => {
    pdf.font(pdfFonts.bold).fontSize(8.2);
    const textWidth = pdf.widthOfString(label);
    const badgeHeight = 20;
    const badgeWidth = textWidth + 18;
    drawPanel(x, y, badgeWidth, badgeHeight, {
      fill: accent ? colors.accentSoft : colors.surfaceMuted,
      stroke: accent ? colors.accent : colors.border,
      radius: 999,
    });
    drawText(label, x + 9, y + 5, badgeWidth - 18, {
      font: pdfFonts.bold,
      fontSize: 8.2,
      color: accent ? colors.accent : colors.muted,
      align: 'center',
      height: 14,
    });
    return badgeHeight;
  };

  const drawFooter = (pageNumber: number) => {
    pdf.save();
    pdf.moveTo(MARGIN_X, FOOTER_Y - 10).lineTo(PAGE_WIDTH - MARGIN_X, FOOTER_Y - 10).lineWidth(0.5).stroke(colors.border);
    pdf.restore();

    const footerText = `ProofRound Verified Packet · ${shortReportId(packet.id)} · Generated ${formatDate(packet.createdAt)} · Page ${pageNumber} of 4`;
    drawText(footerText, MARGIN_X, FOOTER_Y - 2, CONTENT_WIDTH, {
      font: pdfFonts.regular,
      fontSize: 8,
      color: colors.muted,
      ellipsis: true,
      height: 12,
    });
  };

  const startPage = () => {
    pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(colors.paper);
    pdf.fillColor(colors.text);
    pdf.strokeColor(colors.border);
  };

  const newPage = () => {
    drawFooter(state.page);
    pdf.addPage();
    state.page += 1;
    state.y = MARGIN_TOP;
    startPage();
  };

  const ensureSpace = (height: number) => {
    if (state.y + height > CONTENT_BOTTOM) {
      newPage();
    }
  };

  const sectionHeader = (title: string, subtitle: string) => {
    const titleHeight = measureText(title, CONTENT_WIDTH, { lineGap: 2 });
    const subtitleHeight = measureText(subtitle, CONTENT_WIDTH, { lineGap: 2.5 });
    ensureSpace(titleHeight + subtitleHeight + 22);
    drawText(title, MARGIN_X, state.y, CONTENT_WIDTH, {
      font: pdfFonts.bold,
      fontSize: 20,
      color: colors.text,
      height: titleHeight + 2,
    });
    state.y += titleHeight + 2;
    drawText(subtitle, MARGIN_X, state.y + 5, CONTENT_WIDTH, {
      font: pdfFonts.regular,
      fontSize: 10.8,
      color: colors.muted,
      lineGap: 2.5,
      height: subtitleHeight + 2,
    });
    state.y += subtitleHeight + 22;
  };

  const drawKeyValue = (label: string, value: string, x: number, y: number, width: number, monospace = false) => {
    const labelHeight = measureText(label.toUpperCase(), width, { lineGap: 1.5 });
    const valueHeight = measureText(value, width, { lineGap: 1.5 });
    drawText(label.toUpperCase(), x, y, width, {
      font: pdfFonts.bold,
      fontSize: 8.3,
      color: colors.muted,
      characterSpacing: 0.8,
      height: labelHeight + 1,
    });
    drawText(value, x, y + labelHeight + 2, width, {
      font: monospace ? 'Courier' : pdfFonts.regular,
      fontSize: monospace ? 8.6 : 9.4,
      color: colors.text,
      height: valueHeight + 1,
    });
    return y + labelHeight + valueHeight + 5;
  };

  const drawBullets = (items: Array<{ title?: string; text: string }>, x: number, y: number, width: number, options?: { compact?: boolean }) => {
    let cursor = y;
    items.forEach(item => {
      const bulletY = cursor + 6;
      pdf.save();
      pdf.circle(x + 4, bulletY, 1.8).fill(colors.muted);
      pdf.restore();
      const bodyX = x + 14;
      const bodyWidth = width - 14;
      const bodyText = item.title ? `${item.title} ${item.text}` : item.text;
      const bodyHeight = measureText(bodyText, bodyWidth, { lineGap: options?.compact ? 1.8 : 2.2 });
      drawText(bodyText, bodyX, cursor, bodyWidth, {
        font: item.title ? pdfFonts.bold : pdfFonts.regular,
        fontSize: 9.4,
        color: colors.text,
        lineGap: options?.compact ? 1.8 : 2.2,
        height: bodyHeight + 2,
      });
      cursor += bodyHeight + (options?.compact ? 10 : 12);
    });
    return cursor;
  };

  const drawMetricCard = (params: { x: number; y: number; w: number; h: number; label: string; value: string; detail: string; emphasis?: boolean }) => {
    const height = Math.max(params.h, MIN_METRIC_HEIGHT);
    drawPanel(params.x, params.y, params.w, height, {
      fill: params.emphasis ? colors.surfaceMuted : colors.surface,
      stroke: params.emphasis ? colors.borderStrong : colors.border,
      radius: 8,
    });
    const innerWidth = params.w - CARD_PADDING * 2;
    const labelY = params.y + CARD_PADDING;
    drawText(params.label.toUpperCase(), params.x + CARD_PADDING, labelY, innerWidth, {
      font: pdfFonts.bold,
      fontSize: 8.2,
      color: colors.muted,
      characterSpacing: 0.8,
      height: 11,
    });
    drawText(params.value, params.x + CARD_PADDING, params.y + CARD_PADDING + 16, innerWidth, {
      font: pdfFonts.bold,
      fontSize: params.emphasis ? 19 : 17,
      color: colors.text,
      height: 24,
    });
    drawText(params.detail, params.x + CARD_PADDING, params.y + height - CARD_PADDING - 18, innerWidth, {
      font: pdfFonts.regular,
      fontSize: 8.5,
      color: colors.mutedSoft,
      lineGap: 1.8,
      height: 16,
    });
    return height;
  };

  const drawStatCard = (params: { x: number; y: number; w: number; h: number; title: string; rows: Array<{ label: string; value: string; note?: string }>; tone?: 'normal' | 'soft' }) => {
    drawPanel(params.x, params.y, params.w, params.h, {
      fill: params.tone === 'soft' ? colors.surfaceMuted : colors.surface,
      stroke: colors.border,
      radius: 8,
    });
    drawText(params.title, params.x + CARD_PADDING, params.y + CARD_PADDING - 1, params.w - CARD_PADDING * 2, {
      font: pdfFonts.bold,
      fontSize: 12,
      color: colors.text,
      height: 16,
    });

    let cursor = params.y + CARD_PADDING + 20;
    params.rows.forEach(row => {
      const rowLabelHeight = measureText(row.label.toUpperCase(), params.w - CARD_PADDING * 2, { lineGap: 1.5 });
      const rowValueHeight = measureText(row.value, params.w - CARD_PADDING * 2, { lineGap: 1.5 });
      const rowNoteHeight = row.note ? measureText(row.note, params.w - CARD_PADDING * 2, { lineGap: 1.5 }) : 0;
      const rowHeight = Math.max(30, rowLabelHeight + rowValueHeight + rowNoteHeight + 8);

      pdf.save();
      pdf.moveTo(params.x + CARD_PADDING, cursor - 4).lineTo(params.x + params.w - CARD_PADDING, cursor - 4).lineWidth(0.4).stroke(colors.grid);
      pdf.restore();

      drawText(row.label.toUpperCase(), params.x + CARD_PADDING, cursor, params.w - CARD_PADDING * 2, {
        font: pdfFonts.bold,
        fontSize: 8.2,
        color: colors.muted,
        characterSpacing: 0.8,
        height: 11,
      });
      drawText(row.value, params.x + CARD_PADDING, cursor + 12, params.w - CARD_PADDING * 2, {
        font: pdfFonts.bold,
        fontSize: 11.8,
        color: colors.text,
        height: rowValueHeight + 2,
      });
      if (row.note) {
        drawText(row.note, params.x + CARD_PADDING, cursor + 29, params.w - CARD_PADDING * 2, {
          font: pdfFonts.regular,
          fontSize: 8.3,
          color: colors.mutedSoft,
          lineGap: 1.5,
          height: rowNoteHeight + 2,
        });
      }
      cursor += rowHeight;
    });
  };

  const drawEmptyState = (x: number, y: number, w: number, h: number, title: string, text: string, note?: string) => {
    drawPanel(x, y, w, h, { fill: colors.surfaceMuted, stroke: colors.border, radius: 8 });
    drawBadge(x + CARD_PADDING, y + CARD_PADDING - 2, 'No verified Stripe revenue detected in this reporting window', false);
    const titleY = y + CARD_PADDING + 28;
    drawText(title, x + CARD_PADDING, titleY, w - CARD_PADDING * 2, {
      font: pdfFonts.bold,
      fontSize: 13,
      color: colors.text,
      height: 18,
    });
    drawText(text, x + CARD_PADDING, titleY + 22, w - CARD_PADDING * 2, {
      font: pdfFonts.regular,
      fontSize: 9.5,
      color: colors.muted,
      lineGap: 2.2,
      height: measureText(text, w - CARD_PADDING * 2, { lineGap: 2.2 }),
    });
    if (note) {
      drawText(note, x + CARD_PADDING, y + h - CARD_PADDING - 16, w - CARD_PADDING * 2, {
        font: pdfFonts.bold,
        fontSize: 8.4,
        color: colors.mutedSoft,
        height: 12,
      });
    }
  };

  const headerCard = () => {
    const title = 'ProofRound Verified Investor Snapshot';
    const subtitle = 'Stripe-connected revenue verification for seed-stage diligence';
    const titleHeight = measureText(title, CONTENT_WIDTH - CARD_PADDING * 2, { lineGap: 2 });
    const subtitleHeight = measureText(subtitle, CONTENT_WIDTH - CARD_PADDING * 2, { lineGap: 2.4 });
    const metaTop = MARGIN_TOP + 96;
    const cardHeight = 178;

    ensureSpace(cardHeight);
    drawPanel(MARGIN_X, state.y, CONTENT_WIDTH, cardHeight, { fill: colors.surface, stroke: colors.borderStrong, radius: 10 });
    const badgeY = state.y + CARD_PADDING;
    drawBadge(MARGIN_X + CARD_PADDING, badgeY, 'Verified via read-only Stripe API', true);
    drawText(title, MARGIN_X + CARD_PADDING, state.y + 42, CONTENT_WIDTH - CARD_PADDING * 2, {
      font: pdfFonts.bold,
      fontSize: 20.5,
      color: colors.text,
      height: titleHeight + 2,
    });
    drawText(subtitle, MARGIN_X + CARD_PADDING, state.y + 72, CONTENT_WIDTH - CARD_PADDING * 2, {
      font: pdfFonts.regular,
      fontSize: 10.5,
      color: colors.muted,
      lineGap: 2.4,
      height: subtitleHeight + 2,
    });

    const metaColWidth = (CONTENT_WIDTH - CARD_PADDING * 2 - COLUMN_GAP) / 2;
    drawKeyValue('Startup name', startup.name, MARGIN_X + CARD_PADDING, metaTop, metaColWidth);
    drawKeyValue('Generated date', formatDate(packet.createdAt), MARGIN_X + CARD_PADDING + metaColWidth + COLUMN_GAP, metaTop, metaColWidth);
    drawKeyValue('Verification / report ID', shortReportId(packet.id), MARGIN_X + CARD_PADDING, metaTop + 36, metaColWidth, true);
    drawKeyValue('Integrity hash', shortHash(packet.verificationHash), MARGIN_X + CARD_PADDING + metaColWidth + COLUMN_GAP, metaTop + 36, metaColWidth, true);

    drawText('Point-in-time Stripe-backed verification packet for seed-stage diligence.', MARGIN_X + CARD_PADDING, state.y + cardHeight - 24, CONTENT_WIDTH - CARD_PADDING * 2, {
      font: pdfFonts.regular,
      fontSize: 8.4,
      color: colors.mutedSoft,
      height: 12,
    });

    state.y += cardHeight + SECTION_GAP;
  };

  const investorSummaryCard = () => {
    const width = Math.floor((CONTENT_WIDTH - COLUMN_GAP) * 0.6);
    const statusWidth = CONTENT_WIDTH - width - COLUMN_GAP;
    const summaryText = [
      'This is a point-in-time Stripe-backed verification packet designed for seed-stage diligence.',
      'It helps investors verify revenue claims from source-linked Stripe data instead of screenshots or manual exports.',
      'It does not replace accounting, legal, or broader commercial diligence.',
    ];
    const summaryHeight = 118;
    const statusHeight = 118;
    ensureSpace(Math.max(summaryHeight, statusHeight));

    drawPanel(MARGIN_X, state.y, width, summaryHeight, { fill: colors.surface, stroke: colors.border, radius: 8 });
    drawText('Investor Summary', MARGIN_X + CARD_PADDING, state.y + CARD_PADDING - 1, width - CARD_PADDING * 2, {
      font: pdfFonts.bold,
      fontSize: 12,
      color: colors.text,
      height: 16,
    });
    drawBullets(summaryText.map(text => ({ text })), MARGIN_X + CARD_PADDING, state.y + 38, width - CARD_PADDING * 2, { compact: true });

    drawPanel(MARGIN_X + width + COLUMN_GAP, state.y, statusWidth, statusHeight, { fill: colors.surfaceMuted, stroke: colors.border, radius: 8 });
    drawText('Verification Status', MARGIN_X + width + COLUMN_GAP + CARD_PADDING, state.y + CARD_PADDING - 1, statusWidth - CARD_PADDING * 2, {
      font: pdfFonts.bold,
      fontSize: 12,
      color: colors.text,
      height: 16,
    });
    drawBadge(MARGIN_X + width + COLUMN_GAP + CARD_PADDING, state.y + 30, 'Verified source: Stripe API', false);
    const statusRows = [
      { label: 'Access model', value: 'Read-only API' },
      { label: 'Scope', value: 'Selected reporting window' },
      { label: 'Traceability', value: 'Timestamped and hash-linked' },
      { label: 'Use case', value: 'Seed diligence and investor sharing' },
    ];
    let cursor = state.y + 58;
    statusRows.forEach(row => {
      drawText(row.label.toUpperCase(), MARGIN_X + width + COLUMN_GAP + CARD_PADDING, cursor, statusWidth - CARD_PADDING * 2, {
        font: pdfFonts.bold,
        fontSize: 8.1,
        color: colors.muted,
        characterSpacing: 0.8,
        height: 11,
      });
      drawText(row.value, MARGIN_X + width + COLUMN_GAP + CARD_PADDING, cursor + 12, statusWidth - CARD_PADDING * 2, {
        font: pdfFonts.regular,
        fontSize: 9.3,
        color: colors.text,
        height: 14,
      });
      cursor += 18;
    });

    state.y += summaryHeight + SECTION_GAP;
  };

  const tractionSnapshot = () => {
    sectionHeader('Traction Snapshot', 'Core revenue and customer metrics verified from Stripe observations in the selected window.');

    const metrics = [
      { label: 'Gross Revenue', value: currency.format(packet.metrics.grossRevenue), detail: 'Primary verified revenue figure', emphasis: true },
      { label: 'Net Revenue', value: currency.format(packet.metrics.netRevenue), detail: 'After refunds and disputes' },
      { label: 'MRR', value: currency.format(packet.metrics.mrr), detail: 'Monthly recurring revenue' },
      { label: 'ARR', value: currency.format(packet.metrics.arr), detail: 'Annualized recurring revenue' },
      { label: 'Active Customers', value: wholeNumber.format(packet.metrics.activeCustomers), detail: 'Unique Stripe customers' },
      { label: 'Refunds / Disputes', value: `${currency.format(packet.metrics.refunds)} / ${currency.format(packet.metrics.chargebacks)}`, detail: 'Payment adjustments observed' },
    ];

    const cardWidth = (CONTENT_WIDTH - COLUMN_GAP) / 2;
    const rowHeights = [0, 0, 0];
    metrics.forEach((metric, index) => {
      const row = Math.floor(index / 2);
      const detailHeight = measureText(metric.detail, cardWidth - CARD_PADDING * 2, { lineGap: 1.8 });
      rowHeights[row] = Math.max(rowHeights[row], Math.max(MIN_METRIC_HEIGHT, CARD_PADDING * 2 + 34 + detailHeight));
    });

    rowHeights.forEach((rowHeight, rowIndex) => {
      ensureSpace(rowHeight + (rowIndex < 2 ? PAGE_GAP : 0));
      const top = state.y;
      const leftMetric = metrics[rowIndex * 2];
      const rightMetric = metrics[rowIndex * 2 + 1];
      drawMetricCard({ x: MARGIN_X, y: top, w: cardWidth, h: rowHeight, ...leftMetric });
      drawMetricCard({ x: MARGIN_X + cardWidth + COLUMN_GAP, y: top, w: cardWidth, h: rowHeight, ...rightMetric });
      state.y += rowHeight + (rowIndex < 2 ? PAGE_GAP : 0);
    });

    if (packet.metrics.grossRevenue === 0) {
      ensureSpace(62);
      drawPanel(MARGIN_X, state.y + 6, CONTENT_WIDTH, 56, { fill: colors.surfaceMuted, stroke: colors.border, radius: 8 });
      drawText('No verified Stripe revenue detected in this reporting window.', MARGIN_X + CARD_PADDING, state.y + 20, CONTENT_WIDTH - CARD_PADDING * 2, {
        font: pdfFonts.bold,
        fontSize: 10.2,
        color: colors.text,
        height: 14,
      });
      drawText('The packet still confirms the connected Stripe account and the reporting window, but there were no verified revenue observations to summarize.', MARGIN_X + CARD_PADDING, state.y + 34, CONTENT_WIDTH - CARD_PADDING * 2, {
        font: pdfFonts.regular,
        fontSize: 8.6,
        color: colors.muted,
        height: 14,
      });
      state.y += 66;
    }
  };

  const revenuePage = () => {
    sectionHeader('Revenue & Growth Verification', 'A conservative, investor-facing view of monthly Stripe revenue and trend signals.');
    const points = packet.metrics.monthlyBreakdown.slice(-6);
    const historyHeight = points.length > 0 ? 300 : 228;
    ensureSpace(historyHeight + 16);
    drawPanel(MARGIN_X, state.y, CONTENT_WIDTH, historyHeight, { fill: colors.surface, stroke: colors.border, radius: 8 });
    drawText('Revenue history', MARGIN_X + CARD_PADDING, state.y + CARD_PADDING - 1, CONTENT_WIDTH - CARD_PADDING * 2, {
      font: pdfFonts.bold,
      fontSize: 12,
      color: colors.text,
      height: 16,
    });
    drawText('Monthly gross revenue from the connected Stripe account during the selected reporting window.', MARGIN_X + CARD_PADDING, state.y + 34, CONTENT_WIDTH - CARD_PADDING * 2, {
      font: pdfFonts.regular,
      fontSize: 9.2,
      color: colors.muted,
      lineGap: 2,
      height: 22,
    });

    if (points.length === 0) {
      const emptyY = state.y + 66;
      drawEmptyState(
        MARGIN_X + 16,
        emptyY,
        CONTENT_WIDTH - 32,
        historyHeight - 84,
        'No recurring monthly revenue detected',
        'This means ProofRound did not find recurring monthly Stripe observations in the selected window. It does not imply the company has no revenue outside Stripe.',
        'Designed for seed-stage diligence'
      );
    } else {
      const chartX = MARGIN_X + 16;
      const chartY = state.y + 70;
      const chartW = CONTENT_WIDTH - 32;
      const chartH = 150;
      const chartLeft = chartX + 44;
      const chartBottom = chartY + chartH;
      const maxValue = Math.max(...points.map(point => point.value), 1);
      const minValue = Math.min(...points.map(point => point.value), 0);
      const normalizedMax = maxValue === minValue ? maxValue + 1 : maxValue;

      pdf.save();
      pdf.strokeColor(colors.grid).lineWidth(0.5);
      for (let i = 0; i <= 4; i += 1) {
        const gridY = chartY + (chartH / 4) * i;
        pdf.moveTo(chartLeft, gridY).lineTo(chartX + chartW, gridY).stroke();
      }
      pdf.restore();

      const stepX = points.length > 1 ? (chartW - 56) / (points.length - 1) : 0;
      const toY = (value: number) => chartY + chartH - ((value - minValue) / Math.max(normalizedMax - minValue, 1)) * chartH;

      pdf.save();
      pdf.strokeColor(colors.text).lineWidth(1.4);
      points.forEach((point, index) => {
        const px = chartLeft + stepX * index;
        const py = toY(point.value);
        if (index === 0) pdf.moveTo(px, py);
        else pdf.lineTo(px, py);
      });
      pdf.stroke();
      pdf.restore();

      points.forEach((point, index) => {
        const px = chartLeft + stepX * index;
        const py = toY(point.value);
        pdf.save();
        pdf.circle(px, py, 2.4).fillAndStroke(colors.paper, colors.text);
        pdf.restore();
        drawText(point.period, px - 20, chartBottom + 6, 40, {
          font: pdfFonts.regular,
          fontSize: 7.9,
          color: colors.mutedSoft,
          align: 'center',
          height: 11,
        });
      });

      drawText(currency.format(Math.max(0, normalizedMax)), MARGIN_X + 12, chartY - 4, 32, {
        font: 'Courier',
        fontSize: 8.2,
        color: colors.muted,
        align: 'right',
        height: 11,
      });
      drawText(currency.format(Math.max(0, minValue)), MARGIN_X + 12, chartBottom - 5, 32, {
        font: 'Courier',
        fontSize: 8.2,
        color: colors.muted,
        align: 'right',
        height: 11,
      });

      const tableY = state.y + 232;
      drawText('Recent monthly points', MARGIN_X + CARD_PADDING, tableY, CONTENT_WIDTH - CARD_PADDING * 2, {
        font: pdfFonts.bold,
        fontSize: 9.6,
        color: colors.text,
        height: 12,
      });
      points.slice(-4).forEach((point, index) => {
        const rowY = tableY + 16 + index * 18;
        drawText(point.period, MARGIN_X + CARD_PADDING, rowY, 70, { font: pdfFonts.regular, fontSize: 8.5, color: colors.muted, height: 11 });
        drawText(currency.format(point.value), MARGIN_X + CARD_PADDING + 92, rowY, CONTENT_WIDTH - CARD_PADDING * 2 - 92, {
          font: 'Courier',
          fontSize: 8.5,
          color: colors.text,
          align: 'right',
          height: 11,
        });
      });
    }

    state.y += historyHeight + SECTION_GAP;

    const growthHeight = 208;
    ensureSpace(growthHeight);
    drawPanel(MARGIN_X, state.y, CONTENT_WIDTH, growthHeight, { fill: colors.surfaceMuted, stroke: colors.border, radius: 8 });
    drawText('Growth Signals', MARGIN_X + CARD_PADDING, state.y + CARD_PADDING - 1, CONTENT_WIDTH - CARD_PADDING * 2, {
      font: pdfFonts.bold,
      fontSize: 12,
      color: colors.text,
      height: 16,
    });
    drawText('Investor note: growth is calculated only from observed Stripe monthly points and should be read as directional, not definitive.', MARGIN_X + CARD_PADDING, state.y + 34, CONTENT_WIDTH - CARD_PADDING * 2, {
      font: pdfFonts.regular,
      fontSize: 8.9,
      color: colors.muted,
      lineGap: 1.9,
      height: 22,
    });

    const miniWidth = (CONTENT_WIDTH - CARD_PADDING * 2 - COLUMN_GAP * 2) / 3;
    const miniY = state.y + 66;
    const miniCards = [
      { label: '1-month growth', value: packet.metrics.growth.oneMonth === null ? 'Not available' : percent.format(packet.metrics.growth.oneMonth), note: 'Current month vs prior month' },
      { label: '3-month growth', value: packet.metrics.growth.threeMonth === null ? 'Not available' : percent.format(packet.metrics.growth.threeMonth), note: 'Longer-run trend check' },
      { label: '6-month growth', value: packet.metrics.growth.sixMonth === null ? 'Not available' : percent.format(packet.metrics.growth.sixMonth), note: 'Only shown when enough data exists' },
    ];
    miniCards.forEach((card, index) => {
      const x = MARGIN_X + CARD_PADDING + index * (miniWidth + COLUMN_GAP);
      drawPanel(x, miniY, miniWidth, 72, { fill: colors.surface, stroke: colors.border, radius: 8 });
      drawText(card.label.toUpperCase(), x + 12, miniY + 10, miniWidth - 24, { font: pdfFonts.bold, fontSize: 8.1, color: colors.muted, characterSpacing: 0.8, height: 11 });
      drawText(card.value, x + 12, miniY + 27, miniWidth - 24, { font: pdfFonts.bold, fontSize: 14, color: colors.text, height: 18 });
      drawText(card.note, x + 12, miniY + 48, miniWidth - 24, { font: pdfFonts.regular, fontSize: 8.1, color: colors.mutedSoft, lineGap: 1.5, height: 12 });
    });

    drawText(packet.metrics.growth.commentary, MARGIN_X + CARD_PADDING, state.y + 146, CONTENT_WIDTH - CARD_PADDING * 2, {
      font: pdfFonts.regular,
      fontSize: 9.2,
      color: colors.text,
      lineGap: 2,
      height: 34,
    });

    state.y += growthHeight + SECTION_GAP;
  };

  const customerPage = () => {
    sectionHeader('Customer & Revenue Quality', 'Customer concentration, refunds, disputes, and subscription context from the connected Stripe dataset.');

    const leftWidth = (CONTENT_WIDTH - COLUMN_GAP) / 2;
    const rightWidth = leftWidth;
    const leftHeight = 214;
    const rightHeight = 214;
    ensureSpace(leftHeight);

    drawStatCard({
      x: MARGIN_X,
      y: state.y,
      w: leftWidth,
      h: leftHeight,
      title: 'Customer Metrics',
      rows: [
        { label: 'Active customers', value: wholeNumber.format(packet.metrics.activeCustomers), note: 'Unique customers seen in Stripe' },
        { label: 'Average revenue per customer', value: packet.metrics.activeCustomers > 0 ? decimalCurrency.format(packet.metrics.arpc) : 'Not available', note: 'Gross revenue divided by active customers' },
        { label: 'Repeat customer rate', value: packet.metrics.repeatCustomerRate === null ? 'Not available' : percent.format(packet.metrics.repeatCustomerRate), note: 'Observed customers with multiple revenue events' },
        { label: 'Subscription count', value: wholeNumber.format(packet.metrics.subscriptionCount), note: 'Total subscriptions observed in the connected Stripe account' },
      ],
    });

    drawStatCard({
      x: MARGIN_X + leftWidth + COLUMN_GAP,
      y: state.y,
      w: rightWidth,
      h: rightHeight,
      title: 'Revenue Quality',
      tone: 'soft',
      rows: [
        { label: 'Refunds', value: currency.format(packet.metrics.refunds), note: 'Refunded volume in the selected window' },
        { label: 'Chargebacks / disputes', value: currency.format(packet.metrics.chargebacks), note: 'Observed disputed volume' },
        { label: 'Dispute rate', value: packet.metrics.grossRevenue > 0 ? percent.format(packet.metrics.chargebacks / packet.metrics.grossRevenue) : 'Not available', note: 'Chargebacks divided by gross revenue' },
        { label: 'Net revenue ratio', value: packet.metrics.grossRevenue > 0 ? percent.format(packet.metrics.netRevenue / packet.metrics.grossRevenue) : 'Not available', note: 'Net revenue as a share of gross revenue' },
      ],
    });

    state.y += leftHeight + SECTION_GAP;

    const concentrationHeight = 146;
    ensureSpace(concentrationHeight + 12);
    drawPanel(MARGIN_X, state.y, CONTENT_WIDTH, concentrationHeight, { fill: colors.surface, stroke: colors.border, radius: 8 });
    drawText('Customer Concentration', MARGIN_X + CARD_PADDING, state.y + CARD_PADDING - 1, CONTENT_WIDTH - CARD_PADDING * 2, {
      font: pdfFonts.bold,
      fontSize: 12,
      color: colors.text,
      height: 16,
    });

    if (packet.metrics.customerConcentration.available) {
      const concentration = packet.metrics.customerConcentration;
      const concentrationRows = [
        { label: 'Largest customer % of revenue', value: concentration.largestCustomerShare === null ? 'Not available' : percent.format(concentration.largestCustomerShare), note: concentration.largestCustomerRevenue !== null ? `${currency.format(concentration.largestCustomerRevenue)} verified through Stripe` : undefined },
        { label: 'Top 5 customers % of revenue', value: concentration.topFiveCustomerShare === null ? 'Not available' : percent.format(concentration.topFiveCustomerShare), note: concentration.topFiveCustomerRevenue !== null ? `${currency.format(concentration.topFiveCustomerRevenue)} from the top five customers` : undefined },
      ];
      concentrationRows.forEach((row, index) => {
        const y = state.y + 34 + index * 40;
        drawText(row.label.toUpperCase(), MARGIN_X + CARD_PADDING, y, CONTENT_WIDTH - CARD_PADDING * 2, {
          font: pdfFonts.bold,
          fontSize: 8.1,
          color: colors.muted,
          characterSpacing: 0.8,
          height: 11,
        });
        drawText(row.value, MARGIN_X + CARD_PADDING, y + 12, CONTENT_WIDTH - CARD_PADDING * 2, {
          font: pdfFonts.bold,
          fontSize: 12.8,
          color: colors.text,
          height: 16,
        });
        if (row.note) {
          drawText(row.note, MARGIN_X + CARD_PADDING, y + 25, CONTENT_WIDTH - CARD_PADDING * 2, {
            font: pdfFonts.regular,
            fontSize: 8.3,
            color: colors.mutedSoft,
            height: 12,
          });
        }
      });
    } else {
      drawEmptyState(
        MARGIN_X + CARD_PADDING,
        state.y + 34,
        CONTENT_WIDTH - CARD_PADDING * 2,
        96,
        'Customer concentration not available from current Stripe dataset',
        'The connected Stripe observations did not include enough customer-level revenue detail to calculate concentration metrics confidently.',
        'Treat this as incomplete evidence, not a negative signal'
      );
    }

    state.y += concentrationHeight + SECTION_GAP;

    ensureSpace(68);
    drawPanel(MARGIN_X, state.y, CONTENT_WIDTH, 64, { fill: colors.surfaceMuted, stroke: colors.border, radius: 8 });
    drawText('Investor read', MARGIN_X + CARD_PADDING, state.y + 12, CONTENT_WIDTH - CARD_PADDING * 2, {
      font: pdfFonts.bold,
      fontSize: 10,
      color: colors.text,
      height: 14,
    });
    const investorRead = packet.metrics.refunds === 0 && packet.metrics.chargebacks === 0
      ? 'Green/neutral: no refunds or disputes were detected in the selected reporting window. That is a positive operational signal, but it still does not prove product-market fit or durable revenue quality.'
      : 'Neutral/conservative: payment adjustments were observed, so investors should review refunds and disputes alongside bank statements, churn, and underlying customer contracts.';
    drawText(investorRead, MARGIN_X + CARD_PADDING, state.y + 26, CONTENT_WIDTH - CARD_PADDING * 2, {
      font: pdfFonts.regular,
      fontSize: 8.7,
      color: colors.muted,
      lineGap: 1.9,
      height: 26,
    });

    state.y += 76;
  };

  const methodologyPage = () => {
    sectionHeader('Verification Methodology', 'How the packet was generated, what evidence it references, and the limits investors should keep in mind.');

    const cardHeight = 132;
    ensureSpace(cardHeight);
    drawPanel(MARGIN_X, state.y, CONTENT_WIDTH, cardHeight, { fill: colors.surface, stroke: colors.border, radius: 8 });
    drawText('How data was verified', MARGIN_X + CARD_PADDING, state.y + CARD_PADDING - 1, CONTENT_WIDTH - CARD_PADDING * 2, {
      font: pdfFonts.bold,
      fontSize: 12,
      color: colors.text,
      height: 16,
    });
    drawBullets([
      { text: 'Connected Stripe account verified through read-only API access.' },
      { text: 'Report generated from a timestamped window and tied to the selected startup.' },
      { text: 'Integrity hash computed from the startup, time window, metrics, references, and generation timestamp.' },
      { text: 'No write access, charging capability, or account modification rights were used.' },
    ], MARGIN_X + CARD_PADDING, state.y + 34, CONTENT_WIDTH - CARD_PADDING * 2, { compact: true });

    state.y += cardHeight + PAGE_GAP;

    const referencesHeight = 180;
    ensureSpace(referencesHeight);
    drawPanel(MARGIN_X, state.y, CONTENT_WIDTH, referencesHeight, { fill: colors.surfaceMuted, stroke: colors.border, radius: 8 });
    drawText('Evidence references', MARGIN_X + CARD_PADDING, state.y + CARD_PADDING - 1, CONTENT_WIDTH - CARD_PADDING * 2, {
      font: pdfFonts.bold,
      fontSize: 12,
      color: colors.text,
      height: 16,
    });
    const referenceGroups: Array<{ title: string; values: string[] }> = [
      { title: 'Stripe Charge IDs', values: packet.references.chargeIds },
      { title: 'Stripe Invoice IDs', values: packet.references.invoiceIds },
      { title: 'Stripe Subscription IDs', values: packet.references.subscriptionIds },
      { title: 'Stripe Customer IDs', values: packet.references.customerIds },
    ];
    const refWidth = (CONTENT_WIDTH - CARD_PADDING * 2 - COLUMN_GAP) / 2;
    referenceGroups.forEach((group, index) => {
      const x = MARGIN_X + CARD_PADDING + (index % 2) * (refWidth + COLUMN_GAP);
      const y = state.y + 34 + Math.floor(index / 2) * 66;
      drawPanel(x, y, refWidth, 58, { fill: colors.surface, stroke: colors.border, radius: 7 });
      drawText(group.title, x + 10, y + 8, refWidth - 20, { font: pdfFonts.bold, fontSize: 9.4, color: colors.text, height: 12 });
      if (group.values.length === 0) {
        drawText('No Stripe object references captured for this category.', x + 10, y + 24, refWidth - 20, {
          font: pdfFonts.regular,
          fontSize: 8.3,
          color: colors.muted,
          lineGap: 1.5,
          height: 20,
        });
      } else {
        const preview = group.values.slice(0, 2).join(', ');
        drawText(preview, x + 10, y + 24, refWidth - 20, {
          font: 'Courier',
          fontSize: 7.9,
          color: colors.muted,
          lineGap: 1.5,
          height: 20,
        });
        if (group.values.length > 2) {
          drawText(`+${group.values.length - 2} more`, x + 10, y + 42, refWidth - 20, {
            font: pdfFonts.regular,
            fontSize: 8,
            color: colors.mutedSoft,
            height: 12,
          });
        }
      }
    });

    state.y += referencesHeight + PAGE_GAP;

    const limitationsHeight = 150;
    ensureSpace(limitationsHeight);
    drawPanel(MARGIN_X, state.y, CONTENT_WIDTH, limitationsHeight, { fill: colors.surface, stroke: colors.border, radius: 8 });
    drawText('Limitations', MARGIN_X + CARD_PADDING, state.y + CARD_PADDING - 1, CONTENT_WIDTH - CARD_PADDING * 2, {
      font: pdfFonts.bold,
      fontSize: 12,
      color: colors.text,
      height: 16,
    });
    drawBullets([
      { text: 'Only Stripe-processed revenue is included.' },
      { text: 'Off-platform revenue is excluded from the packet.' },
      { text: 'This packet is not tax, legal, accounting, or investment advice.' },
      { text: 'Investors should still review bank statements, contracts, churn, CAC, cap table, and founder materials.' },
    ], MARGIN_X + CARD_PADDING, state.y + 34, CONTENT_WIDTH - CARD_PADDING * 2, { compact: true });

    state.y += limitationsHeight;
  };

  startPage();
  headerCard();
  investorSummaryCard();
  tractionSnapshot();
  drawFooter(1);

  pdf.addPage();
  state.page = 2;
  state.y = MARGIN_TOP;
  startPage();
  revenuePage();
  drawFooter(2);

  pdf.addPage();
  state.page = 3;
  state.y = MARGIN_TOP;
  startPage();
  customerPage();
  drawFooter(3);

  pdf.addPage();
  state.page = 4;
  state.y = MARGIN_TOP;
  startPage();
  methodologyPage();
  drawFooter(4);

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

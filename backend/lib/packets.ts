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
  const repeatCustomerRate = null;

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
  drawMetricCard({ x: MARGIN_X + CARD_PADDING, y: currentY + 234, w: columnWidth - CARD_PADDING * 2, h: PAGE3_CARD_HEIGHT, label: 'Repeat Customer Rate', value: repeatCustomerRate === null ? 'N/A' : percent.format(repeatCustomerRate), detail: repeatCustomerRate === null ? 'Placeholder if unavailable from the current Stripe snapshot' : 'Calculated from repeat purchases' });

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

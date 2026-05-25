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

  const formatHash = (value: string) => value.match(/.{1,8}/g)?.join(' ') ?? value;

  const width = pdf.page.width;
  const height = pdf.page.height;
  const margin = 42;
  const contentWidth = width - margin * 2;
  const footerHeight = 30;
  const totalPages = 4;

  const paintPageBackground = () => {
    pdf.rect(0, 0, width, height).fill(colors.paper);
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

  const drawSectionHeader = (title: string, subtitle: string | undefined, x: number, y: number, widthValue: number) => {
    pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(14).text(title, x, y, { width: widthValue });
    if (subtitle) {
      pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(9.5).text(subtitle, x, y + 18, { width: widthValue, lineGap: 1.5 });
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

    pdf.font(pdfFonts.bold).fillColor(colors.muted).fontSize(8.5).text(params.label.toUpperCase(), params.x + 12, params.y + 10, {
      width: params.w - 24,
      characterSpacing: 0.8,
    });
    pdf.font('Courier').fillColor(colors.text).fontSize(params.emphasis ? 24 : 17).text(params.value, params.x + 12, params.y + (params.emphasis ? 28 : 25), {
      width: params.w - 24,
      lineBreak: false,
    });
    if (params.detail) {
      pdf.font(pdfFonts.regular).fillColor(colors.mutedSoft).fontSize(8.5).text(params.detail, params.x + 12, params.y + params.h - 16, {
        width: params.w - 24,
        ellipsis: true,
      });
    }
  };

  const drawStatRow = (x: number, y: number, w: number, label: string, value: string, detail?: string) => {
    pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(9).text(label, x, y, { width: w * 0.48 });
    pdf.font('Courier').fillColor(colors.text).fontSize(11).text(value, x, y, { width: w, align: 'right' });
    if (detail) {
      pdf.font(pdfFonts.regular).fillColor(colors.mutedSoft).fontSize(8).text(detail, x, y + 12, { width: w, align: 'right' });
    }
  };

  const drawFooter = (pageNumber: number) => {
    const lineY = height - footerHeight - 10;
    pdf.save();
    pdf.moveTo(margin, lineY).lineTo(width - margin, lineY).lineWidth(0.5).stroke(colors.border);
    pdf.restore();

    pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(8).text(
      `ProofRound Verified Packet · ${packet.id} · Generated ${formatDate(packet.createdAt)}`,
      margin,
      height - footerHeight,
      { width: contentWidth - 90, ellipsis: true }
    );
    pdf.font(pdfFonts.regular).fillColor(colors.mutedSoft).fontSize(8).text(`Page ${pageNumber} of ${totalPages}`, width - margin - 72, height - footerHeight, {
      width: 72,
      align: 'right',
    });
  };

  const drawExecutiveSummary = () => {
    drawPanel(margin, 210, contentWidth, 62, { fill: colors.surfaceMuted, stroke: colors.border, radius: 7 });
    pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(9).text('EXECUTIVE SUMMARY', margin + 14, 222, { width: contentWidth - 28, characterSpacing: 0.8 });
    pdf.font(pdfFonts.regular).fillColor(colors.text).fontSize(10).text(
      'This packet contains a point-in-time snapshot of Stripe-backed revenue metrics generated using read-only API access. It is intended to help founders share standardized revenue verification during fundraising and acquisition discussions.',
      margin + 14,
      237,
      {
        width: contentWidth - 28,
        lineGap: 2,
      }
    );
  };

  const revenueCommentary = () => {
    const points = packet.metrics.monthlyBreakdown.slice(-6);
    if (points.length === 0) {
      return 'No recurring monthly revenue detected during this reporting window.';
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
    pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(12).text('Revenue history', x + 14, y + 12, { width: w - 28 });
    pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(9).text('Monthly gross revenue based on connected Stripe data', x + 14, y + 30, { width: w - 28 });

    const points = packet.metrics.monthlyBreakdown.slice(-6);
    if (points.length === 0) {
      pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(10).text('No recurring monthly revenue detected during this reporting window.', x + 14, y + 62, {
        width: w - 28,
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
      pdf.font(pdfFonts.regular).fillColor(colors.mutedSoft).fontSize(8).text(point.period, px - 16, baseline + 6, { width: 32, align: 'center' });
    });

    pdf.font('Courier').fillColor(colors.text).fontSize(8.5).text(currency.format(Math.max(minValue, 0)), x + 12, chartY + chartH - 4, { width: 38, align: 'right' });
    pdf.font('Courier').fillColor(colors.text).fontSize(8.5).text(currency.format(paddedMax), x + 12, chartY - 4, { width: 38, align: 'right' });
  };

  const drawReferenceList = (title: string, values: string[], x: number, y: number, w: number, maxItems = 6) => {
    pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(10).text(title, x, y, { width: w });
    const items = values.slice(0, maxItems);
    let cursorY = y + 14;
    if (items.length === 0) {
      pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(8.5).text('No references captured in this category.', x, cursorY, { width: w });
      return cursorY + 14;
    }

    items.forEach(value => {
      pdf.font('Courier').fillColor(colors.muted).fontSize(8.5).text(value, x, cursorY, { width: w, ellipsis: true });
      cursorY += 12;
    });

    if (values.length > items.length) {
      pdf.font(pdfFonts.regular).fillColor(colors.mutedSoft).fontSize(8).text(`and ${values.length - items.length} more`, x, cursorY, { width: w });
      cursorY += 12;
    }

    return cursorY + 4;
  };

  const drawDisclaimerBlock = (x: number, y: number, w: number, h: number) => {
    drawPanel(x, y, w, h, { fill: colors.surfaceMuted, stroke: colors.border, radius: 7 });
    pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(10).text('LIMITATIONS / DISCLAIMER', x + 14, y + 12, { width: w - 28 });
    pdf.font(pdfFonts.regular).fillColor(colors.text).fontSize(9.5).text(
      'This report reflects a point-in-time snapshot of revenue processed through a connected Stripe account using read-only API access. Metrics may exclude revenue processed outside Stripe.',
      x + 14,
      y + 28,
      { width: w - 28, lineGap: 2 }
    );
  };

  const grossRevenue = packet.metrics.grossRevenue;
  const disputeRate = grossRevenue > 0 ? packet.metrics.chargebacks / grossRevenue : 0;
  const repeatCustomerRate = null;

  startPage();

  drawPanel(margin, 42, contentWidth, 148, { fill: colors.surface, stroke: colors.borderStrong, radius: 8 });
  pdf.font(pdfFonts.bold).fillColor(colors.accent).fontSize(9).text('STRIPE-VERIFIED SNAPSHOT', margin + 16, 56, { width: 180, characterSpacing: 0.9 });
  pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(22).text('✅ Stripe-Verified Snapshot', margin + 16, 74, { width: 360 });
  pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(10).text('Generated from connected Stripe API data', margin + 16, 104, { width: 260 });
  pdf.font(pdfFonts.regular).fillColor(colors.text).fontSize(11).text('Point-in-time revenue verification', margin + 16, 122, { width: 260 });
  pdf.font(pdfFonts.regular).fillColor(colors.mutedSoft).fontSize(9).text(startup.name, margin + 16, 140, { width: 260, ellipsis: true });

  const headerMetaX = margin + contentWidth - 260;
  drawPanel(headerMetaX, 58, 244, 114, { fill: colors.surfaceMuted, stroke: colors.border, radius: 7 });
  drawStatRow(headerMetaX + 12, 72, 220, 'Generated timestamp', formatDate(packet.createdAt), undefined);
  drawStatRow(headerMetaX + 12, 96, 220, 'Verification ID', packet.id, undefined);
  pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(9).text('Report integrity hash', headerMetaX + 12, 120, { width: 220 });
  pdf.font('Courier').fillColor(colors.text).fontSize(8.3).text(formatHash(packet.verificationHash), headerMetaX + 12, 134, { width: 220, lineGap: 1.2 });

  drawExecutiveSummary();

  drawSectionHeader('Revenue Metrics', 'Gross revenue is presented as the primary figure, followed by the remaining revenue indicators.', margin, 288, contentWidth);
  drawMetricCard({ x: margin, y: 312, w: contentWidth, h: 104, label: 'Gross Revenue', value: currency.format(packet.metrics.grossRevenue), detail: 'Primary revenue figure for diligence review', emphasis: true, fill: colors.surface });
  const metricGap = 12;
  const smallMetricWidth = (contentWidth - metricGap * 2) / 3;
  const smallMetricY = 428;
  drawMetricCard({ x: margin, y: smallMetricY, w: smallMetricWidth, h: 82, label: 'Net Revenue', value: currency.format(packet.metrics.netRevenue), detail: 'After refunds and chargebacks' });
  drawMetricCard({ x: margin + smallMetricWidth + metricGap, y: smallMetricY, w: smallMetricWidth, h: 82, label: 'MRR', value: currency.format(packet.metrics.mrr), detail: 'Monthly recurring revenue' });
  drawMetricCard({ x: margin + (smallMetricWidth + metricGap) * 2, y: smallMetricY, w: smallMetricWidth, h: 82, label: 'ARR', value: currency.format(packet.metrics.arr), detail: 'Annualized recurring revenue' });
  drawFooter(1);

  pdf.addPage();
  startPage();
  drawSectionHeader('Revenue History', 'The chart is intentionally minimal, monochrome, and audit-oriented.', margin, 44, contentWidth);
  drawMonthlyChart(margin, 74, contentWidth, 250);

  drawPanel(margin, 340, contentWidth, 210, { fill: colors.surfaceMuted, stroke: colors.border, radius: 7 });
  pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(12).text('Revenue Trend Commentary', margin + 14, 354, { width: contentWidth - 28 });
  pdf.font(pdfFonts.regular).fillColor(colors.text).fontSize(10).text(revenueCommentary(), margin + 14, 374, {
    width: contentWidth - 28,
    lineGap: 2,
  });

  pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(10).text('Monthly revenue points', margin + 14, 438, { width: contentWidth - 28 });
  const monthlyPoints = packet.metrics.monthlyBreakdown.slice(-6);
  if (monthlyPoints.length === 0) {
    pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(9.5).text('No recurring monthly revenue detected during this reporting window.', margin + 14, 456, {
      width: contentWidth - 28,
    });
  } else {
    const tableLeft = margin + 14;
    const tableTop = 456;
    const tableWidth = contentWidth - 28;
    pdf.save();
    pdf.moveTo(tableLeft, tableTop + 12).lineTo(tableLeft + tableWidth, tableTop + 12).lineWidth(0.5).stroke(colors.border);
    pdf.restore();
    monthlyPoints.forEach((point, index) => {
      const rowY = tableTop + 18 + index * 18;
      pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(9).text(point.period, tableLeft, rowY, { width: 70 });
      pdf.font('Courier').fillColor(colors.text).fontSize(9).text(currency.format(point.value), tableLeft + 90, rowY, { width: tableWidth - 90, align: 'right' });
    });
  }
  drawFooter(2);

  pdf.addPage();
  startPage();
  drawSectionHeader('Customer and Subscription Metrics', 'Customer counts and per-account metrics are presented with audit-style restraint.', margin, 44, contentWidth);

  const columnGap = 12;
  const leftWidth = (contentWidth - columnGap) / 2;
  const rightWidth = leftWidth;
  drawPanel(margin, 76, leftWidth, 212, { fill: colors.surface, stroke: colors.border, radius: 7 });
  drawPanel(margin + leftWidth + columnGap, 76, rightWidth, 212, { fill: colors.surfaceMuted, stroke: colors.border, radius: 7 });

  pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(12).text('Customer metrics', margin + 14, 90, { width: leftWidth - 28 });
  drawMetricCard({ x: margin + 14, y: 116, w: leftWidth - 28, h: 50, label: 'Active Customers', value: wholeNumber.format(packet.metrics.activeCustomers), detail: 'Unique customer count in the reporting window' });
  drawMetricCard({ x: margin + 14, y: 172, w: leftWidth - 28, h: 50, label: 'ARPC', value: decimalCurrency.format(packet.metrics.arpc), detail: 'Average revenue per customer' });
  drawMetricCard({ x: margin + 14, y: 228, w: leftWidth - 28, h: 50, label: 'Repeat Customer Rate', value: repeatCustomerRate === null ? 'N/A' : percent.format(repeatCustomerRate), detail: repeatCustomerRate === null ? 'Placeholder if unavailable from the current Stripe snapshot' : 'Calculated from repeat purchases' });

  pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(12).text('Risk & quality', margin + leftWidth + columnGap + 14, 90, { width: rightWidth - 28 });
  drawMetricCard({ x: margin + leftWidth + columnGap + 14, y: 116, w: rightWidth - 28, h: 50, label: 'Refunds', value: currency.format(packet.metrics.refunds), detail: 'Refunded volume during the period' });
  drawMetricCard({ x: margin + leftWidth + columnGap + 14, y: 172, w: rightWidth - 28, h: 50, label: 'Chargebacks', value: currency.format(packet.metrics.chargebacks), detail: 'Disputed volume during the period' });
  drawMetricCard({ x: margin + leftWidth + columnGap + 14, y: 228, w: rightWidth - 28, h: 50, label: 'Dispute Rate', value: percent.format(disputeRate), detail: 'Chargebacks divided by gross revenue' });

  drawPanel(margin, 306, contentWidth, 124, { fill: colors.surfaceMuted, stroke: colors.border, radius: 7 });
  pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(11).text('Quality context', margin + 14, 320, { width: contentWidth - 28 });
  pdf.font(pdfFonts.regular).fillColor(colors.text).fontSize(9.5).text(
    'Refunds and chargebacks are shown separately so diligence reviewers can distinguish customer-favorable adjustments from disputed payment volume. The packet remains intentionally conservative and does not infer any off-Stripe revenue quality measures.',
    margin + 14,
    338,
    { width: contentWidth - 28, lineGap: 2 }
  );
  drawFooter(3);

  pdf.addPage();
  startPage();
  drawSectionHeader('Verification Methodology', 'The last page documents how the packet is derived and what it does not attempt to prove.', margin, 44, contentWidth);

  drawPanel(margin, 76, contentWidth, 126, { fill: colors.surfaceMuted, stroke: colors.border, radius: 7 });
  pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(11).text('Methodology', margin + 14, 90, { width: contentWidth - 28 });
  const methodologyNotes = [
    'Metrics are generated from a connected Stripe account using read-only API access.',
    'Gross revenue combines succeeded charges and paid invoices within the selected time window.',
    'Net revenue subtracts refunded and disputed amounts from gross revenue.',
    'MRR and ARR are derived from active subscription pricing intervals.',
    'The integrity hash is derived from the startup, time window, metrics, references, and generation timestamp.',
  ];
  let noteY = 110;
  methodologyNotes.forEach(note => {
    pdf.font(pdfFonts.regular).fillColor(colors.text).fontSize(9.2).text(`• ${note}`, margin + 14, noteY, { width: contentWidth - 28, lineGap: 1.2 });
    noteY = pdf.y + 4;
  });

  drawPanel(margin, 214, contentWidth, 140, { fill: colors.surface, stroke: colors.border, radius: 7 });
  pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(11).text('Verification metadata', margin + 14, 228, { width: contentWidth - 28 });
  drawStatRow(margin + 14, 248, contentWidth - 28, 'Startup', startup.name, startup.tagline || startup.stage || startup.industry || 'Investor verification packet');
  drawStatRow(margin + 14, 272, contentWidth - 28, 'Reporting window', `${formatDate(packet.timeRangeStart)} to ${formatDate(packet.timeRangeEnd)}`);
  drawStatRow(margin + 14, 296, contentWidth - 28, 'Generated by', packet.generatedBy);
  pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(9).text('Verification hash', margin + 14, 320, { width: contentWidth - 28 });
  pdf.font('Courier').fillColor(colors.text).fontSize(7.8).text(formatHash(packet.verificationHash), margin + 14, 333, {
    width: contentWidth - 28,
    lineGap: 1.1,
  });

  const referenceGroups: Array<{ title: string; values: string[] }> = [
    { title: 'Stripe Charge IDs', values: packet.references.chargeIds },
    { title: 'Stripe Invoice IDs', values: packet.references.invoiceIds },
    { title: 'Stripe Subscription IDs', values: packet.references.subscriptionIds },
    { title: 'Stripe Customer IDs', values: packet.references.customerIds },
  ];

  drawPanel(margin, 364, contentWidth, 166, { fill: colors.surfaceMuted, stroke: colors.border, radius: 7 });
  pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(11).text('Stripe read-only evidence', margin + 14, 366, { width: contentWidth - 28 });
  const leftEvidenceWidth = (contentWidth - 36) / 2;
  const rightEvidenceX = margin + leftEvidenceWidth + 22;
  drawReferenceList(referenceGroups[0].title, referenceGroups[0].values, margin + 14, 386, leftEvidenceWidth, 3);
  drawReferenceList(referenceGroups[1].title, referenceGroups[1].values, rightEvidenceX, 386, leftEvidenceWidth, 3);
  drawReferenceList(referenceGroups[2].title, referenceGroups[2].values, margin + 14, 448, leftEvidenceWidth, 3);
  drawReferenceList(referenceGroups[3].title, referenceGroups[3].values, rightEvidenceX, 448, leftEvidenceWidth, 3);

  drawDisclaimerBlock(margin, 542, contentWidth, 72);
  pdf.font(pdfFonts.regular).fillColor(colors.mutedSoft).fontSize(8.5).text(
    'The packet is informational only and does not replace accounting, legal, or investment diligence. All references are included for traceability and do not grant write access to the Stripe account.',
    margin + 14,
    562,
    { width: contentWidth - 28, lineGap: 1.2 }
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

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
  const pdf = new PDFDocument({ size: 'A4', margin: 48 });
  const pdfFonts = configurePdfFonts(pdf);
  const chunks: Buffer[] = [];

  const output = new Promise<Buffer>((resolve, reject) => {
    pdf.on('data', chunk => chunks.push(Buffer.from(chunk)));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
  });

  const colors = {
    page: '#f6f8fc',
    surface: '#ffffff',
    surface2: '#f1f5f9',
    border: '#d8e1ec',
    text: '#0f172a',
    muted: '#475569',
    accent: '#4f46e5',
    accent2: '#0f9d8c',
    badgeBg: '#ecfeff',
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

  const width = pdf.page.width;
  const height = pdf.page.height;
  const margin = 42;
  const contentWidth = width - margin * 2;

  const paintPageBackground = () => {
    pdf.rect(0, 0, width, height).fill(colors.page);
  };

  const drawPanel = (x: number, y: number, w: number, h: number, radius = 12, useSurface2 = false) => {
    pdf.roundedRect(x, y, w, h, radius).fill(useSurface2 ? colors.surface2 : colors.surface);
    pdf.roundedRect(x, y, w, h, radius).lineWidth(1).stroke(colors.border);
  };

  paintPageBackground();
  pdf.font(pdfFonts.regular);

  // Header panel
  const headerHeight = 122;
  drawPanel(margin, margin, contentWidth, headerHeight, 16);

  pdf.font(pdfFonts.bold).fillColor(colors.muted).fontSize(9).text('PROOFROUND · VERIFICATION PACKET', margin + 18, margin + 14, {
    width: 280,
    characterSpacing: 1.3,
  });
  pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(26).text(startup.name, margin + 18, margin + 30, {
    width: contentWidth - 190,
  });
  if (startup.tagline) {
    pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(11).text(startup.tagline, margin + 18, margin + 67, {
      width: contentWidth - 220,
      lineGap: 2,
    });
  }

  const badgeWidth = 132;
  const badgeX = margin + contentWidth - badgeWidth - 18;
  const badgeY = margin + 18;
  pdf.roundedRect(badgeX, badgeY, badgeWidth, 30, 15).fill(colors.badgeBg);
  pdf.roundedRect(badgeX, badgeY, badgeWidth, 30, 15).lineWidth(1).stroke(colors.accent2);
  pdf.font(pdfFonts.bold).fillColor(colors.accent2).fontSize(11).text('VERIFIED', badgeX, badgeY + 10, {
    width: badgeWidth,
    align: 'center',
    characterSpacing: 0.8,
  });

  pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(9).text(`Generated ${formatDate(packet.createdAt)}`, badgeX, badgeY + 40, {
    width: badgeWidth,
    align: 'center',
  });

  pdf.fillColor(colors.muted).fontSize(9).text('Read-only Stripe snapshot for investor diligence', margin + 18, margin + 101, {
    width: contentWidth - 36,
  });

  // Metadata row
  const metaY = margin + headerHeight + 14;
  drawPanel(margin, metaY, contentWidth, 48, 10, true);
  pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(10);
  pdf.text('Time range', margin + 14, metaY + 7);
  pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(10).text(`${formatDate(packet.timeRangeStart)} -> ${formatDate(packet.timeRangeEnd)}`, margin + 14, metaY + 22, {
    width: contentWidth - 28,
  });

  // Metric cards grid
  const metrics = [
    { label: 'MRR', value: currency.format(packet.metrics.mrr), detail: 'Monthly recurring revenue' },
    { label: 'ARR', value: currency.format(packet.metrics.arr), detail: 'Annualized recurring revenue' },
    { label: 'Gross Revenue', value: currency.format(packet.metrics.grossRevenue), detail: 'Before refunds and disputes' },
    { label: 'Net Revenue', value: currency.format(packet.metrics.netRevenue), detail: 'After adjustments' },
    { label: 'Refunds', value: currency.format(packet.metrics.refunds), detail: 'Refunded amount' },
    { label: 'Chargebacks', value: currency.format(packet.metrics.chargebacks), detail: 'Disputed volume' },
    { label: 'Active Customers', value: packet.metrics.activeCustomers.toLocaleString('en-US'), detail: 'Read-only customer count' },
    { label: 'ARPC', value: decimalCurrency.format(packet.metrics.arpc), detail: 'Average revenue per customer' },
  ];

  const cardsTop = metaY + 58;
  const cardGap = 10;
  const cardWidth = (contentWidth - cardGap) / 2;
  const cardHeight = 68;

  metrics.forEach((metric, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + col * (cardWidth + cardGap);
    const y = cardsTop + row * (cardHeight + 10);

    drawPanel(x, y, cardWidth, cardHeight, 10);

    pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(9).text(metric.label.toUpperCase(), x + 12, y + 10, {
      width: cardWidth - 24,
      characterSpacing: 0.7,
    });
    pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(18).text(metric.value, x + 12, y + 23, {
      width: cardWidth - 24,
    });
    pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(8.5).text(metric.detail, x + 12, y + 50, {
      width: cardWidth - 24,
    });
  });

  // Monthly breakdown section
  const breakdownY = cardsTop + 4 * (cardHeight + 10) + 8;
  const breakdownHeight = 138;
  drawPanel(margin, breakdownY, contentWidth, breakdownHeight, 12, true);

  pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(13).text('Revenue Trend (Monthly)', margin + 14, breakdownY + 12);

  const points = packet.metrics.monthlyBreakdown.slice(-6);
  if (points.length === 0) {
    pdf.fillColor(colors.muted).fontSize(10).text('No monthly revenue points found for this range.', margin + 14, breakdownY + 36);
  } else {
    const maxValue = Math.max(...points.map(point => point.value), 1);
    const startY = breakdownY + 38;
    const rowGap = 15;
    const barX = margin + 110;
    const barMaxWidth = contentWidth - 160;

    points.forEach((point, i) => {
      const y = startY + i * rowGap;
      const barWidth = Math.max(6, (point.value / maxValue) * barMaxWidth);

      pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(9).text(point.period, margin + 14, y - 1, { width: 88 });
      pdf.roundedRect(barX, y + 1, barMaxWidth, 8, 4).fill('#e2e8f0');
      pdf.roundedRect(barX, y + 1, barWidth, 8, 4).fill(colors.accent);
      pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(9).text(currency.format(point.value), barX + barMaxWidth - 76, y - 1, {
        width: 72,
        align: 'right',
      });
    });
  }

  // Footer trust note
  const footerY = height - 78;
  drawPanel(margin, footerY, contentWidth, 34, 9);
  pdf.font(pdfFonts.bold).fillColor(colors.accent2).fontSize(9).text('READ-ONLY STRIPE ACCESS', margin + 12, footerY + 7, {
    characterSpacing: 0.8,
  });
  pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(8).text(`Hash ${packet.verificationHash.slice(0, 20)}... | Packet ID ${packet.id}`, margin + 200, footerY + 8, {
    width: contentWidth - 210,
    align: 'right',
  });

  pdf.fillColor(colors.muted).fontSize(7.5).text(
    'Generated from Stripe-backed data. This packet is informational and does not replace accounting, legal, or investment diligence.',
    margin,
    height - 32,
    { width: contentWidth, align: 'center' }
  );

  const referenceGroups: Array<{ title: string; values: string[] }> = [
    { title: 'Stripe Charge IDs', values: packet.references.chargeIds },
    { title: 'Stripe Invoice IDs', values: packet.references.invoiceIds },
    { title: 'Stripe Subscription IDs', values: packet.references.subscriptionIds },
    { title: 'Stripe Customer IDs', values: packet.references.customerIds },
  ];
  const hasReferences = referenceGroups.some(group => group.values.length > 0);

  if (hasReferences) {
    pdf.addPage();
    paintPageBackground();

    drawPanel(margin, margin, contentWidth, 94, 16);
    pdf.font(pdfFonts.bold).fillColor(colors.muted).fontSize(9).text('PROOFROUND · SOURCE REFERENCES', margin + 18, margin + 14, {
      width: 300,
      characterSpacing: 1.3,
    });
    pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(22).text('Audit Trail & Stripe References', margin + 18, margin + 32, {
      width: contentWidth - 36,
    });
    pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(10).text('Use these IDs to trace packet figures to Stripe records during investor diligence.', margin + 18, margin + 62, {
      width: contentWidth - 36,
    });

    const sectionTop = margin + 110;
    const leftWidth = contentWidth * 0.62;
    const rightWidth = contentWidth - leftWidth - 12;

    drawPanel(margin, sectionTop, leftWidth, 560, 12, true);
    drawPanel(margin + leftWidth + 12, sectionTop, rightWidth, 560, 12);

    let cursorY = sectionTop + 14;
    referenceGroups.forEach(group => {
      if (group.values.length === 0) {
        return;
      }

      pdf.font(pdfFonts.bold).fillColor(colors.accent2).fontSize(10).text(group.title, margin + 14, cursorY, {
        width: leftWidth - 28,
      });
      cursorY += 14;

      const values = group.values.slice(0, 10);
      values.forEach(value => {
        if (cursorY > sectionTop + 530) {
          return;
        }

        pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(8.5).text(`• ${value}`, margin + 18, cursorY, {
          width: leftWidth - 32,
          ellipsis: true,
        });
        cursorY += 12;
      });

      if (group.values.length > values.length && cursorY <= sectionTop + 530) {
        pdf.fillColor(colors.muted).fontSize(8.5).text(`…and ${group.values.length - values.length} more`, margin + 18, cursorY, {
          width: leftWidth - 32,
        });
        cursorY += 12;
      }

      cursorY += 8;
    });

    const rightX = margin + leftWidth + 26;
    pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(12).text('Methodology', rightX, sectionTop + 16, { width: rightWidth - 28 });
    const notes = [
      'Metrics are generated from Stripe account data connected by the founder.',
      'MRR/ARR are derived from active subscription pricing intervals.',
      'Net revenue reflects gross revenue minus refunded and disputed amounts.',
      'Packet hash is generated from startup, time range, and metric payload values.',
      'This report is read-only and does not authorize charges or account changes.',
    ];

    let noteY = sectionTop + 42;
    notes.forEach(note => {
      pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(9.2).text(`• ${note}`, rightX, noteY, {
        width: rightWidth - 34,
        lineGap: 1,
      });
      noteY = pdf.y + 8;
    });

    drawPanel(margin + leftWidth + 12 + 14, sectionTop + 370, rightWidth - 28, 170, 10, true);
    pdf.font(pdfFonts.bold).fillColor(colors.text).fontSize(10).text('Packet Metadata', rightX, sectionTop + 384, { width: rightWidth - 34 });
    pdf.font(pdfFonts.regular).fillColor(colors.muted).fontSize(8.8).text(`Packet ID: ${packet.id}`, rightX, sectionTop + 404, { width: rightWidth - 34, ellipsis: true });
    pdf.text(`Startup ID: ${packet.startupId || startup.id}`, rightX, sectionTop + 420, { width: rightWidth - 34, ellipsis: true });
    pdf.text(`Generated By: ${packet.generatedBy}`, rightX, sectionTop + 436, { width: rightWidth - 34, ellipsis: true });
    pdf.text(`Created At: ${formatDate(packet.createdAt)}`, rightX, sectionTop + 452, { width: rightWidth - 34, ellipsis: true });
    pdf.text(`Expires At: ${formatDate(packet.expiresAt)}`, rightX, sectionTop + 468, { width: rightWidth - 34, ellipsis: true });
    pdf.text(`Verification Hash: ${packet.verificationHash.slice(0, 36)}...`, rightX, sectionTop + 484, { width: rightWidth - 34, ellipsis: true });

    const pageFooterY = height - 54;
    drawPanel(margin, pageFooterY, contentWidth, 24, 8);
    pdf.fillColor(colors.muted).fontSize(8).text('ProofRound · Source references exported for audit traceability', margin + 12, pageFooterY + 8, {
      width: contentWidth - 24,
      align: 'center',
    });
  }

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

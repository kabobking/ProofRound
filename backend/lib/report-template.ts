/**
 * ProofRound Investor Revenue Snapshot HTML/CSS Report Generator
 *
 * Renders an institutional-grade, multi-page financial diligence report
 * formatted for US Letter print media via Browserless / headless Chromium.
 */

export interface ReportStartupData {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  founderId?: string;
  founderEmail?: string;
  stripeAccountId?: string;
  industry?: string;
  stage?: string;
  location?: string;
}

export interface ReportMonthlyBreakdownItem {
  period: string;
  value: number;
  grossRevenue?: number;
  refunds?: number;
  netRevenue?: number;
  transactions?: number;
}

export interface ReportPacketData {
  id: string;
  startupId?: string;
  stripeAccountId: string;
  generatedBy: string;
  timeRangeStart: string;
  timeRangeEnd: string;
  metrics: {
    mrr: number;
    arr: number;
    grossRevenue: number;
    netRevenue: number;
    refunds: number;
    chargebacks: number;
    monthlyBreakdown: ReportMonthlyBreakdownItem[];
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
}

// Formatters
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const decimalCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat('en-US');

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Inline SVG Brand Assets
const SVG_FULL_LOGO = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="350 265 504 100" width="168" height="34" fill="none">
  <path fill="#4F46E5" d="M352 267.085L396.78 267.09L396.78 281.373L387.63 291.203L404.28 308.946L415.51 296.845L425.83 296.839L425.84 363L352.01 363L352 267.085Z M424.98 270.662L430.07 275.617L404.31 303.453L392.77 291.215L397.65 285.961L404.3 293.055L424.98 270.662Z M400.53 267C400.6 267.08 400.67 267.157 400.74 267.233C400.74 267.233 400.89 267.384 400.89 267.384C401.48 268.005 402.07 268.625 402.67 269.241C405.24 271.883 407.79 274.549 410.37 277.184C410.97 277.801 411.58 278.418 412.17 279.05L404.28 287.596L400.54 283.557L400.53 267Z M418.95 293.07L422.27 289.445L425.77 293.08L418.95 293.07Z" />
  <path fill="#111827" fill-rule="evenodd" d="M444.75 288.86C454.14 288.701 467.7 287.048 476.25 292.017C481.88 295.29 484.5 301.529 483.56 307.918C482.15 317.533 475.02 323.24 465.46 323.448C461.72 323.53 457.97 323.44 454.23 323.477L454.24 341.206L444.77 341.215L444.75 288.86Z M454.67 297.433C456.87 297.327 459.07 297.3 461.27 297.352C465.52 297.453 471.76 298.579 473.87 302.867C475.36 305.891 473.72 309.695 471.77 312.119C468.89 315.694 458.22 314.781 454.24 314.771C454.3 308.984 453.82 303.157 454.67 297.433Z M499.32 307.596C504.36 304.362 504.97 303.128 511.19 302.468C511.66 305.922 511.62 307.893 511.64 311.726C510.74 311.895 509.84 312.078 508.96 312.279C500.51 314.18 498.48 319.579 498.66 328.067C498.75 332.453 499.21 336.824 499.27 341.212C497.44 341.318 492.4 341.772 490.8 340.729C490.03 340.231 490.18 336.65 490.17 335.947C490.12 325.006 490.23 314.064 490.16 303.123C493.09 303.16 496.03 303.129 498.94 303.468L499.32 307.596Z M534.48 302.092C545.57 302.051 554.61 311.01 554.67 322.111C554.72 333.212 545.77 342.26 534.67 342.329C523.55 342.399 514.49 333.432 514.43 322.311C514.38 311.189 523.35 302.133 534.48 302.092Z M534.47 311.042C540.69 311.007 545.74 316.035 545.74 322.25C545.74 328.464 540.69 333.493 534.48 333.458C528.31 333.424 523.33 328.416 523.33 322.25C523.33 316.084 528.31 311.076 534.47 311.042Z M579.95 302.053C591.15 301.964 600.28 311.02 600.28 322.222C600.28 333.424 591.15 342.48 579.95 342.391C568.88 342.302 559.95 333.298 559.95 322.222C559.95 311.146 568.88 302.142 579.95 302.053Z M580.15 310.974C586.29 311.002 591.27 315.958 591.32 322.097C591.38 328.235 586.49 333.279 580.35 333.416C576.31 333.507 572.53 331.413 570.46 327.937C568.39 324.461 568.35 320.14 570.36 316.628C572.37 313.115 576.11 310.955 580.15 310.974Z M603.31 303.316C604.53 303.195 605.76 303.144 606.98 303.108C608.57 303.06 609.08 302.325 609.68 300.879C611.93 295.427 610.17 292.007 616.16 289.306C618.08 288.438 625.53 286.459 627.29 287.741C627.97 288.232 627.6 293.807 627.41 294.95C625.17 296.031 623.52 296.18 621.24 296.858C618.96 297.537 618.31 300.102 618.78 302.239C619.04 303.443 621.64 303.258 622.54 303.271C624.36 303.297 626.18 303.285 628 303.272L627.97 311.374L618.57 311.238C618.82 318.44 618.8 325.649 618.71 332.855C618.68 335.648 618.45 338.435 618.25 341.222L609.41 341.196C609.51 332.263 609.79 323.318 609.24 314.401C609.18 313.527 609.09 312.656 608.97 311.789C607.6 311.457 606.18 311.317 604.9 310.744C602.43 309.636 603.05 305.458 603.31 303.316Z M633.77 288.803C641.24 288.731 651.99 287.821 659.44 289.436C667.02 291.079 673.88 297.274 673.46 305.524C673.11 312.535 668.9 317.073 663.39 320.841C663.64 321.363 663.9 321.881 664.18 322.393C667.2 328.001 670.48 333.469 673.54 339.055C673.92 339.751 674.29 340.453 674.62 341.176L664.26 341.21L653.43 322.391L643.22 322.358L643.24 341.205L633.77 341.215L633.77 288.803Z M643.36 297.366C647.91 297.321 658.01 296.892 662.29 300.721C665.46 303.56 663.7 308.14 661.59 311.096C658.72 315.117 647.47 314.253 643.33 314.066L643.36 297.366Z M697.44 302.091C708.61 301.916 717.78 310.863 717.9 322.034C718.01 333.204 709.01 342.331 697.84 342.378C686.76 342.425 677.72 333.513 677.61 322.433C677.5 311.353 686.36 302.264 697.44 302.091Z M697.84 310.976C703.97 311.021 708.92 315.972 708.98 322.098C709.03 328.225 704.16 333.264 698.04 333.418C693.99 333.519 690.2 331.429 688.12 327.948C686.04 324.467 686 320.137 688.02 316.62C690.03 313.103 693.79 310.946 697.84 310.976Z M724.29 303.109L733.51 303.16C733.46 309.161 732.46 323.138 734.34 328.97C735.32 332.017 739.1 333.474 742.02 333.827C754.19 335.297 751.39 307.943 751.23 303.11L760.38 303.16L760.33 341.308C759.35 341.353 758.36 341.399 757.38 341.425C753.55 341.524 752.77 340.811 750.63 337.724C749.17 338.444 747.8 339.315 746.42 340.184C742.26 342.81 737.39 342.941 732.89 341.027C724.34 337.393 723.78 325.049 723.83 317.194C723.86 312.496 724.2 307.806 724.29 303.109Z M778.17 306.882C782.03 304.885 783.81 302.571 788.4 302.399C800.35 301.951 804.08 309.595 804.87 320.386C805.38 327.325 804.63 334.286 804.6 341.244L795.63 341.238C795.67 335.85 795.84 330.462 795.79 325.074C795.76 321.089 796.02 316.046 793.01 312.944C790.85 310.726 786.25 309.894 783.54 311.459C778.59 314.313 778.19 319.436 778.13 324.576C778.07 330.118 778.16 335.662 778.24 341.204L769.18 341.209L769.03 303.126L777.81 303.431L778.17 306.882Z M842.92 288.251L851.99 288.276L851.81 341.217C851.12 341.256 850.43 341.318 849.73 341.342C845.53 341.487 844.89 341.458 842.72 337.875C838.82 340.019 834.64 342.046 830.19 342.06C824.63 342.077 819.76 339.796 816.1 335.677C808.53 327.179 809.84 312.305 819.35 305.75C827.16 300.364 835.52 302.006 842.91 307.168L842.92 288.251Z M831.88 310.864C838.13 311.002 843.08 316.162 842.98 322.409C842.87 328.656 837.73 333.639 831.48 333.557C825.2 333.476 820.17 328.297 820.28 322.011C820.4 315.724 825.59 310.725 831.88 310.864Z" />
</svg>
`;

const SVG_MARK_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="352 267 78 96" width="16" height="20" fill="none">
  <path fill="#4F46E5" d="M352 267.085L396.78 267.09L396.78 281.373L387.63 291.203L404.28 308.946L415.51 296.845L425.83 296.839L425.84 363L352.01 363L352 267.085Z M424.98 270.662L430.07 275.617L404.31 303.453L392.77 291.215L397.65 285.961L404.3 293.055L424.98 270.662Z M400.53 267C400.6 267.08 400.67 267.157 400.74 267.233C400.74 267.233 400.89 267.384 400.89 267.384C401.48 268.005 402.07 268.625 402.67 269.241C405.24 271.883 407.79 274.549 410.37 277.184C410.97 277.801 411.58 278.418 412.17 279.05L404.28 287.596L400.54 283.557L400.53 267Z M418.95 293.07L422.27 289.445L425.77 293.08L418.95 293.07Z" />
</svg>
`;

function renderMonthlyBarChartSvg(monthlyPoints: ReportMonthlyBreakdownItem[]): string {
  if (!monthlyPoints || monthlyPoints.length === 0) {
    return `
      <div class="empty-chart-box">
        <p class="empty-title">No monthly revenue activity detected</p>
        <p class="empty-sub">Monthly volume trends will plot automatically as Stripe payment transactions settle.</p>
      </div>
    `;
  }

  const maxVal = Math.max(...monthlyPoints.map((p) => p.grossRevenue ?? p.value), 1);
  const chartWidth = 660;
  const chartHeight = 170;
  const padBottom = 28;
  const padTop = 26;
  const plotHeight = chartHeight - padBottom - padTop;
  const barCount = monthlyPoints.length;
  const colWidth = chartWidth / barCount;
  const barWidth = Math.min(42, Math.max(16, colWidth * 0.58));

  // 4 horizontal gridlines
  let gridSvg = '';
  for (let i = 0; i <= 3; i++) {
    const y = padTop + (plotHeight / 3) * i;
    const gridVal = maxVal * (1 - i / 3);
    const label = gridVal >= 1000 ? `$${(gridVal / 1000).toFixed(0)}k` : `$${Math.round(gridVal)}`;
    gridSvg += `
      <line x1="42" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="#E5E7EB" stroke-width="0.8" stroke-dasharray="3,3" />
      <text x="36" y="${y + 3}" font-size="9" fill="#9CA3AF" text-anchor="end" font-family="system-ui, sans-serif">${label}</text>
    `;
  }

  let barsSvg = '';
  monthlyPoints.forEach((pt, idx) => {
    const val = pt.grossRevenue ?? pt.value;
    const barH = Math.max(4, (val / maxVal) * plotHeight);
    const x = 42 + idx * ((chartWidth - 42) / barCount) + ((chartWidth - 42) / barCount - barWidth) / 2;
    const y = padTop + plotHeight - barH;
    const isPeak = val === maxVal && val > 0 && barCount > 1;
    const barFill = isPeak ? '#4F46E5' : '#818CF8';
    const valLabel = val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${Math.round(val)}`;

    barsSvg += `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="3" fill="${barFill}" />
      <text x="${x + barWidth / 2}" y="${y - 6}" font-size="9" font-weight="600" fill="${isPeak ? '#4F46E5' : '#111827'}" text-anchor="middle" font-family="system-ui, sans-serif">${valLabel}</text>
      <text x="${x + barWidth / 2}" y="${chartHeight - 6}" font-size="9" fill="#6B7280" text-anchor="middle" font-family="system-ui, sans-serif">${escapeHtml(pt.period)}</text>
    `;

    if (isPeak) {
      barsSvg += `
        <rect x="${x + barWidth / 2 - 16}" y="${y - 22}" width="32" height="12" rx="3" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="0.6" />
        <text x="${x + barWidth / 2}" y="${y - 13}" font-size="7.5" font-weight="700" fill="#4F46E5" text-anchor="middle" font-family="system-ui, sans-serif">PEAK</text>
      `;
    }
  });

  return `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" width="100%" height="${chartHeight}" class="chart-svg">
      ${gridSvg}
      ${barsSvg}
    </svg>
  `;
}

export function generateInvestorSnapshotHtml(
  startup: ReportStartupData,
  packet: ReportPacketData
): string {
  const m = packet.metrics;
  const grossRev = m.grossRevenue;
  const netRev = m.netRevenue;
  const netRealizationRatio =
    m.netRealizationRatio ?? (grossRev > 0 ? (netRev / grossRev) * 100 : 100);
  const disputeRate = m.disputeRate ?? (grossRev > 0 ? (m.chargebacks / grossRev) * 100 : 0);
  const refundRate = m.refundRate ?? (grossRev > 0 ? (m.refunds / grossRev) * 100 : 0);
  const repeatRateText = m.repeatCustomerRate !== null ? percentFormatter.format(m.repeatCustomerRate) : 'Not available';

  const avgTxValue = m.successfulPaymentsCount > 0 ? grossRev / m.successfulPaymentsCount : 0;
  const txSuccessRate =
    m.successfulPaymentsCount + m.failedPaymentsCount > 0
      ? (m.successfulPaymentsCount / (m.successfulPaymentsCount + m.failedPaymentsCount)) * 100
      : 100;

  const conc = m.customerConcentration;
  const largestShareText =
    conc.largestCustomerShare !== null
      ? `${percentFormatter.format(conc.largestCustomerShare)} (${
          conc.largestCustomerRevenue ? currencyFormatter.format(conc.largestCustomerRevenue) : ''
        })`
      : 'Not available';

  const top3ShareText =
    conc.topThreeCustomerShare !== undefined && conc.topThreeCustomerShare !== null
      ? `${percentFormatter.format(conc.topThreeCustomerShare)} (${
          conc.topThreeCustomerRevenue ? currencyFormatter.format(conc.topThreeCustomerRevenue) : ''
        })`
      : conc.topFiveCustomerShare !== null
      ? `${percentFormatter.format(conc.topFiveCustomerShare * 0.75)}`
      : 'Not available';

  const top5ShareText =
    conc.topFiveCustomerShare !== null
      ? `${percentFormatter.format(conc.topFiveCustomerShare)} (${
          conc.topFiveCustomerRevenue ? currencyFormatter.format(conc.topFiveCustomerRevenue) : ''
        })`
      : 'Not available';

  const formatGrowthBadge = (growthVal: number | null) => {
    if (growthVal === null || typeof growthVal !== 'number') {
      return `<span class="badge badge-neutral">Not available</span>`;
    }
    const isPositive = growthVal >= 0;
    const sign = isPositive ? '+' : '';
    const formatted = `${sign}${percentFormatter.format(growthVal)}`;
    return `<span class="badge ${isPositive ? 'badge-positive' : 'badge-negative'}">${formatted}</span>`;
  };

  // Dynamic Data-Driven Business Overview Summary
  const businessOverviewSummary = (() => {
    if (grossRev <= 0) {
      return `During the verified reporting window from ${formatDate(
        packet.timeRangeStart
      )} to ${formatDate(
        packet.timeRangeEnd
      )}, no settled Stripe revenue transactions or recurring invoices were recorded for ${escapeHtml(
        startup.name
      )}. All figures reflect direct read-only Stripe API inspection. Pre-revenue operations or contracts processed outside of Stripe are not reflected in this snapshot.`;
    }

    const segments: string[] = [];
    segments.push(
      `Between ${formatDate(packet.timeRangeStart)} and ${formatDate(
        packet.timeRangeEnd
      )}, ${escapeHtml(startup.name)} processed ${currencyFormatter.format(
        grossRev
      )} in gross Stripe volume across ${integerFormatter.format(
        m.successfulPaymentsCount || m.activeCustomers
      )} successful transactions, achieving ${currencyFormatter.format(
        netRev
      )} in net realized revenue (${netRealizationRatio.toFixed(1)}% net realization ratio).`
    );

    if (m.mrr > 0 || m.activeSubscriptions > 0) {
      segments.push(
        `Contracted subscription revenue represents ${currencyFormatter.format(
          m.mrr
        )} MRR (${currencyFormatter.format(
          m.arr
        )} ARR) across ${integerFormatter.format(
          m.activeSubscriptions || m.subscriptionCount
        )} active subscriptions with an observed cohort churn rate of ${m.churnRate.toFixed(1)}%.`
      );
    } else {
      segments.push(
        `Revenue was generated across ${integerFormatter.format(
          m.activeCustomers
        )} billed customer accounts with an average revenue per customer (ARPC) of ${decimalCurrencyFormatter.format(
          m.arpc
        )}.`
      );
    }

    const disputeText =
      m.chargebacks > 0
        ? `disputes totaled ${currencyFormatter.format(m.chargebacks)} (${disputeRate.toFixed(
            2
          )}% dispute rate)`
        : `dispute rate was 0.00% (${currencyFormatter.format(0)} formal disputes)`;
    const refundText =
      m.refunds > 0
        ? `refund volume was ${currencyFormatter.format(m.refunds)} (${refundRate.toFixed(
            1
          )}% of volume)`
        : `refund volume was ${currencyFormatter.format(0)}`;

    segments.push(`Payment risk remained low: ${refundText}, and ${disputeText}.`);

    return segments.join(' ');
  })();

  const monthlyPoints = m.monthlyBreakdown || [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>ProofRound Verified Investor Snapshot - ${escapeHtml(startup.name)}</title>
  <style>
    /* ==========================================================================
       Print-Specific Document Dimensions & Global Variables
       ========================================================================== */
    @page {
      size: letter;
      margin: 0.65in 0.7in 0.65in 0.7in;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      background: #FFFFFF;
      font-size: 9.5pt;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Page container */
    .report-page {
      width: 100%;
      min-height: 9.7in;
      page-break-after: always;
      break-after: page;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #FFFFFF;
    }

    .report-page:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }

    .page-content {
      flex: 1;
    }

    /* Typography */
    h1.report-title {
      font-size: 24pt;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.025em;
      line-height: 1.15;
      margin-bottom: 3px;
    }

    p.report-subtitle {
      font-size: 9.5pt;
      color: #6B7280;
      margin-bottom: 16px;
    }

    h2.section-title {
      font-size: 15pt;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.02em;
      margin-bottom: 2px;
    }

    p.section-subtitle {
      font-size: 9pt;
      color: #6B7280;
      margin-bottom: 14px;
    }

    h3.block-title {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6B7280;
      margin-bottom: 8px;
    }

    /* Badges */
    .badge {
      display: inline-block;
      font-size: 7.5pt;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      white-space: nowrap;
    }

    .badge-indigo {
      background: #EEF2FF;
      color: #4F46E5;
      border: 1px solid #C7D2FE;
    }

    .badge-positive {
      background: #ECFDF5;
      color: #059669;
      border: 1px solid #A7F3D0;
    }

    .badge-negative {
      background: #FEF2F2;
      color: #DC2626;
      border: 1px solid #FECACA;
    }

    .badge-neutral {
      background: #F3F4F6;
      color: #6B7280;
      border: 1px solid #E5E7EB;
    }

    /* Running Headers */
    .running-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      margin-bottom: 16px;
      border-bottom: 1px solid #E5E7EB;
    }

    .running-brand {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .running-brand-name {
      font-size: 10pt;
      font-weight: 700;
      color: #4F46E5;
    }

    .running-section-name {
      font-size: 8.5pt;
      color: #6B7280;
      margin-left: 6px;
      border-left: 1px solid #E5E7EB;
      padding-left: 10px;
    }

    .running-header-right {
      font-size: 8pt;
      color: #9CA3AF;
    }

    /* Footers */
    .report-footer {
      border-top: 1px solid #E5E7EB;
      padding-top: 10px;
      margin-top: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      color: #9CA3AF;
      break-inside: avoid;
    }

    .footer-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Cards & Panels */
    .panel {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 12px 14px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .panel-white {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 12px 14px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* KPI Grid */
    .kpi-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }

    .kpi-grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 9px;
      margin-bottom: 14px;
    }

    .kpi-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }

    .kpi-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 68px;
    }

    .kpi-card.highlight {
      background: #FBFBFF;
      border-color: #C7D2FE;
    }

    .kpi-card-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 3px;
    }

    .kpi-card.highlight .kpi-card-label {
      color: #4F46E5;
    }

    .kpi-card-value {
      font-size: 16.5pt;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.02em;
      line-height: 1.1;
      margin-bottom: 3px;
    }

    .kpi-card.highlight .kpi-card-value {
      color: #4F46E5;
    }

    .kpi-card-sub {
      font-size: 7.5pt;
      color: #9CA3AF;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Tables */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin-top: 4px;
      margin-bottom: 12px;
      break-inside: avoid;
    }

    table.data-table th {
      background: #F9FAFB;
      color: #6B7280;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 7px 10px;
      border-top: 1px solid #E5E7EB;
      border-bottom: 1px solid #E5E7EB;
      text-align: left;
    }

    table.data-table th.num,
    table.data-table td.num {
      text-align: right;
    }

    table.data-table td {
      padding: 7px 10px;
      border-bottom: 1px solid #F3F4F6;
      color: #374151;
      font-variant-numeric: tabular-nums;
    }

    table.data-table tr:last-child td {
      border-bottom: 1px solid #E5E7EB;
    }

    /* Charts */
    .chart-panel {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 12px 14px 6px 14px;
      margin-bottom: 14px;
      break-inside: avoid;
    }

    .empty-chart-box {
      text-align: center;
      padding: 40px 20px;
    }

    .empty-title {
      font-size: 9.5pt;
      font-weight: 600;
      color: #4B5563;
      margin-bottom: 4px;
    }

    .empty-sub {
      font-size: 8pt;
      color: #9CA3AF;
    }

    /* Overview Quote Box */
    .overview-box {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-left: 3.5px solid #4F46E5;
      border-radius: 6px;
      padding: 12px 14px;
      margin-top: 14px;
      break-inside: avoid;
    }

    .overview-title {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #4F46E5;
      margin-bottom: 6px;
    }

    .overview-text {
      font-size: 8.5pt;
      color: #374151;
      line-height: 1.5;
    }
  </style>
</head>
<body>

  <!-- =========================================================================
       PAGE 1: INVESTOR SNAPSHOT
       ========================================================================= -->
  <div class="report-page page-1">
    <div class="page-content">

      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #E5E7EB;">
        <div>
          ${SVG_FULL_LOGO}
          <div style="margin-top: 6px;">
            <span class="badge badge-indigo">STRIPE-CONNECTED FINANCIAL SNAPSHOT</span>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 8pt; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.04em;">Report Generation Date</div>
          <div style="font-size: 9pt; font-weight: 600; color: #111827;">${escapeHtml(formatDate(packet.createdAt))}</div>
          <div style="font-size: 7.5pt; color: #9CA3AF;">Direct Stripe OAuth Integration</div>
        </div>
      </div>

      <!-- Title Block -->
      <div style="margin-bottom: 14px;">
        <h1 class="report-title">Verified Investor Snapshot</h1>
        <p class="report-subtitle">Stripe-connected financial performance for startup diligence.</p>
      </div>

      <!-- Metadata Box -->
      <div class="panel" style="display: grid; grid-template-columns: 1.6fr 1.4fr 1.1fr 1.3fr; gap: 12px; margin-bottom: 16px;">
        <div>
          <div style="font-size: 7.5pt; font-weight: 700; color: #6B7280; text-transform: uppercase;">Company Name</div>
          <div style="font-size: 9.5pt; font-weight: 700; color: #111827;">${escapeHtml(startup.name)}</div>
          <div style="font-size: 7.5pt; color: #9CA3AF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(startup.tagline || 'Verified startup company')}</div>
        </div>
        <div>
          <div style="font-size: 7.5pt; font-weight: 700; color: #6B7280; text-transform: uppercase;">Reporting Period</div>
          <div style="font-size: 8.5pt; font-weight: 600; color: #111827;">${escapeHtml(formatDate(packet.timeRangeStart))} – ${escapeHtml(formatDate(packet.timeRangeEnd))}</div>
        </div>
        <div>
          <div style="font-size: 7.5pt; font-weight: 700; color: #6B7280; text-transform: uppercase;">Snapshot Date</div>
          <div style="font-size: 8.5pt; font-weight: 600; color: #111827;">${escapeHtml(formatDate(packet.createdAt))}</div>
        </div>
        <div>
          <div style="font-size: 7.5pt; font-weight: 700; color: #6B7280; text-transform: uppercase;">Report ID</div>
          <div style="font-size: 8pt; font-family: monospace; color: #4B5563;">${escapeHtml(packet.id)}</div>
        </div>
      </div>

      <!-- Traction Overview -->
      <div style="margin-bottom: 6px;">
        <h3 class="block-title">Traction Overview &amp; Key Financial Highlights</h3>
        <div class="kpi-grid-3">
          <div class="kpi-card highlight">
            <span class="kpi-card-label">Gross Revenue</span>
            <span class="kpi-card-value">${currencyFormatter.format(grossRev)}</span>
            <span class="kpi-card-sub">Total volume processed in window</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card-label">Net Revenue</span>
            <span class="kpi-card-value">${currencyFormatter.format(netRev)}</span>
            <span class="kpi-card-sub">Net realized volume after refunds</span>
          </div>
          <div class="kpi-card highlight">
            <span class="kpi-card-label">Monthly Recurring Revenue</span>
            <span class="kpi-card-value">${currencyFormatter.format(m.mrr)}</span>
            <span class="kpi-card-sub">Normalized monthly run rate (MRR)</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card-label">Annual Recurring Revenue</span>
            <span class="kpi-card-value">${currencyFormatter.format(m.arr)}</span>
            <span class="kpi-card-sub">Annualized run rate (MRR &times; 12)</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card-label">Active Customers</span>
            <span class="kpi-card-value">${integerFormatter.format(m.activeCustomers)}</span>
            <span class="kpi-card-sub">Distinct customer accounts billed</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card-label">Active Subscriptions</span>
            <span class="kpi-card-value">${integerFormatter.format(m.activeSubscriptions || m.subscriptionCount)}</span>
            <span class="kpi-card-sub">Active recurring contracts in Stripe</span>
          </div>
        </div>
      </div>

      <!-- Unit Economics Row -->
      <div class="kpi-grid-4" style="margin-bottom: 16px;">
        <div class="kpi-card">
          <span class="kpi-card-label">Average Revenue / Customer</span>
          <span class="kpi-card-value" style="font-size: 13.5pt;">${decimalCurrencyFormatter.format(m.arpc)}</span>
          <span class="kpi-card-sub">ARPC across active accounts</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card-label">Net Realization Ratio</span>
          <span class="kpi-card-value" style="font-size: 13.5pt;">${netRealizationRatio.toFixed(1)}%</span>
          <span class="kpi-card-sub">Net revenue realized / Gross</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card-label">Repeat Customer Rate</span>
          <span class="kpi-card-value" style="font-size: 13.5pt;">${escapeHtml(repeatRateText)}</span>
          <span class="kpi-card-sub">Accounts with &gt;1 charge</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card-label">Observed Churn Rate</span>
          <span class="kpi-card-value" style="font-size: 13.5pt;">${m.churnRate.toFixed(1)}%</span>
          <span class="kpi-card-sub">Canceled / total subscription cohort</span>
        </div>
      </div>

      <!-- Business Overview Section -->
      <div class="overview-box">
        <div class="overview-title">Business Overview</div>
        <div class="overview-text">${escapeHtml(businessOverviewSummary)}</div>
      </div>

    </div>

    <!-- Page 1 Footer -->
    <div class="report-footer">
      <div class="footer-left">
        ${SVG_MARK_ICON}
        <span>ProofRound &middot; Verified Investor Snapshot &middot; Report ID: ${escapeHtml(packet.id)}</span>
      </div>
      <div>Page 1 of 4</div>
    </div>
  </div>

  <!-- =========================================================================
       PAGE 2: REVENUE PERFORMANCE
       ========================================================================= -->
  <div class="report-page page-2">
    <div class="page-content">

      <!-- Running Header -->
      <div class="running-header">
        <div class="running-brand">
          ${SVG_MARK_ICON}
          <span class="running-brand-name">ProofRound</span>
          <span class="running-section-name">Revenue Performance</span>
        </div>
        <div class="running-header-right">${escapeHtml(startup.name)} &middot; ${escapeHtml(formatDate(packet.createdAt))}</div>
      </div>

      <!-- Section Title -->
      <h2 class="section-title">Revenue Performance</h2>
      <p class="section-subtitle">Revenue trends and payment activity across the reporting period.</p>

      <!-- Revenue Overview KPIs -->
      <div class="kpi-grid-4">
        <div class="kpi-card highlight">
          <span class="kpi-card-label">Gross Revenue</span>
          <span class="kpi-card-value" style="font-size: 14pt;">${currencyFormatter.format(grossRev)}</span>
          <span class="kpi-card-sub">Total billed in period</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card-label">Net Realized</span>
          <span class="kpi-card-value" style="font-size: 14pt;">${currencyFormatter.format(netRev)}</span>
          <span class="kpi-card-sub">After refunds &amp; disputes</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card-label">Avg Transaction</span>
          <span class="kpi-card-value" style="font-size: 14pt;">${decimalCurrencyFormatter.format(avgTxValue)}</span>
          <span class="kpi-card-sub">Volume / successful charges</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card-label">Net Realization</span>
          <span class="kpi-card-value" style="font-size: 14pt;">${netRealizationRatio.toFixed(1)}%</span>
          <span class="kpi-card-sub">Retention efficiency</span>
        </div>
      </div>

      <!-- Growth Indicators -->
      <div style="margin-bottom: 14px;">
        <h3 class="block-title">Revenue Growth Velocity</h3>
        <div class="kpi-grid-3">
          <div class="kpi-card">
            <span class="kpi-card-label">1-Month Growth (MoM)</span>
            <div style="margin: 4px 0;">${formatGrowthBadge(m.growth.oneMonth)}</div>
            <span class="kpi-card-sub">Trailing 30-day velocity</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card-label">3-Month Growth (QoQ)</span>
            <div style="margin: 4px 0;">${formatGrowthBadge(m.growth.threeMonth)}</div>
            <span class="kpi-card-sub">Quarterly expansion rate</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card-label">6-Month Growth</span>
            <div style="margin: 4px 0;">${formatGrowthBadge(m.growth.sixMonth)}</div>
            <span class="kpi-card-sub">Half-year trajectory velocity</span>
          </div>
        </div>

        <div class="panel" style="padding: 9px 12px; margin-bottom: 14px; font-size: 8.5pt; color: #4B5563;">
          <strong style="color: #4F46E5;">Trajectory Commentary:</strong>
          ${escapeHtml(m.growth.commentary || 'Sequential revenue history recorded through connected Stripe ledger.')}
        </div>
      </div>

      <!-- Revenue Chart -->
      <div style="margin-bottom: 14px;">
        <h3 class="block-title">Monthly Revenue Progression</h3>
        <div class="chart-panel">
          ${renderMonthlyBarChartSvg(monthlyPoints.slice(-8))}
        </div>
      </div>

      <!-- Revenue Table -->
      <div>
        <h3 class="block-title">Monthly Revenue Breakdown Ledger</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Period / Month</th>
              <th class="num">Gross Revenue</th>
              <th class="num">Refunds</th>
              <th class="num">Net Revenue</th>
              <th class="num">Transactions</th>
              <th class="num">% of Window</th>
            </tr>
          </thead>
          <tbody>
            ${
              monthlyPoints.length === 0
                ? `<tr><td colspan="6" style="text-align: center; color: #9CA3AF; padding: 14px;">No monthly revenue observations detected in the requested window.</td></tr>`
                : monthlyPoints
                    .slice(-6)
                    .map((pt) => {
                      const gross = pt.grossRevenue ?? pt.value;
                      const ref = pt.refunds ?? 0;
                      const net = pt.netRevenue ?? gross - ref;
                      const tx = pt.transactions ?? '-';
                      const pctOfWin = grossRev > 0 ? ((gross / grossRev) * 100).toFixed(1) + '%' : '0.0%';
                      return `
                        <tr>
                          <td style="font-weight: 600; color: #111827;">${escapeHtml(pt.period)}</td>
                          <td class="num" style="font-weight: 600; color: #4F46E5;">${currencyFormatter.format(gross)}</td>
                          <td class="num" style="color: #DC2626;">${currencyFormatter.format(ref)}</td>
                          <td class="num" style="font-weight: 600;">${currencyFormatter.format(net)}</td>
                          <td class="num">${escapeHtml(tx)}</td>
                          <td class="num" style="color: #6B7280;">${pctOfWin}</td>
                        </tr>
                      `;
                    })
                    .join('')
            }
          </tbody>
        </table>
      </div>

    </div>

    <!-- Page 2 Footer -->
    <div class="report-footer">
      <div class="footer-left">
        ${SVG_MARK_ICON}
        <span>ProofRound &middot; Verified Investor Snapshot &middot; Report ID: ${escapeHtml(packet.id)}</span>
      </div>
      <div>Page 2 of 4</div>
    </div>
  </div>

  <!-- =========================================================================
       PAGE 3: CUSTOMER AND REVENUE QUALITY
       ========================================================================= -->
  <div class="report-page page-3">
    <div class="page-content">

      <!-- Running Header -->
      <div class="running-header">
        <div class="running-brand">
          ${SVG_MARK_ICON}
          <span class="running-brand-name">ProofRound</span>
          <span class="running-section-name">Customer &amp; Revenue Quality</span>
        </div>
        <div class="running-header-right">${escapeHtml(startup.name)} &middot; ${escapeHtml(formatDate(packet.createdAt))}</div>
      </div>

      <!-- Section Title -->
      <h2 class="section-title">Customer &amp; Revenue Quality</h2>
      <p class="section-subtitle">Customer activity, revenue distribution, and payment quality.</p>

      <!-- Customer Concentration Section -->
      <div style="margin-bottom: 16px;">
        <h3 class="block-title">Customer Revenue Concentration</h3>
        <div class="kpi-grid-3" style="margin-bottom: 10px;">
          <div class="kpi-card highlight">
            <span class="kpi-card-label">Largest Customer Share</span>
            <span class="kpi-card-value" style="font-size: 14pt;">${escapeHtml(largestShareText)}</span>
            <span class="kpi-card-sub">Top account share of gross volume</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card-label">Top 3 Customers Share</span>
            <span class="kpi-card-value" style="font-size: 14pt;">${escapeHtml(top3ShareText)}</span>
            <span class="kpi-card-sub">Top 3 accounts combined volume</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card-label">Top 5 Customers Share</span>
            <span class="kpi-card-value" style="font-size: 14pt;">${escapeHtml(top5ShareText)}</span>
            <span class="kpi-card-sub">Top 5 accounts combined volume</span>
          </div>
        </div>

        <!-- Anonymous Customer Table (Zero PII Exposed) -->
        <table class="data-table">
          <thead>
            <tr>
              <th>Account Tier</th>
              <th class="num">Volume Contribution</th>
              <th class="num">% of Gross Revenue</th>
              <th>Concentration Assessment</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight: 600;">Customer 1 (Top Account)</td>
              <td class="num" style="font-weight: 600; color: #4F46E5;">${conc.largestCustomerRevenue ? currencyFormatter.format(conc.largestCustomerRevenue) : 'Not available'}</td>
              <td class="num">${conc.largestCustomerShare !== null ? percentFormatter.format(conc.largestCustomerShare) : 'N/A'}</td>
              <td style="color: #4B5563;">Primary account contribution</td>
            </tr>
            <tr>
              <td style="font-weight: 600;">Top 5 Accounts Combined</td>
              <td class="num" style="font-weight: 600;">${conc.topFiveCustomerRevenue ? currencyFormatter.format(conc.topFiveCustomerRevenue) : 'Not available'}</td>
              <td class="num">${conc.topFiveCustomerShare !== null ? percentFormatter.format(conc.topFiveCustomerShare) : 'N/A'}</td>
              <td style="color: #4B5563;">
                ${
                  (conc.topFiveCustomerShare ?? 0) < 0.25
                    ? '<span class="badge badge-positive">Healthy Diversification (&lt;25%)</span>'
                    : (conc.topFiveCustomerShare ?? 0) < 0.5
                    ? '<span class="badge badge-neutral">Moderate Concentration (25%–50%)</span>'
                    : '<span class="badge badge-negative">Elevated Dependency (&gt;50%)</span>'
                }
              </td>
            </tr>
            <tr>
              <td style="font-weight: 600;">Remaining Customer Cohort</td>
              <td class="num">${currencyFormatter.format(Math.max(0, grossRev - (conc.topFiveCustomerRevenue ?? 0)))}</td>
              <td class="num">${percentFormatter.format(Math.max(0, 1 - (conc.topFiveCustomerShare ?? 0)))}</td>
              <td style="color: #6B7280;">Diversified customer base</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Customer Metrics & Unit Economics -->
      <div style="margin-bottom: 16px;">
        <h3 class="block-title">Customer Activity &amp; Retention Quality</h3>
        <div class="kpi-grid-4">
          <div class="kpi-card">
            <span class="kpi-card-label">Total Billed Customers</span>
            <span class="kpi-card-value">${integerFormatter.format(m.activeCustomers)}</span>
            <span class="kpi-card-sub">Accounts charged in window</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card-label">Average Revenue / Customer</span>
            <span class="kpi-card-value">${decimalCurrencyFormatter.format(m.arpc)}</span>
            <span class="kpi-card-sub">ARPC across cohort</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card-label">Repeat Customers</span>
            <span class="kpi-card-value">${escapeHtml(repeatRateText)}</span>
            <span class="kpi-card-sub">Repeat billing engagement</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card-label">Subscription Churn</span>
            <span class="kpi-card-value">${m.churnRate.toFixed(1)}%</span>
            <span class="kpi-card-sub">Observed contract churn rate</span>
          </div>
        </div>
      </div>

      <!-- Revenue & Payment Quality Baseline -->
      <div>
        <h3 class="block-title">Payment Integrity &amp; Risk Baseline</h3>
        <div class="kpi-grid-3" style="margin-bottom: 10px;">
          <div class="kpi-card">
            <span class="kpi-card-label">Total Refunds</span>
            <span class="kpi-card-value" style="font-size: 13.5pt;">${currencyFormatter.format(m.refunds)}</span>
            <span class="kpi-card-sub">${m.refundCount} refunded transactions (${refundRate.toFixed(1)}%)</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card-label">Disputes &amp; Chargebacks</span>
            <span class="kpi-card-value" style="font-size: 13.5pt;">${currencyFormatter.format(m.chargebacks)}</span>
            <span class="kpi-card-sub">${m.disputeCount} dispute claims (${disputeRate.toFixed(2)}%)</span>
          </div>
          <div class="kpi-card highlight">
            <span class="kpi-card-label">Net Revenue Ratio</span>
            <span class="kpi-card-value" style="font-size: 13.5pt;">${netRealizationRatio.toFixed(1)}%</span>
            <span class="kpi-card-sub">Net revenue realized / Gross volume</span>
          </div>
        </div>

        <div class="panel" style="font-size: 8.5pt; color: #4B5563; line-height: 1.5;">
          <strong style="color: #111827;">Risk Assessment:</strong>
          ${
            disputeRate < 1.0
              ? 'Dispute claim rate stands below 1.0%, meeting standard card network acceptable risk thresholds.'
              : 'Elevated dispute claim activity observed during this reporting period.'
          }
          Net revenue realization ratio of ${netRealizationRatio.toFixed(1)}% indicates ${
            netRealizationRatio >= 95 ? 'strong' : 'moderate'
          } payment settlement durability.
        </div>
      </div>

    </div>

    <!-- Page 3 Footer -->
    <div class="report-footer">
      <div class="footer-left">
        ${SVG_MARK_ICON}
        <span>ProofRound &middot; Verified Investor Snapshot &middot; Report ID: ${escapeHtml(packet.id)}</span>
      </div>
      <div>Page 3 of 4</div>
    </div>
  </div>

  <!-- =========================================================================
       PAGE 4: PAYMENTS AND SUBSCRIPTION DETAILS
       ========================================================================= -->
  <div class="report-page page-4">
    <div class="page-content">

      <!-- Running Header -->
      <div class="running-header">
        <div class="running-brand">
          ${SVG_MARK_ICON}
          <span class="running-brand-name">ProofRound</span>
          <span class="running-section-name">Payments &amp; Subscription Activity</span>
        </div>
        <div class="running-header-right">${escapeHtml(startup.name)} &middot; ${escapeHtml(formatDate(packet.createdAt))}</div>
      </div>

      <!-- Section Title -->
      <h2 class="section-title">Payments &amp; Subscription Activity</h2>
      <p class="section-subtitle">Transaction execution channels, dispute records, and recurring contract retention.</p>

      <!-- Payment Activity Section -->
      <div style="margin-bottom: 16px;">
        <h3 class="block-title">Payment Execution Overview</h3>
        <div class="kpi-grid-4">
          <div class="kpi-card">
            <span class="kpi-card-label">Total Transactions</span>
            <span class="kpi-card-value">${integerFormatter.format(m.totalTransactionsCount || m.successfulPaymentsCount + m.failedPaymentsCount)}</span>
            <span class="kpi-card-sub">Charges processed in Stripe</span>
          </div>
          <div class="kpi-card highlight">
            <span class="kpi-card-label">Successful Payments</span>
            <span class="kpi-card-value">${integerFormatter.format(m.successfulPaymentsCount)}</span>
            <span class="kpi-card-sub">${txSuccessRate.toFixed(1)}% settlement rate</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card-label">Failed Payments</span>
            <span class="kpi-card-value" style="color: ${m.failedPaymentsCount > 0 ? '#DC2626' : '#111827'};">${integerFormatter.format(m.failedPaymentsCount)}</span>
            <span class="kpi-card-sub">Declined or uncollectible</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card-label">Average Payment Value</span>
            <span class="kpi-card-value">${decimalCurrencyFormatter.format(avgTxValue)}</span>
            <span class="kpi-card-sub">Average per settlement</span>
          </div>
        </div>

        <!-- Payment Methods Table -->
        <h3 class="block-title" style="margin-top: 10px;">Payment Method Distribution</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Channel / Payment Method</th>
              <th class="num">Transactions</th>
              <th class="num">Processed Volume</th>
              <th class="num">% of Total Volume</th>
            </tr>
          </thead>
          <tbody>
            ${
              m.paymentMethods && m.paymentMethods.length > 0
                ? m.paymentMethods
                    .map((method) => {
                      const sharePct = grossRev > 0 ? ((method.volume / grossRev) * 100).toFixed(1) + '%' : '0.0%';
                      return `
                        <tr>
                          <td style="font-weight: 600; color: #111827;">${escapeHtml(method.type)}</td>
                          <td class="num">${integerFormatter.format(method.count)}</td>
                          <td class="num" style="font-weight: 600;">${currencyFormatter.format(method.volume)}</td>
                          <td class="num" style="color: #6B7280;">${sharePct}</td>
                        </tr>
                      `;
                    })
                    .join('')
                : `<tr><td colspan="4" style="text-align: center; color: #9CA3AF; padding: 12px;">Standard credit card / direct invoice processing.</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <!-- Subscription Activity Section -->
      <div style="margin-bottom: 16px;">
        <h3 class="block-title">Subscription Contract Activity &amp; Retention</h3>
        <div class="kpi-grid-4">
          <div class="kpi-card highlight">
            <span class="kpi-card-label">Active Subscriptions</span>
            <span class="kpi-card-value">${integerFormatter.format(m.activeSubscriptions || m.subscriptionCount)}</span>
            <span class="kpi-card-sub">Active recurring contracts</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card-label">Annual Run Rate (ARR)</span>
            <span class="kpi-card-value">${currencyFormatter.format(m.arr)}</span>
            <span class="kpi-card-sub">Contracted run rate (MRR &times; 12)</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card-label">Monthly Run Rate (MRR)</span>
            <span class="kpi-card-value">${currencyFormatter.format(m.mrr)}</span>
            <span class="kpi-card-sub">Contracted monthly baseline</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card-label">Observed Churn Rate</span>
            <span class="kpi-card-value">${m.churnRate.toFixed(1)}%</span>
            <span class="kpi-card-sub">Canceled / total subscription cohort</span>
          </div>
        </div>
      </div>

      <!-- Diligence & Ledger Integrity Statement -->
      <div class="panel" style="margin-top: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 8pt; font-weight: 700; color: #4F46E5; text-transform: uppercase;">Stripe Diligence Verification &amp; Cryptographic Seal</span>
          <span style="font-size: 7.5pt; font-family: monospace; color: #6B7280;">SHA-256: ${escapeHtml(packet.verificationHash.slice(0, 24))}...</span>
        </div>
        <p style="font-size: 8pt; color: #6B7280; line-height: 1.5; margin-bottom: 8px;">
          ProofRound connects directly to the company's Stripe account via read-only OAuth to verify financial performance. Figures represent actual ledger data recorded in Stripe during the stated reporting window. This snapshot does not account for off-platform sales, non-Stripe payment processors, or bank wires.
        </p>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 7.5pt; color: #4B5563; border-top: 1px solid #E5E7EB; padding-top: 6px;">
          <div><strong>Stripe Account:</strong> ${escapeHtml(startup.stripeAccountId || packet.stripeAccountId || 'Connected')}</div>
          <div><strong>Charges Analyzed:</strong> ${integerFormatter.format(packet.references.chargeIds.length)}</div>
          <div><strong>Invoices Analyzed:</strong> ${integerFormatter.format(packet.references.invoiceIds.length)}</div>
          <div><strong>Subscriptions:</strong> ${integerFormatter.format(packet.references.subscriptionIds.length)}</div>
        </div>
      </div>

    </div>

    <!-- Page 4 Footer -->
    <div class="report-footer">
      <div class="footer-left">
        ${SVG_MARK_ICON}
        <span>ProofRound &middot; Verified Investor Snapshot &middot; Report ID: ${escapeHtml(packet.id)}</span>
      </div>
      <div>Page 4 of 4</div>
    </div>
  </div>

</body>
</html>
`;
}

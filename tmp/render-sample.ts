import { writeFileSync } from 'fs';
import { renderInvestorPacketPdf } from '../backend/lib/packets.js';

async function main() {
  const startup = {
    id: 'startup_seed',
    name: 'SeedCo',
    founderId: 'founder_1',
    founderEmail: 'founder@seedco.com',
    stripeAccountId: 'acct_123',
    stage: 'Seed',
    industry: 'SaaS',
    location: 'US',
  };

  const packet = {
    id: 'pkt_seed_001',
    startupId: 'startup_seed',
    stripeAccountId: 'acct_123',
    generatedBy: 'founder_1',
    timeRangeStart: '2026-05-01T00:00:00.000Z',
    timeRangeEnd: '2026-06-01T00:00:00.000Z',
    metrics: {
      mrr: 0,
      arr: 0,
      grossRevenue: 0,
      netRevenue: 0,
      refunds: 0,
      chargebacks: 0,
      monthlyBreakdown: [],
      churnRate: 0,
      activeCustomers: 0,
      arpc: 0,
      subscriptionCount: 0,
      repeatCustomerRate: null,
      growth: {
        oneMonth: null,
        threeMonth: null,
        sixMonth: null,
        commentary: 'No recurring monthly Stripe observations were available in the selected reporting window.',
      },
      customerConcentration: {
        largestCustomerShare: null,
        topFiveCustomerShare: null,
        largestCustomerRevenue: null,
        topFiveCustomerRevenue: null,
        available: false,
      },
    },
    references: {
      customerIds: [],
      chargeIds: [],
      invoiceIds: [],
      subscriptionIds: [],
    },
    verified: true,
    verificationHash: 'a'.repeat(64),
    createdAt: '2026-06-09T12:00:00.000Z',
    updatedAt: '2026-06-09T12:00:00.000Z',
    expiresAt: '2027-06-09T12:00:00.000Z',
    views: 0,
  };

  const pdf = await renderInvestorPacketPdf(startup as any, packet as any);
  writeFileSync('./tmp/investor-sample.pdf', pdf);
  console.log(`PDF_BYTES ${pdf.length}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

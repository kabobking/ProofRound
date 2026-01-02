/**
 * Example API route implementation showing how to use packet generation and storage
 * with data minimization enforcement.
 * 
 * This is a reference implementation - adapt to your actual API framework.
 */

import { generatePacket, type PacketGenerationConfig } from './packet-generator';
import { savePacket, recordPacketView, type PacketStorage } from './packet-storage';
import { fetchCustomerDrillDown, type DrillDownContext } from './packet-drilldown';
import type { ProofroundPacket } from './packet-types';

/**
 * Example: Generate and save a packet from Stripe data
 * 
 * This function demonstrates the correct pattern:
 * 1. Fetch raw Stripe data (in memory)
 * 2. Process and aggregate (in memory)
 * 3. Generate minimal packet (aggregates only)
 * 4. Save packet (validated)
 * 5. Discard raw Stripe data
 */
export async function generateAndSavePacket(
  stripeData: {
    charges: unknown[];
    invoices: unknown[];
    customers: unknown[];
    subscriptions: unknown[];
    payouts: unknown[];
  },
  config: PacketGenerationConfig,
  storage: PacketStorage
): Promise<ProofroundPacket> {
  // Step 1: Process raw Stripe data in memory
  // (In production, you'd fetch this from Stripe API)
  const processedData = {
    charges: stripeData.charges as Parameters<typeof generatePacket>[0]['charges'],
    invoices: stripeData.invoices as Parameters<typeof generatePacket>[0]['invoices'],
    customers: stripeData.customers as Parameters<typeof generatePacket>[0]['customers'],
    subscriptions: stripeData.subscriptions as Parameters<typeof generatePacket>[0]['subscriptions'],
    payouts: stripeData.payouts as Parameters<typeof generatePacket>[0]['payouts'],
  };

  // Step 2: Generate packet (aggregates only, no raw data)
  const packet = generatePacket(processedData, config);

  // Step 3: Save packet (with validation)
  await savePacket(storage, packet);

  // Step 4: Raw Stripe data is now out of scope and will be garbage collected
  // Only the minimal packet structure is persisted

  return packet;
}

/**
 * Example: Retrieve a packet for viewing
 */
export async function getPacketForViewing(
  packetId: string,
  storage: PacketStorage
): Promise<ProofroundPacket> {
  const packet = await storage.get(packetId);
  if (!packet) {
    throw new Error(`Packet not found: ${packetId}`);
  }

  // Record view timestamp
  await recordPacketView(storage, packetId);

  return packet;
}

/**
 * Example: Drill down into customer data
 * 
 * This demonstrates fetching live Stripe data on-demand using stored IDs.
 * The fetched data is NOT stored - it's ephemeral and only used for display.
 */
export async function getCustomerDrillDown(
  packetId: string,
  customerId: string,
  storage: PacketStorage,
  stripeClient: DrillDownContext['stripeClient']
): Promise<unknown> {
  // Get packet to verify customer ID is in references
  const packet = await storage.get(packetId);
  if (!packet) {
    throw new Error(`Packet not found: ${packetId}`);
  }

  if (!packet.references.customerIds.includes(customerId)) {
    throw new Error(`Customer ${customerId} not found in packet references`);
  }

  // Fetch live data from Stripe (not stored)
  const context: DrillDownContext = {
    packetId,
    stripeAccountId: packet.metadata.stripeAccountId,
    stripeClient,
  };

  const drillDown = await fetchCustomerDrillDown(context, customerId);

  // Return drill-down data (ephemeral, not persisted)
  return drillDown;
}

/**
 * ANTI-PATTERN: DO NOT DO THIS
 * 
 * This is an example of what NOT to do - storing raw Stripe objects
 */
export function BAD_EXAMPLE_storeRawStripeData(
  packet: ProofroundPacket,
  rawStripeData: unknown
): void {
  // ❌ DO NOT add raw Stripe data to packet
  // (packet as any).rawStripeData = rawStripeData; // BAD!

  // ❌ DO NOT store full Stripe objects in references
  // packet.references.customers = rawStripeData; // BAD!

  // ✅ CORRECT: Only store IDs for drill-down
  // packet.references.customerIds = ['cus_123', 'cus_456']; // GOOD
}

/**
 * ANTI-PATTERN: DO NOT DO THIS
 * 
 * Storing CSV-like exports or full transaction lists
 */
export function BAD_EXAMPLE_storeTransactionList(
  packet: ProofroundPacket,
  transactions: unknown[]
): void {
  // ❌ DO NOT store full transaction lists
  // (packet as any).transactions = transactions; // BAD!

  // ✅ CORRECT: Store only aggregated metrics
  // packet.revenue.monthlyBreakdown = [{ period: '2024-01', value: 10000 }]; // GOOD
}


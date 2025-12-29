/**
 * Drill-down utilities for fetching live Stripe data using stored object IDs.
 * 
 * When users need to drill down into specific metrics, we fetch live data
 * from Stripe using the stored object IDs. This ensures we always show
 * current data and don't store raw Stripe objects.
 */

/**
 * Stripe API client interface
 * Implement with actual Stripe SDK in production
 */
export interface StripeClient {
  /** Fetch a customer by ID */
  getCustomer(customerId: string): Promise<unknown>;
  /** Fetch a charge by ID */
  getCharge(chargeId: string): Promise<unknown>;
  /** Fetch an invoice by ID */
  getInvoice(invoiceId: string): Promise<unknown>;
  /** Fetch a subscription by ID */
  getSubscription(subscriptionId: string): Promise<unknown>;
  /** Fetch an event by ID */
  getEvent(eventId: string): Promise<unknown>;
  /** List charges for a customer */
  listCustomerCharges(customerId: string, limit?: number): Promise<unknown[]>;
  /** List invoices for a customer */
  listCustomerInvoices(customerId: string, limit?: number): Promise<unknown[]>;
}

/**
 * Drill-down context - contains the packet and Stripe client
 */
export interface DrillDownContext {
  /** The packet being viewed */
  packetId: string;
  /** Stripe account ID */
  stripeAccountId: string;
  /** Stripe API client */
  stripeClient: StripeClient;
}

/**
 * Customer drill-down data
 */
export interface CustomerDrillDown {
  /** Customer ID */
  customerId: string;
  /** Customer data (fetched live from Stripe) */
  customer: unknown;
  /** Recent charges (fetched live) */
  recentCharges: unknown[];
  /** Recent invoices (fetched live) */
  recentInvoices: unknown[];
  /** Fetched at timestamp */
  fetchedAt: string;
}

/**
 * Charge drill-down data
 */
export interface ChargeDrillDown {
  /** Charge ID */
  chargeId: string;
  /** Charge data (fetched live from Stripe) */
  charge: unknown;
  /** Related refunds (fetched live) */
  refunds: unknown[];
  /** Fetched at timestamp */
  fetchedAt: string;
}

/**
 * Invoice drill-down data
 */
export interface InvoiceDrillDown {
  /** Invoice ID */
  invoiceId: string;
  /** Invoice data (fetched live from Stripe) */
  invoice: unknown;
  /** Line items (fetched live) */
  lineItems: unknown[];
  /** Fetched at timestamp */
  fetchedAt: string;
}

/**
 * Subscription drill-down data
 */
export interface SubscriptionDrillDown {
  /** Subscription ID */
  subscriptionId: string;
  /** Subscription data (fetched live from Stripe) */
  subscription: unknown;
  /** Related invoices (fetched live) */
  invoices: unknown[];
  /** Fetched at timestamp */
  fetchedAt: string;
}

/**
 * Fetch customer drill-down data
 * 
 * This fetches live data from Stripe using the stored customer ID.
 * The data is NOT persisted - it's fetched on-demand for display only.
 */
export async function fetchCustomerDrillDown(
  context: DrillDownContext,
  customerId: string
): Promise<CustomerDrillDown> {
  const { stripeClient } = context;

  // Fetch live data from Stripe
  const [customer, recentCharges, recentInvoices] = await Promise.all([
    stripeClient.getCustomer(customerId),
    stripeClient.listCustomerCharges(customerId, 10),
    stripeClient.listCustomerInvoices(customerId, 10),
  ]);

  return {
    customerId,
    customer,
    recentCharges,
    recentInvoices,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Fetch charge drill-down data
 */
export async function fetchChargeDrillDown(
  context: DrillDownContext,
  chargeId: string
): Promise<ChargeDrillDown> {
  const { stripeClient } = context;

  // Fetch live data from Stripe
  const charge = await stripeClient.getCharge(chargeId);

  // Extract refunds from charge (if available in response)
  const refunds = (charge as { refunds?: { data?: unknown[] } })?.refunds?.data || [];

  return {
    chargeId,
    charge,
    refunds,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Fetch invoice drill-down data
 */
export async function fetchInvoiceDrillDown(
  context: DrillDownContext,
  invoiceId: string
): Promise<InvoiceDrillDown> {
  const { stripeClient } = context;

  // Fetch live data from Stripe
  const invoice = await stripeClient.getInvoice(invoiceId);

  // Extract line items from invoice (if available in response)
  const lineItems = (invoice as { line_items?: { data?: unknown[] } })?.line_items?.data || [];

  return {
    invoiceId,
    invoice,
    lineItems,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Fetch subscription drill-down data
 */
export async function fetchSubscriptionDrillDown(
  context: DrillDownContext,
  subscriptionId: string
): Promise<SubscriptionDrillDown> {
  const { stripeClient } = context;

  // Fetch live data from Stripe
  const subscription = await stripeClient.getSubscription(subscriptionId);

  // Fetch related invoices
  const customerId = (subscription as { customer?: string })?.customer;
  const invoices = customerId
    ? await stripeClient.listCustomerInvoices(customerId, 20)
    : [];

  return {
    subscriptionId,
    subscription,
    invoices,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Batch fetch multiple customers for drill-down
 */
export async function fetchMultipleCustomers(
  context: DrillDownContext,
  customerIds: string[]
): Promise<CustomerDrillDown[]> {
  const results = await Promise.all(
    customerIds.map(id => fetchCustomerDrillDown(context, id))
  );
  return results;
}

/**
 * Batch fetch multiple charges for drill-down
 */
export async function fetchMultipleCharges(
  context: DrillDownContext,
  chargeIds: string[]
): Promise<ChargeDrillDown[]> {
  const results = await Promise.all(
    chargeIds.map(id => fetchChargeDrillDown(context, id))
  );
  return results;
}

/**
 * IMPORTANT: Drill-down data is ephemeral and should NOT be stored.
 * 
 * These helper functions ensure drill-down data is only used for display
 * and is not accidentally persisted.
 */

/**
 * Type guard to prevent storing drill-down data
 */
export function isDrillDownData(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('fetchedAt' in value || 'customer' in value || 'charge' in value || 'invoice' in value)
  );
}

/**
 * Validate that drill-down data is not being stored
 */
export function validateNoDrillDownStorage(data: unknown): void {
  if (isDrillDownData(data)) {
    throw new Error('Drill-down data should not be stored. Fetch live data on-demand instead.');
  }
}


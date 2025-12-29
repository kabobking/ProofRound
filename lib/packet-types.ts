/**
 * Packet storage types enforcing data minimization.
 * 
 * These types ensure that only aggregated metrics and references are stored,
 * never raw Stripe objects (charges, invoices, customers, events, line items).
 */

/**
 * Time-series data point for aggregated metrics
 */
export interface TimeSeriesPoint {
  /** Time bucket (e.g., "2024-01", "2024-Q1") */
  period: string;
  /** Aggregated value for this period */
  value: number;
}

/**
 * Aggregated revenue metrics
 */
export interface RevenueMetrics {
  /** Monthly Recurring Revenue */
  mrr: number;
  /** Annual Recurring Revenue */
  arr: number;
  /** Gross revenue (before refunds/chargebacks) */
  grossRevenue: number;
  /** Net revenue (after refunds/chargebacks) */
  netRevenue: number;
  /** Total refunds amount */
  refunds: number;
  /** Total chargebacks amount */
  chargebacks: number;
  /** Time-series breakdown by month */
  monthlyBreakdown: TimeSeriesPoint[];
}

/**
 * Churn metrics
 */
export interface ChurnMetrics {
  /** Revenue churn rate (percentage) */
  revenueChurnRate: number;
  /** Logo churn rate (percentage) */
  logoChurnRate: number;
  /** Number of churned customers */
  churnedCustomers: number;
  /** Revenue lost from churn */
  revenueLost: number;
  /** Time-series breakdown by month */
  monthlyBreakdown: TimeSeriesPoint[];
}

/**
 * Customer concentration metrics
 */
export interface CustomerConcentration {
  /** Top 10 customers as percentage of total revenue */
  top10Percent: number;
  /** Top customer as percentage of total revenue */
  topCustomerPercent: number;
  /** Number of active customers */
  activeCustomers: number;
  /** Average revenue per customer */
  arpc: number;
}

/**
 * Payout reconciliation indicators
 */
export interface PayoutReconciliation {
  /** Total expected payout amount */
  expectedPayouts: number;
  /** Total actual payout amount */
  actualPayouts: number;
  /** Reconciliation variance */
  variance: number;
  /** Number of unreconciled payouts */
  unreconciledCount: number;
}

/**
 * Anomaly flags
 */
export interface AnomalyFlags {
  /** Whether revenue spike detected */
  revenueSpike: boolean;
  /** Whether refund spike detected */
  refundSpike: boolean;
  /** Whether churn spike detected */
  churnSpike: boolean;
  /** Whether payout discrepancy detected */
  payoutDiscrepancy: boolean;
  /** Additional anomaly notes */
  notes?: string[];
}

/**
 * Stripe object ID references (for drill-down only)
 * These are the ONLY Stripe IDs we store - used to fetch live data on demand
 */
export interface StripeObjectReferences {
  /** Customer IDs for drill-down (top customers only) */
  customerIds: string[];
  /** Subscription IDs for drill-down */
  subscriptionIds: string[];
  /** Charge IDs for drill-down (anomalous or significant charges only) */
  chargeIds: string[];
  /** Invoice IDs for drill-down (significant invoices only) */
  invoiceIds: string[];
  /** Event IDs for drill-down (key events only) */
  eventIds: string[];
}

/**
 * Metric definitions used in this packet
 */
export interface MetricDefinitions {
  /** Definition of MRR calculation */
  mrrDefinition: string;
  /** Definition of churn calculation */
  churnDefinition: string;
  /** Definition of revenue calculation */
  revenueDefinition: string;
  /** Additional metric definitions */
  additional?: Record<string, string>;
}

/**
 * Audit metadata
 */
export interface AuditMetadata {
  /** When the packet was generated */
  generatedAt: string; // ISO 8601 timestamp
  /** When the packet was last viewed */
  viewedAt?: string; // ISO 8601 timestamp
  /** Who generated the packet (user ID) */
  generatedBy: string;
  /** Stripe account ID this packet is for */
  stripeAccountId: string;
  /** Time range this packet covers */
  timeRange: {
    start: string; // ISO 8601 date
    end: string; // ISO 8601 date
  };
}

/**
 * Proofround Packet - minimal storage structure
 * 
 * This is the ONLY structure that should be persisted.
 * It contains NO raw Stripe objects, only aggregates and references.
 */
export interface ProofroundPacket {
  /** Unique packet ID */
  id: string;
  /** Audit metadata */
  metadata: AuditMetadata;
  /** Metric definitions */
  definitions: MetricDefinitions;
  /** Revenue metrics */
  revenue: RevenueMetrics;
  /** Churn metrics */
  churn: ChurnMetrics;
  /** Customer concentration */
  customerConcentration: CustomerConcentration;
  /** Payout reconciliation */
  payoutReconciliation: PayoutReconciliation;
  /** Anomaly flags */
  anomalies: AnomalyFlags;
  /** Stripe object references (for drill-down only) */
  references: StripeObjectReferences;
  /** Snapshot timestamp */
  snapshotTimestamp: string; // ISO 8601 timestamp
}

/**
 * Type guard to ensure we're not storing raw Stripe objects
 */
export function isRawStripeObject(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  // Check for common Stripe object indicators
  const stripeObjectIndicators = [
    'object', // Stripe objects have an 'object' field
    'created', // Timestamp field
    'livemode', // Stripe-specific field
    'metadata', // Stripe metadata field
  ];
  
  // If it has 'object' field and looks like a Stripe object, it's likely raw
  if ('object' in obj && typeof obj.object === 'string') {
    const objectType = obj.object as string;
    const stripeObjectTypes = [
      'charge',
      'invoice',
      'customer',
      'subscription',
      'payment_intent',
      'event',
      'line_item',
      'invoiceitem',
      'payout',
    ];
    
    if (stripeObjectTypes.includes(objectType)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Validate that a packet contains no raw Stripe objects
 */
export function validatePacketMinimization(packet: ProofroundPacket): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Recursively check the packet structure
  function checkValue(value: unknown, path: string): void {
    if (isRawStripeObject(value)) {
      errors.push(`Raw Stripe object detected at ${path}`);
      return;
    }
    
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        checkValue(item, `${path}[${index}]`);
      });
    } else if (value !== null && typeof value === 'object') {
      Object.entries(value).forEach(([key, val]) => {
        checkValue(val, path ? `${path}.${key}` : key);
      });
    }
  }
  
  checkValue(packet, 'packet');
  
  return {
    valid: errors.length === 0,
    errors,
  };
}


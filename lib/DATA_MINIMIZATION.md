# Data Minimization Guide

This document describes the data minimization approach for Proofround packet storage.

## Principles

1. **Never store raw Stripe objects** (charges, invoices, customers, events, line items)
2. **Store only aggregates** (MRR, churn rates, revenue totals, etc.)
3. **Store only IDs for drill-down** (customer IDs, charge IDs, etc.)
4. **Fetch live data on-demand** for drill-down views
5. **Enforce validation** at storage boundaries

## What We Store

### ✅ Allowed in Packets

- **Aggregated metrics**: MRR, ARR, churn rates, revenue totals
- **Time-series summaries**: Monthly breakdowns with period and value
- **Metric definitions**: Text definitions of how metrics are calculated
- **Stripe object IDs**: Customer IDs, charge IDs, invoice IDs (strings only)
- **Audit metadata**: Timestamps, user IDs, time ranges
- **Anomaly flags**: Boolean flags and notes

### ❌ Never Store

- Raw Stripe charge objects
- Raw Stripe invoice objects
- Raw Stripe customer objects
- Raw Stripe subscription objects
- Raw Stripe event objects
- Raw Stripe line items
- CSV-like transaction exports
- Full transaction lists
- Any Stripe object with nested data structures

## Packet Structure

```typescript
interface ProofroundPacket {
  id: string;
  metadata: AuditMetadata;
  definitions: MetricDefinitions;
  revenue: RevenueMetrics;           // Aggregates only
  churn: ChurnMetrics;                // Aggregates only
  customerConcentration: CustomerConcentration; // Aggregates only
  payoutReconciliation: PayoutReconciliation;  // Aggregates only
  anomalies: AnomalyFlags;
  references: StripeObjectReferences; // IDs only, no objects
  snapshotTimestamp: string;
}
```

## Usage Patterns

### ✅ Correct: Generate and Save Packet

```typescript
// 1. Fetch raw Stripe data (in memory)
const stripeData = await fetchStripeData();

// 2. Generate packet (processes and discards raw data)
const packet = generatePacket(stripeData, config);

// 3. Save packet (validated)
await savePacket(storage, packet);

// 4. Raw data is now out of scope - garbage collected
```

### ✅ Correct: Drill-Down with Live Data

```typescript
// Get packet (contains only IDs)
const packet = await storage.get(packetId);

// Fetch live data from Stripe using stored ID
const customerData = await fetchCustomerDrillDown(context, customerId);

// Display data (ephemeral, not stored)
return customerData;
```

### ❌ Incorrect: Storing Raw Data

```typescript
// DON'T DO THIS
packet.rawCharges = stripeCharges; // BAD!
packet.rawInvoices = stripeInvoices; // BAD!
packet.references.customers = customerObjects; // BAD!
```

## Validation

All packets are validated before storage:

1. **Type checking**: Ensures no raw Stripe objects
2. **Size checking**: Ensures packet is under 5 MB
3. **Reference validation**: Ensures references contain only IDs (strings)

## Packet Size Limits

- **Target**: Under 1 MB per packet
- **Maximum**: 5 MB per packet
- **Enforcement**: Automatic validation on save

## Drill-Down Pattern

When users need to see detailed data:

1. Packet contains only object IDs (e.g., `customerIds: ['cus_123']`)
2. UI requests drill-down for specific ID
3. Backend fetches live data from Stripe API
4. Data is returned to UI (ephemeral, not stored)
5. Data is discarded after request

This ensures:
- Packets remain small
- Data is always current
- No raw Stripe objects are stored

## Migration Guide

If you have existing packets with raw Stripe data:

1. **Identify**: Find packets containing raw Stripe objects
2. **Extract**: Process raw data to generate aggregates
3. **Extract IDs**: Pull out object IDs for references
4. **Regenerate**: Create new minimal packet structure
5. **Validate**: Ensure new packet passes validation
6. **Replace**: Save new packet, delete old one

## Security Considerations

- **Least privilege**: Only store what's necessary
- **Data minimization**: Reduces attack surface
- **Compliance**: Helps with GDPR, CCPA, etc.
- **Audit trail**: Metadata tracks who generated what and when

## Testing

Use the validation utilities to test your packets:

```typescript
import { validatePacketMinimization } from './packet-types';

const validation = validatePacketMinimization(packet);
if (!validation.valid) {
  console.error('Packet contains raw Stripe objects:', validation.errors);
}
```


# Packet Storage Refactoring Summary

## Overview

This refactoring implements data minimization for Proofround packet storage, ensuring that only aggregated metrics and references are stored, never raw Stripe objects.

## Files Created

### Core Types and Validation
- **`lib/packet-types.ts`**: TypeScript types for minimal packet storage with validation utilities
  - Defines `ProofroundPacket` interface (aggregates only)
  - Provides `validatePacketMinimization()` function
  - Includes type guards to detect raw Stripe objects

### Packet Generation
- **`lib/packet-generator.ts`**: Utilities for generating packets from Stripe data
  - `generatePacket()`: Processes raw Stripe data in memory and creates minimal packet
  - Extracts only aggregated metrics (MRR, churn, revenue, etc.)
  - Extracts only object IDs for drill-down references
  - Raw Stripe data is processed and discarded (never stored)

### Storage Layer
- **`lib/packet-storage.ts`**: Storage interface with data minimization enforcement
  - `PacketStorage` interface for storage backends
  - `InMemoryPacketStorage`: Example implementation
  - `savePacket()`: Validates packets before storage
  - Enforces packet size limits (5 MB max)
  - Validates no raw Stripe objects are stored

### Drill-Down Utilities
- **`lib/packet-drilldown.ts`**: Utilities for fetching live Stripe data on-demand
  - `fetchCustomerDrillDown()`: Fetches live customer data using stored ID
  - `fetchChargeDrillDown()`: Fetches live charge data using stored ID
  - Similar functions for invoices and subscriptions
  - All drill-down data is ephemeral (not stored)

### API Examples
- **`app/api/packets/route.ts`**: Example Next.js API route for packet CRUD operations
- **`app/api/packets/drilldown/route.ts`**: Example API route for drill-down data
- **`lib/packet-api-example.ts`**: Reference implementation patterns

### Documentation
- **`lib/DATA_MINIMIZATION.md`**: Comprehensive guide on data minimization principles
- **`lib/packet/index.ts`**: Barrel export for easy imports

## Key Features

### ✅ Data Minimization Enforcement

1. **Type Safety**: TypeScript types prevent storing raw Stripe objects
2. **Runtime Validation**: `validatePacketMinimization()` checks packets before storage
3. **Size Limits**: Packets are limited to 5 MB maximum
4. **Reference Validation**: Ensures references contain only IDs (strings), not objects

### ✅ What Gets Stored

- Aggregated metrics (MRR, ARR, churn rates, revenue totals)
- Time-series summaries (monthly breakdowns)
- Metric definitions
- Stripe object IDs (for drill-down only)
- Audit metadata (timestamps, user IDs)
- Anomaly flags

### ❌ What Never Gets Stored

- Raw Stripe charge objects
- Raw Stripe invoice objects
- Raw Stripe customer objects
- Raw Stripe subscription objects
- Raw Stripe event objects
- Raw Stripe line items
- CSV-like transaction exports
- Full transaction lists

### ✅ Drill-Down Pattern

When users need detailed data:
1. Packet contains only object IDs
2. Backend fetches live data from Stripe API on-demand
3. Data is returned to UI (ephemeral)
4. Data is discarded after request

## Usage Example

```typescript
import { generatePacket, savePacket, InMemoryPacketStorage } from '@/lib/packet';

// 1. Fetch raw Stripe data (in memory)
const stripeData = await fetchStripeData();

// 2. Generate packet (processes and discards raw data)
const config = {
  stripeAccountId: 'acct_123',
  generatedBy: 'user_456',
  timeRangeStart: '2024-01-01',
  timeRangeEnd: '2024-12-31',
};
const packet = generatePacket(stripeData, config);

// 3. Save packet (validated automatically)
const storage = new InMemoryPacketStorage();
await savePacket(storage, packet);

// 4. Raw Stripe data is now out of scope - garbage collected
```

## Migration Path

If you have existing packets with raw Stripe data:

1. **Identify**: Find packets containing raw Stripe objects
2. **Extract**: Process raw data to generate aggregates
3. **Extract IDs**: Pull out object IDs for references
4. **Regenerate**: Create new minimal packet structure
5. **Validate**: Ensure new packet passes validation
6. **Replace**: Save new packet, delete old one

## Testing

Use the validation utilities:

```typescript
import { validatePacketMinimization } from '@/lib/packet-types';

const validation = validatePacketMinimization(packet);
if (!validation.valid) {
  console.error('Packet contains raw Stripe objects:', validation.errors);
}
```

## Security Benefits

- **Least privilege**: Only store what's necessary
- **Data minimization**: Reduces attack surface
- **Compliance**: Helps with GDPR, CCPA, etc.
- **Audit trail**: Metadata tracks who generated what and when

## Next Steps

1. **Replace InMemoryStorage**: Implement database-backed storage (PostgreSQL, MongoDB, etc.)
2. **Integrate Stripe SDK**: Replace example Stripe client with actual SDK
3. **Add Authentication**: Secure API routes with proper auth
4. **Add Rate Limiting**: Protect drill-down endpoints
5. **Add Caching**: Cache drill-down data temporarily (not persisted)
6. **Add Monitoring**: Track packet sizes and validation failures

## Notes

- All validation happens at storage boundaries
- Raw Stripe data is processed in memory and discarded
- Drill-down data is always fetched live (never stored)
- Packet size is enforced to keep storage costs low
- Type system prevents accidental storage of raw objects


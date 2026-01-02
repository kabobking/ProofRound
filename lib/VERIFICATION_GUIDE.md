# Packet Verification Guide

This guide explains how to verify that stored packets contain no raw Stripe objects and meet size requirements.

## Debug Logging

Debug logging is automatically enabled when:
- `NODE_ENV=development`, or
- `PACKET_DEBUG=true` environment variable is set

When enabled, the storage layer will log:
- Packet size (bytes, KB, MB)
- Reference array counts (customerIds, subscriptionIds, etc.)
- Monthly breakdown point counts
- Timestamp of storage operation

Example log output:
```
[PACKET_STORAGE_DEBUG] {
  packetId: 'pkt_1234567890_abc123',
  size: { bytes: 45678, kb: '44.61', mb: '0.0435' },
  referenceCounts: {
    customerIds: 10,
    subscriptionIds: 45,
    chargeIds: 20,
    invoiceIds: 15,
    eventIds: 0
  },
  totalReferences: 90,
  monthlyBreakdownPoints: 12,
  churnBreakdownPoints: 12,
  timestamp: '2024-01-15T10:30:00.000Z'
}
```

## Verification Functions

### `verifyStoredPacket(packet)`

Performs comprehensive verification of a packet:
- Checks for raw Stripe objects
- Validates packet size
- Verifies reference arrays contain only string IDs
- Returns detailed statistics

```typescript
import { verifyStoredPacket } from '@/lib/packet-storage';

const verification = verifyStoredPacket(packet);
if (!verification.valid) {
  console.error('Packet contains errors:', verification.errors);
}
console.log('Packet stats:', verification.stats);
```

### `verifyPacketRecord(packet)`

Enhanced verification that also checks for nested Stripe objects:
- All checks from `verifyStoredPacket`
- Deep recursive check for nested Stripe objects
- Reports all found objects with paths

```typescript
import { verifyPacketRecord } from '@/lib/packet-verification';

const verification = verifyPacketRecord(packet);
console.log('Nested objects found:', verification.stats.nestedObjectCount);
```

### `verifyPacketRecords(packets)`

Batch verify multiple packets:

```typescript
import { verifyPacketRecords } from '@/lib/packet-verification';

const results = verifyPacketRecords(packets);
console.log(`Valid: ${results.valid}/${results.total}`);
results.results.forEach(r => {
  if (!r.valid) {
    console.error(`Packet ${r.packetId} has errors:`, r.errors);
  }
});
```

## ID Array Capping

ID arrays are automatically capped to prevent unbounded growth:

- **Customer IDs**: Top N by revenue (default: 10)
- **Subscription IDs**: Last 12 months or max 100, whichever is smaller
- **Charge IDs**: Significant charges only, max 50
- **Invoice IDs**: Significant invoices only, max 50
- **Event IDs**: Not stored (empty array)

This ensures packets remain small even with large datasets.

## Checking for Raw Stripe Objects

### What to Look For

Raw Stripe objects have these characteristics:
- `object` field with values like: `"charge"`, `"invoice"`, `"customer"`, `"subscription"`, etc.
- Nested structures like `lines`, `line_items`, `data` arrays
- Fields like `livemode`, `metadata` with complex nested data
- Full object structures, not just IDs

### Example: Raw Stripe Object (BAD)
```json
{
  "object": "charge",
  "id": "ch_123",
  "amount": 1000,
  "customer": {
    "object": "customer",
    "id": "cus_123",
    "email": "customer@example.com"
  },
  "invoice": {
    "object": "invoice",
    "id": "in_123",
    "lines": {
      "data": [...]
    }
  }
}
```

### Example: Minimal Reference (GOOD)
```json
{
  "chargeIds": ["ch_123", "ch_456"],
  "customerIds": ["cus_123", "cus_456"]
}
```

## Size Limits

- **Target**: Under 1 MB per packet
- **Maximum**: 5 MB per packet (enforced)
- **Typical**: 50-200 KB for most packets

If a packet exceeds 5 MB, storage will fail with `SIZE_EXCEEDED` error.

## Manual Verification

To manually verify a stored packet:

```typescript
import { verifyPacketRecord } from '@/lib/packet-verification';
import { storage } from './your-storage';

const packet = await storage.get('packet-id');
if (packet) {
  const verification = verifyPacketRecord(packet);
  
  console.log('Verification results:', {
    valid: verification.valid,
    sizeMB: verification.stats.sizeMB,
    hasRawObjects: verification.stats.hasRawObjects,
    nestedObjectCount: verification.stats.nestedObjectCount,
    referenceCounts: verification.stats.referenceCounts,
  });

  if (!verification.valid) {
    console.error('Errors:', verification.errors);
  }
  if (verification.warnings.length > 0) {
    console.warn('Warnings:', verification.warnings);
  }
}
```

## Production Monitoring

In production, you should:
1. Enable debug logging for packet storage operations
2. Monitor packet sizes (alert if > 1 MB)
3. Monitor validation failures
4. Periodically run batch verification on stored packets
5. Alert if any packets contain raw Stripe objects

## Common Issues

### Issue: Packet size too large
**Solution**: Check reference array sizes. If they're very large, the capping logic may need adjustment.

### Issue: Raw Stripe objects detected
**Solution**: Review packet generation code. Ensure `generatePacket()` is not storing raw objects.

### Issue: Reference arrays contain objects instead of IDs
**Solution**: Check `extractReferences()` function. It should only extract `.id` fields, not full objects.


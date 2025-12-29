/**
 * Packet verification utilities
 * 
 * Use these functions to verify that stored packets contain no raw Stripe objects
 * and meet size requirements.
 */

import type { ProofroundPacket } from './packet-types';
import { verifyStoredPacket } from './packet-storage';
import { isRawStripeObject } from './packet-types';

/**
 * Check if a packet contains any nested Stripe objects
 * 
 * This performs a deep recursive check for Stripe object patterns:
 * - Objects with 'object' field matching Stripe object types
 * - Objects with 'lines', 'line_items', or 'data' arrays containing Stripe objects
 * - Objects with Stripe-specific fields like 'livemode', 'metadata' with nested structures
 */
export function checkForNestedStripeObjects(packet: ProofroundPacket): {
  hasRawObjects: boolean;
  foundObjects: Array<{ path: string; type: string }>;
} {
  const foundObjects: Array<{ path: string; type: string }> = [];

  function checkValue(value: unknown, path: string): void {
    if (typeof value !== 'object' || value === null) {
      return;
    }

    const obj = value as Record<string, unknown>;

    // Check if this is a raw Stripe object
    if (isRawStripeObject(obj)) {
      const objectType = (obj as { object?: string }).object || 'unknown';
      foundObjects.push({ path, type: objectType });
    }

    // Check for Stripe list objects (objects with 'data' array)
    if ('data' in obj && Array.isArray(obj.data)) {
      const dataArray = obj.data as unknown[];
      dataArray.forEach((item, index) => {
        if (isRawStripeObject(item)) {
          const objectType = (item as { object?: string }).object || 'unknown';
          foundObjects.push({ path: `${path}.data[${index}]`, type: objectType });
        }
        // Recursively check nested items
        checkValue(item, `${path}.data[${index}]`);
      });
    }

    // Check for line items (invoices, etc.)
    if ('lines' in obj && Array.isArray(obj.lines)) {
      const linesArray = obj.lines as unknown[];
      linesArray.forEach((item, index) => {
        checkValue(item, `${path}.lines[${index}]`);
      });
    }

    if ('line_items' in obj && Array.isArray(obj.line_items)) {
      const lineItemsArray = obj.line_items as unknown[];
      lineItemsArray.forEach((item, index) => {
        checkValue(item, `${path}.line_items[${index}]`);
      });
    }

    // Recursively check all properties
    Object.entries(obj).forEach(([key, val]) => {
      // Skip known safe fields
      if (key === 'id' && typeof val === 'string') {
        return; // IDs are strings, not objects
      }
      checkValue(val, path ? `${path}.${key}` : key);
    });
  }

  checkValue(packet, 'packet');

  return {
    hasRawObjects: foundObjects.length > 0,
    foundObjects,
  };
}

/**
 * Verify a packet record contains no nested Stripe objects
 * 
 * This is a comprehensive check that:
 * 1. Validates packet structure
 * 2. Checks for raw Stripe objects
 * 3. Verifies reference arrays contain only IDs (strings)
 * 4. Reports packet size and statistics
 */
export function verifyPacketRecord(packet: ProofroundPacket): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    sizeBytes: number;
    sizeMB: number;
    referenceCounts: Record<string, number>;
    hasRawObjects: boolean;
    nestedObjectCount: number;
  };
} {
  // Use the storage verification function
  const storageVerification = verifyStoredPacket(packet);

  // Additional check for nested objects
  const nestedCheck = checkForNestedStripeObjects(packet);

  // Combine results
  const allErrors = [...storageVerification.errors];
  if (nestedCheck.hasRawObjects) {
    nestedCheck.foundObjects.forEach(({ path, type }) => {
      allErrors.push(`Raw Stripe ${type} object found at ${path}`);
    });
  }

  return {
    valid: storageVerification.valid && !nestedCheck.hasRawObjects,
    errors: allErrors,
    warnings: storageVerification.warnings,
    stats: {
      ...storageVerification.stats,
      nestedObjectCount: nestedCheck.foundObjects.length,
    },
  };
}

/**
 * Batch verify multiple packets
 */
export function verifyPacketRecords(packets: ProofroundPacket[]): {
  total: number;
  valid: number;
  invalid: number;
  results: Array<{
    packetId: string;
    valid: boolean;
    errors: string[];
    sizeMB: number;
  }>;
} {
  const results = packets.map(packet => {
    const verification = verifyPacketRecord(packet);
    return {
      packetId: packet.id,
      valid: verification.valid,
      errors: verification.errors,
      sizeMB: verification.stats.sizeMB,
    };
  });

  const valid = results.filter(r => r.valid).length;
  const invalid = results.length - valid;

  return {
    total: packets.length,
    valid,
    invalid,
    results,
  };
}


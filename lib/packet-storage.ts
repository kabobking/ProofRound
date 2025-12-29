/**
 * Packet storage layer with data minimization enforcement.
 * 
 * This module provides storage operations that validate packets
 * to ensure no raw Stripe objects are persisted.
 */

import type { ProofroundPacket } from './packet-types';
import { validatePacketMinimization, isRawStripeObject } from './packet-types';

/**
 * Storage interface - implement with your preferred storage backend
 * (e.g., database, file system, object storage)
 */
export interface PacketStorage {
  /** Save a packet */
  save(packet: ProofroundPacket): Promise<void>;
  /** Retrieve a packet by ID */
  get(packetId: string): Promise<ProofroundPacket | null>;
  /** List packets for a user */
  list(userId: string): Promise<ProofroundPacket[]>;
  /** Update packet metadata (e.g., viewed_at) */
  updateMetadata(packetId: string, metadata: Partial<ProofroundPacket['metadata']>): Promise<void>;
  /** Delete a packet */
  delete(packetId: string): Promise<void>;
}

/**
 * Storage error types
 */
export class PacketStorageError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'PacketStorageError';
  }
}

/**
 * Debug logging configuration
 * Set to true to enable detailed logging before packet storage
 */
const DEBUG_LOGGING = process.env.NODE_ENV === 'development' || process.env.PACKET_DEBUG === 'true';

/**
 * Log packet structure and size for verification
 */
function logPacketStructure(packet: ProofroundPacket): void {
  if (!DEBUG_LOGGING) return;

  const packetJson = JSON.stringify(packet);
  const packetSizeBytes = packetJson.length;
  const packetSizeKB = packetSizeBytes / 1024;
  const packetSizeMB = packetSizeKB / 1024;

  const refs = packet.references;
  const keyCounts = {
    customerIds: refs.customerIds.length,
    subscriptionIds: refs.subscriptionIds.length,
    chargeIds: refs.chargeIds.length,
    invoiceIds: refs.invoiceIds.length,
    eventIds: refs.eventIds.length,
  };

  console.log('[PACKET_STORAGE_DEBUG]', {
    packetId: packet.id,
    size: {
      bytes: packetSizeBytes,
      kb: packetSizeKB.toFixed(2),
      mb: packetSizeMB.toFixed(4),
    },
    referenceCounts: keyCounts,
    totalReferences: Object.values(keyCounts).reduce((sum, count) => sum + count, 0),
    monthlyBreakdownPoints: packet.revenue.monthlyBreakdown.length,
    churnBreakdownPoints: packet.churn.monthlyBreakdown.length,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Validate packet before storage
 */
function validateBeforeStorage(packet: ProofroundPacket): void {
  // Debug logging (before validation)
  logPacketStructure(packet);

  // Check for raw Stripe objects
  const validation = validatePacketMinimization(packet);
  if (!validation.valid) {
    console.error('[PACKET_STORAGE_ERROR] Raw Stripe objects detected:', validation.errors);
    throw new PacketStorageError(
      `Packet contains raw Stripe objects: ${validation.errors.join(', ')}`,
      'VALIDATION_ERROR'
    );
  }

  // Check packet size (should be under a few MB)
  const packetSize = JSON.stringify(packet).length;
  const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
  if (packetSize > maxSizeBytes) {
    console.error('[PACKET_STORAGE_ERROR] Packet size exceeded:', {
      size: `${(packetSize / 1024 / 1024).toFixed(2)} MB`,
      max: `${maxSizeBytes / 1024 / 1024} MB`,
    });
    throw new PacketStorageError(
      `Packet size (${(packetSize / 1024 / 1024).toFixed(2)} MB) exceeds maximum (${maxSizeBytes / 1024 / 1024} MB)`,
      'SIZE_EXCEEDED'
    );
  }

  // Validate required fields
  if (!packet.id || !packet.metadata || !packet.snapshotTimestamp) {
    throw new PacketStorageError('Packet missing required fields', 'INVALID_PACKET');
  }

  // Additional check: verify references contain only strings (IDs), not objects
  const refs = packet.references;
  const allRefArrays = [
    { name: 'customerIds', values: refs.customerIds },
    { name: 'subscriptionIds', values: refs.subscriptionIds },
    { name: 'chargeIds', values: refs.chargeIds },
    { name: 'invoiceIds', values: refs.invoiceIds },
    { name: 'eventIds', values: refs.eventIds },
  ];

  for (const { name, values } of allRefArrays) {
    for (const value of values) {
      if (typeof value !== 'string') {
        throw new PacketStorageError(
          `Reference array ${name} contains non-string value: ${typeof value}`,
          'INVALID_REFERENCES'
        );
      }
      // Check if it looks like a Stripe ID (starts with expected prefix)
      if (!/^(cus|sub|ch|in|ev)_/.test(value)) {
        console.warn(`[PACKET_STORAGE_WARN] Reference ${name} contains value that may not be a Stripe ID: ${value}`);
      }
    }
  }
}

/**
 * In-memory storage implementation (for development/testing)
 * Replace with actual database or object storage in production
 */
export class InMemoryPacketStorage implements PacketStorage {
  private packets: Map<string, ProofroundPacket> = new Map();
  private userPackets: Map<string, Set<string>> = new Map();

  async save(packet: ProofroundPacket): Promise<void> {
    // Validate before storage
    validateBeforeStorage(packet);

    // Store packet
    this.packets.set(packet.id, packet);

    // Index by user
    const userId = packet.metadata.generatedBy;
    if (!this.userPackets.has(userId)) {
      this.userPackets.set(userId, new Set());
    }
    this.userPackets.get(userId)!.add(packet.id);
  }

  async get(packetId: string): Promise<ProofroundPacket | null> {
    const packet = this.packets.get(packetId);
    if (!packet) {
      return null;
    }

    // Validate on retrieval (defense in depth)
    const validation = validatePacketMinimization(packet);
    if (!validation.valid) {
      throw new PacketStorageError(
        `Stored packet contains invalid data: ${validation.errors.join(', ')}`,
        'CORRUPTED_PACKET'
      );
    }

    return packet;
  }

  async list(userId: string): Promise<ProofroundPacket[]> {
    const packetIds = this.userPackets.get(userId);
    if (!packetIds) {
      return [];
    }

    const packets: ProofroundPacket[] = [];
    for (const packetId of packetIds) {
      const packet = await this.get(packetId);
      if (packet) {
        packets.push(packet);
      }
    }

    return packets.sort((a, b) => 
      new Date(b.metadata.generatedAt).getTime() - new Date(a.metadata.generatedAt).getTime()
    );
  }

  async updateMetadata(
    packetId: string,
    metadata: Partial<ProofroundPacket['metadata']>
  ): Promise<void> {
    const packet = await this.get(packetId);
    if (!packet) {
      throw new PacketStorageError(`Packet not found: ${packetId}`, 'NOT_FOUND');
    }

    // Update metadata
    packet.metadata = { ...packet.metadata, ...metadata };

    // Re-validate and save
    validateBeforeStorage(packet);
    this.packets.set(packetId, packet);
  }

  async delete(packetId: string): Promise<void> {
    const packet = await this.get(packetId);
    if (!packet) {
      throw new PacketStorageError(`Packet not found: ${packetId}`, 'NOT_FOUND');
    }

    // Remove from index
    const userId = packet.metadata.generatedBy;
    const userPacketSet = this.userPackets.get(userId);
    if (userPacketSet) {
      userPacketSet.delete(packetId);
    }

    // Remove packet
    this.packets.delete(packetId);
  }
}

/**
 * Helper function to save a packet with validation
 * Use this wrapper to ensure all packets are validated before storage
 */
export async function savePacket(
  storage: PacketStorage,
  packet: ProofroundPacket
): Promise<void> {
  // Additional validation: ensure no raw Stripe objects in references
  // References should only contain IDs (strings), not full objects
  if (packet.references) {
    const refs = packet.references;
    const allRefs = [
      ...refs.customerIds,
      ...refs.subscriptionIds,
      ...refs.chargeIds,
      ...refs.invoiceIds,
      ...refs.eventIds,
    ];

    for (const ref of allRefs) {
      if (isRawStripeObject(ref)) {
        console.error('[PACKET_STORAGE_ERROR] Reference contains raw Stripe object:', ref);
        throw new PacketStorageError(
          'References contain raw Stripe objects instead of IDs',
          'INVALID_REFERENCES'
        );
      }
    }
  }

  // Log packet structure before saving (debug mode)
  if (DEBUG_LOGGING) {
    const verification = verifyStoredPacket(packet);
    console.log('[PACKET_STORAGE_VERIFICATION]', {
      packetId: packet.id,
      valid: verification.valid,
      sizeMB: verification.stats.sizeMB,
      referenceCounts: verification.stats.referenceCounts,
      hasRawObjects: verification.stats.hasRawObjects,
    });

    if (!verification.valid) {
      console.error('[PACKET_STORAGE_ERROR] Packet validation failed:', verification.errors);
    }
  }

  await storage.save(packet);
}

/**
 * Helper function to record packet view
 */
export async function recordPacketView(
  storage: PacketStorage,
  packetId: string
): Promise<void> {
  await storage.updateMetadata(packetId, {
    viewedAt: new Date().toISOString(),
  });
}

/**
 * Verify a stored packet contains no raw Stripe objects
 * 
 * This function performs a deep check to ensure no nested Stripe objects
 * are present in the stored packet.
 */
export function verifyStoredPacket(packet: ProofroundPacket): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    sizeBytes: number;
    sizeMB: number;
    referenceCounts: Record<string, number>;
    hasRawObjects: boolean;
  };
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const packetJson = JSON.stringify(packet);
  const sizeBytes = packetJson.length;
  const sizeMB = sizeBytes / 1024 / 1024;

  // Check for raw Stripe objects
  const validation = validatePacketMinimization(packet);
  if (!validation.valid) {
    errors.push(...validation.errors);
  }

  // Check for nested objects that look like Stripe objects
  function checkForStripeObjects(value: unknown, path: string): void {
    if (typeof value !== 'object' || value === null) {
      return;
    }

    const obj = value as Record<string, unknown>;

    // Check for Stripe object indicators
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
        errors.push(`Raw Stripe ${objectType} object found at ${path}`);
      }
    }

    // Check for common Stripe nested structures
    if ('lines' in obj || 'line_items' in obj || 'data' in obj) {
      // Could be a Stripe list object - check if it contains Stripe objects
      if (Array.isArray(obj.lines) || Array.isArray(obj.line_items) || Array.isArray(obj.data)) {
        const array = (obj.lines || obj.line_items || obj.data) as unknown[];
        array.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            const itemObj = item as Record<string, unknown>;
            if ('object' in itemObj && typeof itemObj.object === 'string') {
              warnings.push(`Possible Stripe object in array at ${path}[${index}]`);
            }
          }
        });
      }
    }

    // Recursively check nested objects
    Object.entries(obj).forEach(([key, val]) => {
      checkForStripeObjects(val, path ? `${path}.${key}` : key);
    });
  }

  checkForStripeObjects(packet, 'packet');

  const refs = packet.references;
  const referenceCounts = {
    customerIds: refs.customerIds.length,
    subscriptionIds: refs.subscriptionIds.length,
    chargeIds: refs.chargeIds.length,
    invoiceIds: refs.invoiceIds.length,
    eventIds: refs.eventIds.length,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      sizeBytes,
      sizeMB: parseFloat(sizeMB.toFixed(4)),
      referenceCounts,
      hasRawObjects: errors.length > 0,
    },
  };
}


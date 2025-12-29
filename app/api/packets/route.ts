/**
 * Example Next.js API route for packet generation and retrieval
 * 
 * This demonstrates how to use the packet storage system with data minimization.
 * Adapt this to your actual authentication and Stripe integration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePacket, type PacketGenerationConfig } from '@/lib/packet-generator';
import { savePacket, recordPacketView, InMemoryPacketStorage, type PacketStorage } from '@/lib/packet-storage';
import { fetchCustomerDrillDown, type DrillDownContext, type StripeClient } from '@/lib/packet-drilldown';
import type { ProofroundPacket } from '@/lib/packet-types';

// In production, use a proper database-backed storage
// This is just an example with in-memory storage
const storage: PacketStorage = new InMemoryPacketStorage();

/**
 * GET /api/packets - List packets for a user
 * GET /api/packets?id=xxx - Get specific packet
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const packetId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (packetId) {
      // Get specific packet
      const packet = await storage.get(packetId);
      if (!packet) {
        return NextResponse.json(
          { error: 'Packet not found' },
          { status: 404 }
        );
      }

      // Record view
      await recordPacketView(storage, packetId);

      return NextResponse.json(packet);
    }

    if (userId) {
      // List packets for user
      const packets = await storage.list(userId);
      return NextResponse.json({ packets });
    }

    return NextResponse.json(
      { error: 'Missing packetId or userId' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching packet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/packets - Generate and save a new packet
 * 
 * Body should contain:
 * - stripeAccountId: string
 * - generatedBy: string (user ID)
 * - timeRangeStart: string (ISO 8601 date)
 * - timeRangeEnd: string (ISO 8601 date)
 * - stripeData: { charges, invoices, customers, subscriptions, payouts }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      stripeAccountId,
      generatedBy,
      timeRangeStart,
      timeRangeEnd,
      stripeData,
    } = body;

    // Validate required fields
    if (!stripeAccountId || !generatedBy || !timeRangeStart || !timeRangeEnd || !stripeData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create config
    const config: PacketGenerationConfig = {
      stripeAccountId,
      generatedBy,
      timeRangeStart,
      timeRangeEnd,
    };

    // Generate packet (processes raw Stripe data in memory, discards it)
    const packet = generatePacket(stripeData, config);

    // Save packet (with validation)
    await savePacket(storage, packet);

    // Return packet (raw Stripe data is already discarded)
    return NextResponse.json(packet, { status: 201 });
  } catch (error) {
    console.error('Error generating packet:', error);
    
    if (error instanceof Error && 'code' in error) {
      // PacketStorageError
      return NextResponse.json(
        { error: error.message, code: (error as { code: string }).code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/packets?id=xxx - Delete a packet
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const packetId = searchParams.get('id');

    if (!packetId) {
      return NextResponse.json(
        { error: 'Missing packetId' },
        { status: 400 }
      );
    }

    await storage.delete(packetId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting packet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


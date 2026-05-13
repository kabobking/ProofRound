import { createVerifiedPacket, renderPacketPdf } from '../../lib/packets.js';
import { uploadBuffer } from '../../lib/storage.js';
import { getDb } from '../../lib/firebase-admin.js';
import type { BackendRequest, BackendResponse } from '../../lib/http.js';

export default async function handler(req: BackendRequest, res: BackendResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startupId = String(req.query.startupId || '').trim();
    if (!startupId) {
      return res.status(400).json({ error: 'startupId is required' });
    }

    const start = typeof req.query.start === 'string' ? req.query.start : undefined;
    const end = typeof req.query.end === 'string' ? req.query.end : undefined;
    const { startup, packet } = await createVerifiedPacket(startupId, { start, end });
    const pdfBuffer = await renderPacketPdf(startup, packet);

    // upload to Firebase Storage and update the Firestore packet doc with storage info
    const dest = `packets/${packet.id}.pdf`;
    const { storagePath, downloadUrl } = await uploadBuffer(pdfBuffer, dest, 'application/pdf');

    const db = getDb();
    await db.collection('proofround_packets').doc(packet.id).update({
      pdf: {
        storagePath,
        downloadUrl,
      },
      updatedAt: new Date().toISOString(),
    });

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ packetId: packet.id, pdfUrl: downloadUrl });
  } catch (error) {
    console.error('Packet generation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate verified packet',
    });
  }
}
import { createVerifiedPacket, renderInvestorPacketPdf } from '../../lib/packets.js';
import { uploadBuffer } from '../../lib/storage.js';
import { getDb } from '../../lib/firebase-admin.js';
import type { BackendRequest, BackendResponse } from '../../lib/http.js';

function toSafeFilenamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function sendInlinePdf(res: BackendResponse, pdfBuffer: Buffer, startupName: string, packetId: string) {
  const startupPart = toSafeFilenamePart(startupName || 'startup');
  const packetPart = toSafeFilenamePart(packetId || 'packet');
  const fileName = `proofround-${startupPart}-${packetPart}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(pdfBuffer);
}

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
    const pdfBuffer = await renderInvestorPacketPdf(startup, packet);

    // Free-tier mode: if no bucket is configured, return the generated PDF directly.
    if (!process.env.FIREBASE_STORAGE_BUCKET) {
      return sendInlinePdf(res, pdfBuffer, startup.name, packet.id);
    }

    try {
      // Preferred path: upload to Firebase Storage and persist downloadable URL.
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
    } catch (storageError) {
      // Fallback mode for projects that cannot enable paid Firebase Storage.
      console.warn('Storage upload unavailable, returning inline PDF instead:', storageError);
      return sendInlinePdf(res, pdfBuffer, startup.name, packet.id);
    }
  } catch (error) {
    console.error('Packet generation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate verified packet',
    });
  }
}
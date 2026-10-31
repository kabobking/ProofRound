import { createVerifiedPacket, renderInvestorPacketPdf } from '../../lib/packets.js';
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
  const fileName = `proofround-${startupPart}-${packetPart}-export.pdf`;

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

    // Directly return the verified PDF inline
    return sendInlinePdf(res, pdfBuffer, startup.name, packet.id);
  } catch (error) {
    console.error('Packet generation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate verified packet',
    });
  }
}
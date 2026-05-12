import { createVerifiedPacket, renderPacketPdf } from '../../lib/packets';
import type { BackendRequest, BackendResponse } from '../../lib/http';

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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=proofround-${startupId}.pdf`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Packet generation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate verified packet',
    });
  }
}
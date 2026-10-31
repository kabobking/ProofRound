import type { BackendRequest, BackendResponse } from '../../lib/http.js';

export default async function handler(req: BackendRequest, res: BackendResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-vercel-id');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  return res.status(204).end();
}

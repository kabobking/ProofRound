import type { BackendRequest, BackendResponse } from '../lib/http.js';

export default function handler(req: BackendRequest, res: BackendResponse) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  return res.status(200).send('API is healthy.');
}

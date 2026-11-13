import type { ServerResponse } from 'node:http';
import { handleCommunity } from '../server/community.ts';
import {
  createIpRateLimiter,
  isSameOrigin,
  PayloadTooLargeError,
  readJsonBody,
  sendJson,
  type JsonRequest,
} from '../server/http.ts';

/**
 * Vercel serverless adapter for the shared community handler.
 *
 * Firebase Authentication and Firestore are the only Firebase services used at
 * runtime. Firestore is reached exclusively through the Firebase Admin SDK on
 * this server; the browser never talks to Firestore directly.
 */

const MAX_BODY_BYTES = 64 * 1024;
const isRateLimited = createIpRateLimiter({
  windowMs: 60_000,
  maxRequests: 120,
});

export default async function handler(
  req: JsonRequest,
  res: ServerResponse,
): Promise<void> {
  const method = (req.method ?? 'GET').toUpperCase();

  if (method !== 'GET' && method !== 'POST') {
    sendJson(
      res,
      405,
      { error: 'Method not allowed. Use GET or POST.' },
      { Allow: 'GET, POST' },
    );
    return;
  }

  if (!isSameOrigin(req)) {
    sendJson(res, 403, { error: 'Cross-origin requests are not allowed.' });
    return;
  }

  if (method === 'POST') {
    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.toLowerCase().startsWith('application/json')) {
      sendJson(res, 415, { error: 'Content-Type must be application/json.' });
      return;
    }
  }

  const contentLength = Number(req.headers['content-length'] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    sendJson(res, 413, { error: 'Request body is too large.' });
    return;
  }

  const retryAfter = isRateLimited(req);
  if (retryAfter > 0) {
    sendJson(
      res,
      429,
      { error: 'Too many requests. Please wait a moment and try again.' },
      { 'Retry-After': String(retryAfter) },
    );
    return;
  }

  let body: unknown;
  if (method === 'POST') {
    try {
      body = await readJsonBody(req, MAX_BODY_BYTES);
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        sendJson(res, 413, { error: error.message });
        return;
      }
      if (error instanceof SyntaxError) {
        sendJson(res, 400, { error: error.message });
        return;
      }
      console.error('[higala] community body parse error:', error);
      sendJson(res, 400, { error: 'Invalid request body.' });
      return;
    }
  }

  const result = await handleCommunity({
    method,
    url: req.url,
    headers: req.headers,
    body,
  });

  sendJson(res, result.status, result.body, result.headers);
}

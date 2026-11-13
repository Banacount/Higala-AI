import type { ServerResponse } from 'node:http';
import { ChatValidationError, handleChat } from '../server/chat.ts';
import {
  createIpRateLimiter,
  isSameOrigin,
  PayloadTooLargeError,
  readJsonBody,
  sendJson,
  type JsonRequest,
} from '../server/http.ts';

/**
 * Vercel serverless adapter for the shared Gemini handler.
 *
 * This file is what makes `/api/chat` exist in production. Without it the
 * catch-all rewrite in `vercel.json` sends `/api/chat` to `index.html`, the
 * client receives HTML instead of JSON, and the app silently stays in demo
 * mode even when `GEMINI_API_KEY` is configured in the Vercel dashboard.
 */

const MAX_BODY_BYTES = 1_000_000;
const isRateLimited = createIpRateLimiter({
  windowMs: 60_000,
  // Best-effort per-instance guard. Serverless instances do not share memory,
  // so this is a speed bump rather than a global quota; pair it with Vercel's
  // platform rate limiting (or a shared store) for hard enforcement.
  maxRequests: 20,
});

export default async function handler(
  req: JsonRequest,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(
      res,
      405,
      { error: 'Method not allowed. Use POST.' },
      { Allow: 'POST' },
    );
    return;
  }

  if (!isSameOrigin(req)) {
    sendJson(res, 403, { error: 'Cross-origin requests are not allowed.' });
    return;
  }

  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    sendJson(res, 415, { error: 'Content-Type must be application/json.' });
    return;
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

  try {
    const body = await readJsonBody(req, MAX_BODY_BYTES);
    const result = await handleChat(body, {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL,
    });
    sendJson(res, 200, result);
  } catch (error) {
    if (error instanceof ChatValidationError) {
      sendJson(res, 400, { error: error.message });
      return;
    }
    if (error instanceof PayloadTooLargeError) {
      sendJson(res, 413, { error: error.message });
      return;
    }
    if (error instanceof SyntaxError) {
      sendJson(res, 400, { error: error.message });
      return;
    }

    console.error('[higala] Vercel chat function error:', error);
    sendJson(res, 500, {
      error: 'The support service is unavailable right now.',
    });
  }
}

import type { IncomingMessage, ServerResponse } from 'node:http';
import { ChatValidationError, handleChat } from '../server/chat.ts';

/**
 * Vercel serverless adapter for the shared Gemini handler.
 *
 * This file is what makes `/api/chat` exist in production. Without it the
 * catch-all rewrite in `vercel.json` sends `/api/chat` to `index.html`, the
 * client receives HTML instead of JSON, and the app silently stays in demo
 * mode even when `GEMINI_API_KEY` is configured in the Vercel dashboard.
 */

const MAX_BODY_BYTES = 1_000_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

interface VercelRequest extends IncomingMessage {
  body?: unknown;
  socket: IncomingMessage['socket'] & { remoteAddress?: string };
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

// Best-effort per-instance guard. Serverless instances do not share memory, so
// this is a speed bump rather than a global quota; pair it with Vercel's
// platform rate limiting (or a shared store) for hard enforcement.
const rateLimitBuckets = new Map<string, RateLimitBucket>();

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(',')[0];
  const realIp = req.headers['x-real-ip'];
  return (
    firstForwarded?.trim() ||
    (Array.isArray(realIp) ? realIp[0] : realIp)?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function isRateLimited(req: VercelRequest): number {
  const now = Date.now();
  if (rateLimitBuckets.size > 5_000) {
    for (const [key, bucket] of rateLimitBuckets) {
      if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
    }
  }

  const key = clientIp(req);
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return 0;
  }

  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
    return Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000));
  }
  return 0;
}

function requestHost(req: VercelRequest): string {
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
  return (host ?? req.headers.host ?? '').split(',')[0].trim().toLowerCase();
}

function isSameOrigin(req: VercelRequest): boolean {
  const origin = req.headers.origin;
  // Native apps, curl, and same-origin <form> posts may omit Origin. Browser
  // requests that do send it must belong to the host serving this function.
  if (!origin) return true;
  if (origin === 'null') return false;
  try {
    return new URL(origin).host.toLowerCase() === requestHost(req);
  } catch {
    return false;
  }
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  res.end(JSON.stringify(body));
}

class PayloadTooLargeError extends Error {
  constructor() {
    super('Request body is too large.');
    this.name = 'PayloadTooLargeError';
  }
}

async function readJsonBody(req: VercelRequest): Promise<unknown> {
  // Vercel's Node runtime may pre-parse JSON bodies into req.body.
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      if (Buffer.byteLength(req.body, 'utf8') > MAX_BODY_BYTES) {
        throw new PayloadTooLargeError();
      }
      return JSON.parse(req.body) as unknown;
    }
    if (Buffer.isBuffer(req.body)) {
      if (req.body.byteLength > MAX_BODY_BYTES) {
        throw new PayloadTooLargeError();
      }
      return JSON.parse(req.body.toString('utf8')) as unknown;
    }
    if (typeof req.body === 'object') {
      return req.body;
    }
  }

  // The stream may already be consumed (and discarded) by the platform's body
  // parser when the payload was malformed. Do not wait for an `end` event that
  // already fired.
  if (req.readableEnded) {
    throw new SyntaxError('Invalid JSON body.');
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new PayloadTooLargeError());
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? (JSON.parse(raw) as unknown) : {});
      } catch {
        reject(new SyntaxError('Invalid JSON body.'));
      }
    });

    req.on('error', reject);
  });
}

export default async function handler(
  req: VercelRequest,
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
    const body = await readJsonBody(req);
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

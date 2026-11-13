import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Small HTTP helpers shared by the community adapters. The chat adapter keeps
 * its own copy so the existing Gemini pipeline stays untouched.
 */

export interface JsonRequest extends IncomingMessage {
  body?: unknown;
  socket: IncomingMessage['socket'] & { remoteAddress?: string };
}

export class PayloadTooLargeError extends Error {
  constructor() {
    super('Request body is too large.');
    this.name = 'PayloadTooLargeError';
  }
}

export async function readJsonBody(
  req: JsonRequest,
  maxBytes: number,
): Promise<unknown> {
  // Vercel's Node runtime may pre-parse JSON bodies into req.body.
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      if (Buffer.byteLength(req.body, 'utf8') > maxBytes) {
        throw new PayloadTooLargeError();
      }
      return JSON.parse(req.body) as unknown;
    }
    if (Buffer.isBuffer(req.body)) {
      if (req.body.byteLength > maxBytes) {
        throw new PayloadTooLargeError();
      }
      return JSON.parse(req.body.toString('utf8')) as unknown;
    }
    if (typeof req.body === 'object') {
      return req.body;
    }
  }

  // The stream may already be consumed (and discarded) by the platform's body
  // parser when the payload was malformed.
  if (req.readableEnded) {
    throw new SyntaxError('Invalid JSON body.');
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
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

function requestHost(req: JsonRequest): string {
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
  return (host ?? req.headers.host ?? '').split(',')[0].trim().toLowerCase();
}

export function isSameOrigin(req: JsonRequest): boolean {
  const origin = req.headers.origin;
  // Native apps, curl, and same-origin <form> posts may omit Origin.
  if (!origin) return true;
  if (origin === 'null') return false;
  try {
    return new URL(origin).host.toLowerCase() === requestHost(req);
  } catch {
    return false;
  }
}

export function getClientIp(req: JsonRequest): string {
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

export function sendJson(
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

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

/**
 * Best-effort per-instance guard. Serverless instances do not share memory, so
 * this is a speed bump; the durable per-UID limits live in Firestore.
 */
export function createIpRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
}): (req: JsonRequest) => number {
  const buckets = new Map<string, RateLimitBucket>();

  return (req: JsonRequest) => {
    const now = Date.now();
    if (buckets.size > 5_000) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
    }

    const key = getClientIp(req);
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return 0;
    }

    bucket.count += 1;
    if (bucket.count > options.maxRequests) {
      return Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000));
    }
    return 0;
  };
}

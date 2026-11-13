import type { ServerResponse } from 'node:http';
import { ChatValidationError } from '../server/chat.ts';
import {
  createIpRateLimiter,
  isSameOrigin,
  PayloadTooLargeError,
  readRawBody,
  sendJson,
  type JsonRequest,
} from '../server/http.ts';
import { MultipartError, parseMultipartForm } from '../server/multipart.ts';
import {
  MAX_VOICE_AUDIO_BYTES,
  VoiceUnavailableError,
  VoiceValidationError,
  handleVoiceChat,
} from '../server/voice.ts';

/**
 * Vercel adapter for voice messages.
 *
 * The audio is uploaded as multipart/form-data so the browser never has to
 * base64-encode it. The body cap stays below Vercel's request-size limit.
 */

const MAX_BODY_BYTES = 3_500_000;
// 16 history turns of up to 4,000 characters plus JSON overhead must fit.
const MAX_FIELD_BYTES = 128 * 1024;

const isRateLimited = createIpRateLimiter({
  windowMs: 60_000,
  // Transcription is more expensive than a text reply, so keep the
  // best-effort per-instance guard tighter than the text endpoint.
  maxRequests: 8,
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
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    sendJson(res, 415, {
      error: 'Content-Type must be multipart/form-data.',
    });
    return;
  }

  const contentLength = Number(req.headers['content-length'] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    sendJson(res, 413, { error: 'The voice message is too large.' });
    return;
  }

  const retryAfter = isRateLimited(req);
  if (retryAfter > 0) {
    sendJson(
      res,
      429,
      { error: 'Too many voice messages. Please wait a moment and try again.' },
      { 'Retry-After': String(retryAfter) },
    );
    return;
  }

  try {
    const body = await readRawBody(req, MAX_BODY_BYTES);
    const form = parseMultipartForm(body, contentType, {
      maxFileBytes: MAX_VOICE_AUDIO_BYTES,
      maxFieldBytes: MAX_FIELD_BYTES,
      maxFiles: 1,
    });
    const result = await handleVoiceChat(form, {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL,
    });
    sendJson(res, 200, result);
  } catch (error) {
    if (
      error instanceof VoiceValidationError ||
      error instanceof ChatValidationError ||
      error instanceof MultipartError ||
      error instanceof SyntaxError
    ) {
      sendJson(res, 400, { error: error.message });
      return;
    }
    if (error instanceof PayloadTooLargeError) {
      sendJson(res, 413, { error: 'The voice message is too large.' });
      return;
    }
    if (error instanceof VoiceUnavailableError) {
      sendJson(res, 503, { error: error.message });
      return;
    }

    console.error('[higala] Vercel voice function error:', error);
    sendJson(res, 500, {
      error: 'The support service is unavailable right now.',
    });
  }
}

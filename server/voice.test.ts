/**
 * Targeted tests for the voice transcription guards. These exercise the
 * pure helpers that decide whether a transcription response is trustworthy
 * enough to hand to the chat flow, plus the audio-container and duration
 * parsers. The Gemini client itself is not called, so no API key is needed.
 *
 * Run with Node's TypeScript stripping:
 *   node --experimental-strip-types --import ./server/voice.test.ts
 */

import assert from 'node:assert';
import {
  assertCleanFinish,
  assertTranscriptionCompleted,
  detectAudioMimeType,
  handleVoiceChat,
  parseDurationMs,
  VoiceValidationError,
} from './voice.ts';

let passed = 0;
let failed = 0;

const pendingTests: Promise<void>[] = [];

function test(name: string, fn: () => void | Promise<void>): void {
  pendingTests.push(
    (async () => {
      try {
        await fn();
        passed += 1;
        console.log(`ok - ${name}`);
      } catch (error) {
        failed += 1;
        console.error(`not ok - ${name}`);
        console.error(error instanceof Error ? error.message : String(error));
      }
    })(),
  );
}

function rejects(fn: () => void, message?: string): void {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  assert.ok(threw, message ?? 'expected an error');
}

// --- Interaction status -----------------------------------------------------

test('completed status is accepted', () => {
  assertTranscriptionCompleted('completed');
});

for (const status of ['incomplete', 'requires_continuation', 'in_progress', 'failed', 'cancelled', 'budget_exceeded', 'queued', 'requires_action', '']) {
  test(`non-completed status ${JSON.stringify(status)} is rejected`, () => {
    rejects(() => assertTranscriptionCompleted(status));
  });
}

test('an unknown future status string is rejected', () => {
  rejects(() => assertTranscriptionCompleted('some_future_status'));
});

test('undefined status is rejected', () => {
  rejects(() => assertTranscriptionCompleted(undefined));
});

// --- Finish reason ----------------------------------------------------------

test('STOP and unspecified finish reasons are accepted', () => {
  assertCleanFinish('STOP');
  assertCleanFinish('FINISH_REASON_UNSPECIFIED');
  assertCleanFinish(undefined);
});

for (const reason of ['MAX_TOKENS', 'SAFETY', 'RECITATION', 'LANGUAGE', 'OTHER', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'MALFORMED_FUNCTION_CALL', 'IMAGE_SAFETY', 'UNEXPECTED_TOOL_CALL', 'TOO_MANY_TOOL_CALLS', 'IMAGE_PROHIBITED_CONTENT', 'NO_IMAGE', 'IMAGE_RECITATION', 'IMAGE_OTHER']) {
  test(`unsafe finish reason ${reason} is rejected`, () => {
    rejects(() => assertCleanFinish(reason));
  });
}

// --- Duration parsing -------------------------------------------------------

test('valid duration is parsed and floored', () => {
  assert.strictEqual(parseDurationMs('123456'), 123456);
  assert.strictEqual(parseDurationMs('45.9'), 45);
  assert.strictEqual(parseDurationMs('0'), 0);
});

test('missing, empty, NaN, Infinity, and negative values become zero', () => {
  assert.strictEqual(parseDurationMs(undefined), 0);
  assert.strictEqual(parseDurationMs(''), 0);
  assert.strictEqual(parseDurationMs('abc'), 0);
  assert.strictEqual(parseDurationMs('NaN'), 0);
  assert.strictEqual(parseDurationMs('Infinity'), 0);
  assert.strictEqual(parseDurationMs('-Infinity'), 0);
  assert.strictEqual(parseDurationMs('-5000'), 0);
});

test('a huge duration is still parsed (the size limit is the real guard)', () => {
  assert.strictEqual(parseDurationMs('999999999'), 999_999_999);
});

// --- Audio container detection ---------------------------------------------

test('WebM, OGG, WAV, and MP3 are detected', () => {
  assert.strictEqual(detectAudioMimeType(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00])), 'audio/webm');
  assert.strictEqual(detectAudioMimeType(Buffer.from('OggS' + 'x'.repeat(20))), 'audio/ogg');
  assert.strictEqual(detectAudioMimeType(Buffer.from('RIFF' + 'xxxx' + 'WAVE' + 'x'.repeat(20))), 'audio/wav');
  assert.strictEqual(detectAudioMimeType(Buffer.from([0xff, 0xe3, 0x00])), 'audio/mpeg');
  assert.strictEqual(detectAudioMimeType(Buffer.from('ID3' + 'x'.repeat(20))), 'audio/mpeg');
});

test('an audio MP4/M4A file is detected', () => {
  // Real MP4 files have a 4-byte box-size prefix before the `ftyp` box type,
  // so the major brand sits at bytes 8-12.
  const data = Buffer.from('\x00\x00\x00\x18ftypM4A ' + 'x'.repeat(20));
  assert.strictEqual(detectAudioMimeType(data), 'audio/m4a');
});

test('a video-only MP4 (M4V brand) is rejected', () => {
  const data = Buffer.from('\x00\x00\x00\x18ftypM4V ' + 'x'.repeat(20));
  assert.strictEqual(detectAudioMimeType(data), null);
});

test('generic ISO base-media brands (used by video MP4s) are rejected', () => {
  for (const brand of ['isom', 'mp42', 'mp41']) {
    const data = Buffer.from('\x00\x00\x00\x18ftyp' + brand + 'x'.repeat(20));
    assert.strictEqual(detectAudioMimeType(data), null, `brand ${brand} should be rejected`);
  }
});

test('a truncated ftyp box is rejected', () => {
  const data = Buffer.from('\x00\x00\x00\x18ftyp');
  assert.strictEqual(detectAudioMimeType(data), null);
});

test('unknown bytes are rejected', () => {
  assert.strictEqual(detectAudioMimeType(Buffer.from([0x00, 0x01, 0x02, 0x03])), null);
  assert.strictEqual(detectAudioMimeType(Buffer.alloc(4)), null);
});

function box(type: string, payload: Buffer): Buffer {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(8 + payload.length, 0);
  header.write(type, 4, 4, 'ascii');
  return Buffer.concat([header, payload]);
}

// --- MP4 brand handling (common M4A recordings) ----------------------------

test('an MP4 that lists an audio brand among compatible brands is accepted', () => {
  // Generic major brand (isom) but M4A listed as a compatible brand.
  const data = Buffer.from('\x00\x00\x00\x1cftypisom\x00\x00\x00\x00M4A mp42isom' + 'x'.repeat(4));
  assert.strictEqual(detectAudioMimeType(data), 'audio/m4a');
});

test('an audio-only MP4 with only generic brands is accepted via its track list', () => {
  // Build a minimal ftyp (generic brand) + moov with a single audio track.
  const ftyp = Buffer.from('\x00\x00\x00\x14ftypisom\x00\x00\x00\x00isom');
  const hdlrPayload = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x00]), // version + flags
    Buffer.from([0x00, 0x00, 0x00, 0x00]), // pre_defined
    Buffer.from('soun'), // handler_type
    Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), // reserved
    Buffer.from([0x00]), // name
  ]);
  const hdlrBox = box('hdlr', hdlrPayload);
  const mdiaBox = box('mdia', hdlrBox);
  const trakBox = box('trak', mdiaBox);
  const moovBox = box('moov', trakBox);
  const data = Buffer.concat([ftyp, moovBox]);
  assert.strictEqual(detectAudioMimeType(data), 'audio/m4a');
});

test('an MP4 with a video track is rejected even with generic brands', () => {
  const ftyp = Buffer.from('\x00\x00\x00\x14ftypisom\x00\x00\x00\x00isom');
  const makeTrak = (handler: string) => {
    const hdlrPayload = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      Buffer.from(handler),
      Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
      Buffer.from([0x00]),
    ]);
    return box('trak', box('mdia', box('hdlr', hdlrPayload)));
  };
  const moovBox = box('moov', Buffer.concat([makeTrak('vide'), makeTrak('soun')]));
  const data = Buffer.concat([ftyp, moovBox]);
  assert.strictEqual(detectAudioMimeType(data), null);
});

// --- Duration validation (fail closed) --------------------------------------

function makeWebmBuffer(): Buffer {
  return Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(512)]);
}

function durationForm(durationMs?: string) {
  const fields: Record<string, string> = { language: 'en' };
  if (durationMs !== undefined) fields.durationMs = durationMs;
  return {
    fields,
    files: [
      {
        field: 'audio',
        filename: 'rec.webm',
        mimeType: 'audio/webm',
        data: makeWebmBuffer(),
      },
    ],
  };
}

async function expectVoiceValidationError(durationMs: string | undefined) {
  let thrown: unknown;
  try {
    await handleVoiceChat(durationForm(durationMs) as any);
  } catch (error) {
    thrown = error;
  }
  assert.ok(
    thrown instanceof VoiceValidationError,
    `expected VoiceValidationError, got ${thrown}`,
  );
}

test('missing duration metadata rejects the request', async () => {
  await expectVoiceValidationError(undefined);
});

test('empty duration metadata rejects the request', async () => {
  await expectVoiceValidationError('');
});

test('non-numeric duration metadata rejects the request', async () => {
  await expectVoiceValidationError('abc');
});

test('NaN duration metadata rejects the request', async () => {
  await expectVoiceValidationError('NaN');
});

test('Infinity duration metadata rejects the request', async () => {
  await expectVoiceValidationError('Infinity');
});

test('negative duration metadata rejects the request', async () => {
  await expectVoiceValidationError('-5000');
});

test('zero duration metadata rejects the request', async () => {
  await expectVoiceValidationError('0');
});

test('an excessively long duration rejects the request', async () => {
  await expectVoiceValidationError(String(120_000 + 60_000));
});

await Promise.all(pendingTests);
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

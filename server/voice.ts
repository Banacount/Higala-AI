import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  ThinkingLevel,
  createPartFromBase64,
  createUserContent,
} from '@google/genai';
import {
  ChatValidationError,
  DEFAULT_MODEL,
  MAX_MESSAGE_CHARS,
  MAX_TOTAL_CHARS,
  handleChat,
  type ChatHandlerOptions,
} from './chat.ts';
import { PayloadTooLargeError } from './http.ts';
import type { MultipartFile, MultipartForm } from './multipart.ts';
import { buildDemoReply } from '../src/shared/demo.ts';
import { screenText } from '../src/shared/safety.ts';
import {
  MAX_VOICE_AUDIO_BYTES,
  isLanguage,
  isRiskLevel,
  maxRisk,
  type ChatApiRequest,
  type ChatTurn,
  type ChatVoiceApiResponse,
  type Language,
  type RiskLevel,
} from '../src/shared/types.ts';

export { MAX_VOICE_AUDIO_BYTES };

/** Dedicated speech-to-text model: lower latency and better dialect coverage. */
export const TRANSCRIBE_MODEL = 'gemini-3.5-transcribe';
const TRANSCRIBE_FALLBACK_MODEL = DEFAULT_MODEL;

const MIN_VOICE_AUDIO_BYTES = 512;
const MAX_VOICE_RECORDING_MS = 120_000;
const MAX_VOICE_HISTORY = 16;
const MAX_TRANSCRIPT_CHARS = 4_000;
const MAX_TRANSCRIPT_OUTPUT_TOKENS = 2_048;
// One attempt per model. Voice messages run inside a 60 s Vercel function
// budget, and a second Gemini call on a slow or rate-limited request almost
// never helps; it is more likely to push the function over the edge.
const MAX_ATTEMPTS_PER_MODEL = 1;
const RETRY_DELAY_MS = 700;

const LANGUAGE_NAMES: Record<Language, string> = {
  ceb: 'Cebuano/Bisaya (Cagayan de Oro / Northern Mindanao)',
  fil: 'Filipino/Tagalog',
  en: 'English',
};

/**
 * Hints for the transcribe model, most likely language first. Listing all
 * three keeps Bisaya/Tagalog code-switching intact instead of forcing the
 * whole clip into one language. The model still detects the spoken language,
 * so the selector is only a prior, never a hard constraint.
 */
const LANGUAGE_HINTS: Record<Language, string[]> = {
  ceb: ['ceb', 'fil-PH', 'en-US'],
  fil: ['fil-PH', 'ceb', 'en-US'],
  en: ['en-US', 'fil-PH', 'ceb'],
};

const TRANSCRIPTION_PROMPT = `Transcribe the speech in this audio message.

The speaker may use English, Filipino/Tagalog, Cebuano/Bisaya, or a natural mix of them. Transcribe exactly what was said in the language actually spoken. Do not translate, summarize, correct, or add commentary. Keep natural code-switching.

Return only the transcript text. If there is no intelligible speech, return an empty string.`;

export class VoiceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceValidationError';
  }
}

export class VoiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceUnavailableError';
  }
}

export interface VoiceHandlerOptions extends ChatHandlerOptions {
  /** Optional override for the dedicated speech-to-text model. */
  transcribeModel?: string;
}

interface SupportedAudioFormat {
  mimeType: string;
  matches: (data: Buffer) => boolean;
}

function startsWith(data: Buffer, bytes: number[]): boolean {
  if (data.length < bytes.length) return false;
  return bytes.every((byte, index) => data[index] === byte);
}

function ascii(data: Buffer, start: number, end: number): string {
  return data.subarray(start, end).toString('ascii');
}

/**
 * MP4-family brands that carry audio. The `ftyp` box appears in every MP4
 * variant (video, images, metadata), so the brand helps decide whether an
 * MP4-family file is actually audio we will send to the transcription model.
 * Audio-specific brands are accepted directly: `M4A ` (Apple audio), `M4B `
 * (audiobook), and `M4R ` (ringtone). Generic ISO base-media brands such as
 * `isom`, `mp42`, and `mp41` are NOT sufficient on their own because video
 * files also use them, but a generic-brand file is still accepted when its
 * track list is audio-only (see `hasAudioOnlyMp4Tracks`), since many common
 * M4A recordings produced by non-Apple toolchains use a generic major brand.
 * Brands are case-sensitive per the spec.
 */
const AUDIO_MP4_BRANDS = new Set(['M4A ', 'M4B ', 'M4R ']);

/**
 * Returns true when `data` is an MP4-family container that carries audio and
 * no video track. Detection combines two lightweight signals so that common
 * legitimate M4A recordings are not rejected:
 *
 *  1. Any audio brand (`M4A `/`M4B `/`M4R `) appearing anywhere in the `ftyp`
 *     box's brand list (major brand or any compatible brand). Many files use a
 *     generic major brand (`isom`/`mp42`) but still list an audio brand among
 *     their compatible brands.
 *  2. An audio-only track list: the `moov` box contains at least one `trak`
 *     whose handler is `soun` and no `trak` whose handler is `vide`. This
 *     catches M4A files that use only generic brands.
 */
function isAudioMp4(data: Buffer): boolean {
  if (data.length <= 12 || ascii(data, 4, 8) !== 'ftyp') return false;

  // (1) Brand scan across the whole ftyp box.
  const boxSize = readBoxSize(data, 0);
  const ftypEnd = boxSize > 0 && boxSize <= data.length ? boxSize : Math.min(data.length, 64);
  for (let offset = 8; offset + 4 <= ftypEnd; offset += 4) {
    if (AUDIO_MP4_BRANDS.has(ascii(data, offset, offset + 4))) {
      return true;
    }
  }

  // (2) Audio-only track list.
  return hasAudioOnlyMp4Tracks(data);
}

function readBoxSize(data: Buffer, offset: number): number {
  if (offset + 8 > data.length) return 0;
  const size = data.readUInt32BE(offset);
  if (size === 1) {
    if (offset + 16 > data.length) return 0;
    // Extended size; clamp to a safe 32-bit range for our purposes.
    const high = data.readUInt32BE(offset + 8);
    const low = data.readUInt32BE(offset + 12);
    if (high !== 0) return data.length;
    return low;
  }
  return size;
}

function findBox(data: Buffer, type: string, start: number, end: number): { offset: number; size: number } | null {
  let offset = start;
  while (offset + 8 <= end) {
    const size = readBoxSize(data, offset);
    if (size < 8) return null;
    const boxEnd = offset + size;
    if (boxEnd > end) return null;
    if (ascii(data, offset + 4, offset + 8) === type) {
      return { offset, size };
    }
    if (size === 0) {
      // Box extends to end of container; stop scanning.
      break;
    }
    offset = boxEnd;
  }
  return null;
}

function hasAudioOnlyMp4Tracks(data: Buffer): boolean {
  const moov = findBox(data, 'moov', 0, data.length);
  if (!moov) return false;

  const moovStart = moov.offset + 8;
  const moovEnd = moov.offset + moov.size;
  let hasAudio = false;
  let hasVideo = false;
  let cursor = moovStart;
  while (cursor + 8 <= moovEnd) {
    const trak = findBox(data, 'trak', cursor, moovEnd);
    if (!trak) break;
    const handler = trackHandlerType(data, trak.offset, trak.offset + trak.size);
    if (handler === 'soun') hasAudio = true;
    if (handler === 'vide') hasVideo = true;
    cursor = trak.offset + trak.size;
    if (cursor <= trak.offset) break;
  }

  return hasAudio && !hasVideo;
}

function trackHandlerType(data: Buffer, trakStart: number, trakEnd: number): string | null {
  const mdia = findBox(data, 'mdia', trakStart + 8, trakEnd);
  if (!mdia) return null;
  const hdlr = findBox(data, 'hdlr', mdia.offset + 8, mdia.offset + mdia.size);
  if (!hdlr || hdlr.size < 24) return null;
  // handler_type sits 16 bytes into the hdlr box (8-byte header + version/flags
  // + pre_defined).
  const ho = hdlr.offset + 16;
  if (ho + 4 > data.length) return null;
  return ascii(data, ho, ho + 4);
}

const AUDIO_FORMATS: SupportedAudioFormat[] = [
  {
    // MediaRecorder in Chromium/Firefox: EBML header for WebM.
    mimeType: 'audio/webm',
    matches: (data) => startsWith(data, [0x1a, 0x45, 0xdf, 0xa3]),
  },
  {
    mimeType: 'audio/ogg',
    matches: (data) => ascii(data, 0, 4) === 'OggS',
  },
  {
    // Safari records AAC audio in an MP4/M4A container. The `ftyp` box is
    // shared by every MP4-family container (video, images, generic), so the
    // brand at bytes 8-12 must be an audio brand — otherwise a video MP4
    // would pass as `audio/m4a` and reach the transcription endpoint.
    mimeType: 'audio/m4a',
    matches: (data) => isAudioMp4(data),
  },
  {
    mimeType: 'audio/wav',
    matches: (data) =>
      data.length > 12 &&
      ascii(data, 0, 4) === 'RIFF' &&
      ascii(data, 8, 12) === 'WAVE',
  },
  {
    mimeType: 'audio/mpeg',
    matches: (data) =>
      ascii(data, 0, 3) === 'ID3' ||
      (data.length > 1 && data[0] === 0xff && (data[1] & 0xe0) === 0xe0),
  },
];

export function detectAudioMimeType(data: Buffer): string | null {
  return AUDIO_FORMATS.find((format) => format.matches(data))?.mimeType ?? null;
}

interface ValidatedAudio {
  data: Buffer;
  mimeType: string;
}

function validateAudio(file: MultipartFile): ValidatedAudio {
  if (file.data.byteLength < MIN_VOICE_AUDIO_BYTES) {
    throw new VoiceValidationError(
      'That recording is too short. Please hold the microphone a little longer.',
    );
  }
  if (file.data.byteLength > MAX_VOICE_AUDIO_BYTES) {
    throw new PayloadTooLargeError();
  }

  // Never trust the client's Content-Type. Detect the container from its
  // magic bytes and use only that value for the Gemini request.
  const mimeType = detectAudioMimeType(file.data);
  if (!mimeType) {
    throw new VoiceValidationError('The recording format is not supported.');
  }

  return { data: file.data, mimeType };
}

function parseLanguage(value: string | undefined): Language {
  if (!isLanguage(value)) {
    throw new VoiceValidationError('Unsupported language.');
  }
  return value;
}

function parseRiskLevel(value: string | undefined): RiskLevel {
  return isRiskLevel(value) ? value : 'none';
}

function parseHistory(value: string | undefined): ChatTurn[] {
  if (!value) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new VoiceValidationError('The conversation history is invalid.');
  }
  if (!Array.isArray(parsed)) {
    throw new VoiceValidationError('The conversation history is invalid.');
  }

  return parsed.slice(-MAX_VOICE_HISTORY).map((item, index): ChatTurn => {
    if (!item || typeof item !== 'object') {
      throw new VoiceValidationError(`History message ${index + 1} is invalid.`);
    }
    const record = item as Record<string, unknown>;
    if (record.role !== 'user' && record.role !== 'assistant') {
      throw new VoiceValidationError(`History message ${index + 1} is invalid.`);
    }
    if (typeof record.content !== 'string' || !record.content.trim()) {
      throw new VoiceValidationError(`History message ${index + 1} is empty.`);
    }
    return {
      role: record.role,
      content: record.content.trim().slice(0, MAX_MESSAGE_CHARS),
    };
  });
}

/**
 * Keeps the prompt inside the same budget `handleChat` enforces. Older turns
 * are dropped first so the newest context and the new transcript survive.
 */
function fitHistory(history: ChatTurn[], transcript: string): ChatTurn[] {
  const budget = MAX_TOTAL_CHARS - transcript.length;
  const kept: ChatTurn[] = [];
  let used = 0;

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const turn = history[index];
    if (used + turn.content.length > budget) break;
    kept.unshift(turn);
    used += turn.content.length;
  }

  return kept;
}

/**
 * Parses the client-supplied recording duration. The client's value is only
 * advisory — the real limit is the file size — but it must not be allowed to
 * carry NaN, Infinity, or a negative value past this check. A missing or
 * unparseable field is treated as zero here; the caller rejects a zero result
 * so that missing/invalid metadata cannot be used to bypass the duration
 * check.
 */
export function parseDurationMs(value: string | undefined): number {
  if (value === undefined || value === '') return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

/**
 * The only Interaction status that means the transcript is complete and
 * trustworthy. Everything else — including `incomplete` (e.g. the decode hit
 * `max_output_tokens`) and `requires_continuation` (a hop that stopped before
 * the output finished) — is a failure. Partial text from a non-completed
 * interaction must never reach the chat flow, so the check is an explicit
 * allow-list rather than a negation: a future unknown status string is
 * rejected instead of silently passing.
 */
const COMPLETED_INTERACTION_STATUS = 'completed' as const;

export function assertTranscriptionCompleted(status: string | undefined): void {
  if (status !== COMPLETED_INTERACTION_STATUS) {
    throw new Error(
      `Transcription did not complete (status: ${status ?? 'unset'}).`,
    );
  }
}

/**
 * Finish reasons that mean the model stopped for a reason other than a clean
 * end of output. `MAX_TOKENS` truncates the transcript mid-sentence; the
 * safety/recitation/block reasons mean the text is not a usable transcription.
 * `FINISH_REASON_UNSPECIFIED` and `STOP` are the only safe values for speech
 * output, and even then the status check above is the primary guard.
 */
const UNSAFE_FINISH_REASONS = new Set([
  'MAX_TOKENS',
  'SAFETY',
  'RECITATION',
  'LANGUAGE',
  'OTHER',
  'BLOCKLIST',
  'PROHIBITED_CONTENT',
  'SPII',
  'MALFORMED_FUNCTION_CALL',
  'IMAGE_SAFETY',
  'UNEXPECTED_TOOL_CALL',
  'TOO_MANY_TOOL_CALLS',
  'IMAGE_PROHIBITED_CONTENT',
  'NO_IMAGE',
  'IMAGE_RECITATION',
  'IMAGE_OTHER',
]);

export function assertCleanFinish(finishReason: string | undefined): void {
  if (!finishReason) return;
  if (UNSAFE_FINISH_REASONS.has(finishReason)) {
    throw new Error(
      `Transcription stopped early (finishReason: ${finishReason}).`,
    );
  }
}

function cleanTranscript(raw: string): string {
  let text = raw
    .trim()
    .replace(/^```(?:[a-z]+)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith('“') && text.endsWith('”'))
  ) {
    text = text.slice(1, -1).trim();
  }

  if (
    /^\[(no|unintelligible|inaudible)[^\]]*\]$/i.test(text) ||
    /^(no (clear |intelligible )?speech( detected)?|unintelligible audio)\.?$/i.test(
      text,
    )
  ) {
    return '';
  }

  return text.slice(0, MAX_TRANSCRIPT_CHARS);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRetryable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const status = (error as { status?: unknown }).status;
  // 429s are excluded: retrying them after a 700 ms pause compounds latency
  // inside the 60 s function budget and almost never succeeds.
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  return /UNAVAILABLE|high demand|deadline|timed? ?out|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(
    errorMessage(error),
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetries<T>(run: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS_PER_MODEL || !isRetryable(error)) {
        throw error;
      }
      await wait(RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError;
}

/**
 * Primary path: the dedicated ASR model, which is faster than a general chat
 * model and has explicit Cebuano (`ceb`) and Filipino (`fil-PH`) coverage.
 */
async function transcribeWithDedicatedModel(
  ai: GoogleGenAI,
  model: string,
  audio: ValidatedAudio,
  language: Language,
): Promise<string> {
  const response = await ai.interactions.create({
    model,
    input: [
      {
        type: 'audio',
        data: audio.data.toString('base64'),
        mime_type: audio.mimeType,
      },
    ],
    generation_config: {
      transcription_config: {
        // Hints, not a hard constraint: the model still detects the spoken
        // language and preserves intra-sentence code-switching.
        language_codes: LANGUAGE_HINTS[language],
        // 'verbatim' is the documented enum value for verbatim transcription
        // (vs. 'summarize'). Kept as a string literal so the API can tighten
        // the enum without a breaking change; see the Interactions API docs.
        mode: 'verbatim',
      },
    },
    // Voice recordings are transient; do not retain them for later retrieval.
    store: false,
  });

  // The Interactions API merges continuation hops automatically, so a
  // non-completed status (e.g. `incomplete` after max_output_tokens, or
  // `requires_continuation`) can still carry partial `output_text`. Reject
  // those explicitly so partial text never reaches the chat flow.
  assertTranscriptionCompleted(response.status);

  return cleanTranscript(response.output_text ?? '');
}

/**
 * Fallback for environments where the dedicated model is unavailable. It is
 * slower, but keeps voice messages working instead of failing outright.
 */
async function transcribeWithModel(
  ai: GoogleGenAI,
  model: string,
  audio: ValidatedAudio,
  language: Language,
): Promise<string> {
  const response = await ai.models.generateContent({
    model,
    contents: createUserContent([
      createPartFromBase64(audio.data.toString('base64'), audio.mimeType),
      `${TRANSCRIPTION_PROMPT}\n\nThe app's current language setting is ${LANGUAGE_NAMES[language]}; the speaker may still speak any of the languages above. Transcribe the speech exactly as spoken.`,
    ]),
    config: {
      systemInstruction:
        'You are a precise speech-to-text transcriber. Preserve the language and wording of the speaker. Never translate or answer the speaker.',
      temperature: 0.1,
      maxOutputTokens: MAX_TRANSCRIPT_OUTPUT_TOKENS,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      // Voice content is sensitive; opt out of request/response logging.
      store: false,
      // Crisis language must reach the safety pipeline instead of being
      // silently dropped by the transcription model.
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    },
  });

  // The fallback path has no interaction status, so guard on the candidate's
  // finish reason instead. A truncated transcript (MAX_TOKENS) or a
  // safety/recitation stop is not a usable transcription.
  const firstCandidate = response.candidates?.[0];
  assertCleanFinish(firstCandidate?.finishReason);

  return cleanTranscript(response.text ?? '');
}

async function transcribe(
  audio: ValidatedAudio,
  language: Language,
  options: VoiceHandlerOptions,
): Promise<string> {
  if (!options.apiKey) {
    throw new VoiceUnavailableError(
      'Voice messages need the live support service, which is not configured.',
    );
  }

  const dedicatedModel = options.transcribeModel?.trim() || TRANSCRIBE_MODEL;
  // The Interactions API (used by gemini-3.5-transcribe) is served from
  // v1beta; the SDK defaults to v1 for the Gemini API.
  const ai = new GoogleGenAI({
    apiKey: options.apiKey,
    httpOptions: { apiVersion: 'v1beta' },
  });

  try {
    return await withRetries(() =>
      transcribeWithDedicatedModel(ai, dedicatedModel, audio, language),
    );
  } catch (error) {
    // Never log the audio bytes or the transcript. The model name and
    // provider error are enough to diagnose a failure.
    console.error(
      `[higala] Gemini transcription failed (${dedicatedModel}); falling back to ${TRANSCRIBE_FALLBACK_MODEL}:`,
      errorMessage(error),
    );
  }

  try {
    return await withRetries(() =>
      transcribeWithModel(ai, TRANSCRIBE_FALLBACK_MODEL, audio, language),
    );
  } catch (error) {
    console.error(
      `[higala] Gemini transcription fallback failed (${TRANSCRIBE_FALLBACK_MODEL}):`,
      errorMessage(error),
    );
  }

  throw new VoiceUnavailableError(
    'Higala could not process the voice message right now. Please try again.',
  );
}

export async function handleVoiceChat(
  form: MultipartForm,
  options: VoiceHandlerOptions = {},
): Promise<ChatVoiceApiResponse> {
  const audioFile = form.files.find((file) => file.field === 'audio');
  if (!audioFile) {
    throw new VoiceValidationError('An audio recording is required.');
  }

  const declaredDuration = parseDurationMs(form.fields.durationMs);
  // A missing/invalid/non-finite/non-positive duration parses to 0. Treating
  // that as "unknown" would let a client omit or falsify `durationMs` and slip
  // past the maximum-recording check, so reject it instead of accepting it.
  // The file-size limit remains the backstop for the actual payload, but the
  // declared duration must be present and plausible.
  if (declaredDuration <= 0) {
    throw new VoiceValidationError('A recording duration is required.');
  }
  if (declaredDuration > MAX_VOICE_RECORDING_MS + 5_000) {
    throw new VoiceValidationError(
      'That recording is too long. Keep voice messages under two minutes.',
    );
  }

  const language = parseLanguage(form.fields.language);
  const riskLevel = parseRiskLevel(form.fields.riskLevel);
  const history = parseHistory(form.fields.messages);
  const audio = validateAudio(audioFile);
  const transcript = await transcribe(audio, language, options);

  if (!transcript) {
    throw new VoiceValidationError(
      'No speech was detected in that recording. Please try again.',
    );
  }

  const mode =
    form.fields.mode === 'honest' || form.fields.mode === 'friendly'
      ? form.fields.mode
      : 'friendly';

  const request: ChatApiRequest = {
    messages: [
      ...fitHistory(history, transcript),
      { role: 'user', content: transcript },
    ],
    language,
    riskLevel,
    mode,
  };

  try {
    const response = await handleChat(request, options);
    return { ...response, transcript };
  } catch (error) {
    if (error instanceof ChatValidationError) {
      throw new VoiceValidationError(error.message);
    }

    // Transcription already succeeded, so keep the transcript instead of
    // asking the user to record again. Screen the spoken text so a crisis
    // phrase still gets the crisis reply, then mark it as demo content so the
    // UI can explain the degradation.
    const fallbackRisk = maxRisk(riskLevel, screenText(transcript).level);
    const fallback = buildDemoReply({
      text: transcript,
      language,
      riskLevel: fallbackRisk,
    });
    return { ...fallback, transcript, demo: true };
  }
}

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
const MAX_ATTEMPTS_PER_MODEL = 2;
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
    // Safari records AAC audio in an MP4/M4A container.
    mimeType: 'audio/m4a',
    matches: (data) => data.length > 12 && ascii(data, 4, 8) === 'ftyp',
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

function detectAudioMimeType(data: Buffer): string | null {
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
  if (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
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
        mode: 'verbatim',
      },
    },
    // Voice recordings are transient; do not retain them for later retrieval.
    store: false,
  });

  if (response.status !== 'completed') {
    throw new Error(`Transcription did not complete (${response.status}).`);
  }

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

  const declaredDuration = Number(form.fields.durationMs);
  if (
    Number.isFinite(declaredDuration) &&
    declaredDuration > MAX_VOICE_RECORDING_MS + 5_000
  ) {
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

  const request: ChatApiRequest = {
    messages: [
      ...fitHistory(history, transcript),
      { role: 'user', content: transcript },
    ],
    language,
    riskLevel,
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

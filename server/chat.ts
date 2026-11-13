import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  ThinkingLevel,
  Type,
} from '@google/genai';
import { buildDemoReply } from '../src/shared/demo.ts';
import { buildSystemPrompt } from '../src/shared/prompts.ts';
import { screenText } from '../src/shared/safety.ts';
import {
  isLanguage,
  isRiskLevel,
  maxRisk,
  TOOL_IDS,
  type ChatApiRequest,
  type ChatApiResponse,
  type ChatTurn,
  type RiskLevel,
  type ToolId,
} from '../src/shared/types.ts';

export const DEFAULT_MODEL = 'gemini-3.5-flash';
export const FALLBACK_MODEL = 'gemini-3.5-flash-lite';
const MAX_ATTEMPTS_PER_MODEL = 2;
const RETRY_DELAY_MS = 700;
const MAX_MESSAGES = 20;
export const MAX_MESSAGE_CHARS = 4_000;
export const MAX_TOTAL_CHARS = 24_000;
const MAX_OUTPUT_TOKENS = 900;

export class ChatValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatValidationError';
  }
}

export interface ChatHandlerOptions {
  apiKey?: string;
  model?: string;
}

function parseMessages(value: unknown): ChatTurn[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ChatValidationError('A conversation is required.');
  }
  if (value.length > MAX_MESSAGES) {
    throw new ChatValidationError(`Too many messages (max ${MAX_MESSAGES}).`);
  }

  let total = 0;
  const messages = value.map((item, index): ChatTurn => {
    if (!item || typeof item !== 'object') {
      throw new ChatValidationError(`Message ${index + 1} is invalid.`);
    }
    const record = item as Record<string, unknown>;
    const role = record.role;
    const content = record.content;

    if (role !== 'user' && role !== 'assistant') {
      throw new ChatValidationError(`Message ${index + 1} has an invalid role.`);
    }
    if (typeof content !== 'string' || !content.trim()) {
      throw new ChatValidationError(`Message ${index + 1} is empty.`);
    }
    if (content.length > MAX_MESSAGE_CHARS) {
      throw new ChatValidationError(
        `A message is too long (max ${MAX_MESSAGE_CHARS} characters).`,
      );
    }

    total += content.length;
    return { role, content: content.trim() };
  });

  if (total > MAX_TOTAL_CHARS) {
    throw new ChatValidationError('The conversation is too long.');
  }
  if (messages[messages.length - 1].role !== 'user') {
    throw new ChatValidationError('The last message must be from the user.');
  }

  return messages;
}

export function validateChatRequest(payload: unknown): ChatApiRequest {
  if (!payload || typeof payload !== 'object') {
    throw new ChatValidationError('Invalid request body.');
  }

  const record = payload as Record<string, unknown>;
  if (!isLanguage(record.language)) {
    throw new ChatValidationError('Unsupported language.');
  }

  const messages = parseMessages(record.messages);
  const riskLevel: RiskLevel = isRiskLevel(record.riskLevel)
    ? record.riskLevel
    : 'none';

  return {
    messages,
    language: record.language,
    riskLevel,
  };
}

function toGeminiContents(messages: ChatTurn[]) {
  const merged: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> =
    [];

  for (const message of messages) {
    const role = message.role === 'assistant' ? 'model' : 'user';
    const last = merged[merged.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n\n${message.content}`;
    } else {
      merged.push({ role, parts: [{ text: message.content }] });
    }
  }

  return merged;
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function normaliseTool(value: unknown): ToolId {
  return typeof value === 'string' && TOOL_IDS.includes(value as ToolId)
    ? (value as ToolId)
    : 'none';
}

function normaliseModelResponse(
  raw: string,
  screenedRisk: RiskLevel,
  requestRisk: RiskLevel,
): ChatApiResponse {
  const parsed = parseJsonObject(raw);

  if (!parsed) {
    return {
      message: raw.trim(),
      challenge: '',
      suggestedTool: 'none',
      riskLevel: maxRisk(screenedRisk, requestRisk),
      demo: false,
    };
  }

  const message =
    typeof parsed.message === 'string' && parsed.message.trim()
      ? parsed.message.trim()
      : raw.trim();
  const challenge =
    typeof parsed.challenge === 'string' ? parsed.challenge.trim() : '';
  const modelRisk = isRiskLevel(parsed.riskLevel) ? parsed.riskLevel : 'none';

  return {
    message: message.slice(0, 6_000),
    challenge: challenge === message ? '' : challenge.slice(0, 400),
    suggestedTool: normaliseTool(parsed.suggestedTool),
    riskLevel: maxRisk(screenedRisk, maxRisk(requestRisk, modelRisk)),
    demo: false,
  };
}

function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

function isRetryable(error: unknown): boolean {
  const status = errorStatus(error);
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /UNAVAILABLE|high demand|deadline|timed? ?out|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(
    message,
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateOnce(
  ai: GoogleGenAI,
  model: string,
  request: ChatApiRequest,
  riskLevel: RiskLevel,
): Promise<string> {
  const response = await ai.models.generateContent({
    model,
    contents: toGeminiContents(request.messages),
    config: {
      systemInstruction: buildSystemPrompt(request.language, riskLevel),
      temperature: 0.85,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      // Gemini 3.5 supports thinking levels; minimal keeps chat replies fast
      // while leaving room for the structured JSON output.
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          message: {
            type: Type.STRING,
            description:
              'The natural friend-like reply. Usually one to four sentences; longer only when the moment genuinely needs room. No headings or bullet lists in ordinary conversation. Not every reply ends with a question.',
          },
          challenge: {
            type: Type.STRING,
            description:
              'Optional. One short, specific, respectful sentence of honesty, used only when it adds something the message did not already say. Omit or use an empty string otherwise. Never shame, moralise, or repeat the message.',
          },
          suggestedTool: {
            type: Type.STRING,
            enum: TOOL_IDS,
            description:
              'Optional. One structured tool to offer, only when it genuinely fits. Default to none.',
          },
          riskLevel: {
            type: Type.STRING,
            enum: ['none', 'watch', 'elevated', 'crisis'],
            description:
              'Conservative safety assessment of the user message. Safety takes priority over tone and candor.',
          },
        },
        required: ['message', 'riskLevel'],
      },
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

  const raw = response.text?.trim();
  if (!raw) {
    throw new Error(`Gemini returned an empty response (${model}).`);
  }
  return raw;
}

async function generateWithRetry(
  ai: GoogleGenAI,
  model: string,
  request: ChatApiRequest,
  riskLevel: RiskLevel,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt += 1) {
    try {
      return await generateOnce(ai, model, request, riskLevel);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS_PER_MODEL || !isRetryable(error)) {
        throw error;
      }
      console.warn(
        `[higala] Gemini ${model} attempt ${attempt} failed; retrying…`,
      );
      await wait(RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError;
}

export async function handleChat(
  payload: unknown,
  options: ChatHandlerOptions = {},
): Promise<ChatApiResponse> {
  const request = validateChatRequest(payload);
  const lastUserMessage =
    [...request.messages].reverse().find((message) => message.role === 'user')
      ?.content ?? '';
  const screen = screenText(lastUserMessage);
  const riskLevel = maxRisk(screen.level, request.riskLevel ?? 'none');

  if (!options.apiKey) {
    return buildDemoReply({
      text: lastUserMessage,
      language: request.language,
      riskLevel,
    });
  }

  const configuredModel = options.model?.trim() || DEFAULT_MODEL;
  const models = configuredModel === FALLBACK_MODEL
    ? [configuredModel]
    : [configuredModel, FALLBACK_MODEL];
  const ai = new GoogleGenAI({ apiKey: options.apiKey });

  for (const model of models) {
    try {
      const raw = await generateWithRetry(ai, model, request, riskLevel);
      return normaliseModelResponse(
        raw,
        screen.level,
        request.riskLevel ?? 'none',
      );
    } catch (error) {
      console.error(`[higala] Gemini request failed (${model}):`, error);
    }
  }

  // Every live model attempt failed. Do not quietly swap in a scripted reply:
  // the client surfaces the failure and labels any offline fallback clearly.
  throw new Error('Higala could not reach the live AI service.');
}

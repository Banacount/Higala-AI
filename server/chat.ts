import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
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

const DEFAULT_MODEL = 'gemini-3-flash-preview';
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_TOTAL_CHARS = 24_000;
const MAX_OUTPUT_TOKENS = 1_400;

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

  try {
    const ai = new GoogleGenAI({ apiKey: options.apiKey });
    const response = await ai.models.generateContent({
      model: options.model?.trim() || DEFAULT_MODEL,
      contents: toGeminiContents(request.messages),
      config: {
        systemInstruction: buildSystemPrompt(request.language, riskLevel),
        temperature: 0.9,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: {
              type: Type.STRING,
              description:
                'The friend-like reply, 100–220 words, ending with one clear question.',
            },
            challenge: {
              type: Type.STRING,
              description:
                'One gentle but direct sentence naming the hard truth. Empty string when inappropriate.',
            },
            suggestedTool: {
              type: Type.STRING,
              enum: TOOL_IDS,
              description: 'One structured tool to offer next, or none.',
            },
            riskLevel: {
              type: Type.STRING,
              enum: ['none', 'watch', 'elevated', 'crisis'],
              description: 'Conservative safety assessment of the user message.',
            },
          },
          required: ['message', 'challenge', 'suggestedTool', 'riskLevel'],
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
      throw new Error('Gemini returned an empty response.');
    }

    return normaliseModelResponse(
      raw,
      screen.level,
      request.riskLevel ?? 'none',
    );
  } catch (error) {
    console.error('[higala] Gemini request failed:', error);
    return buildDemoReply({
      text: lastUserMessage,
      language: request.language,
      riskLevel,
    });
  }
}

import type {
  ChatApiResponse,
  ChatMessage,
  ChatTurn,
  ChatVoiceApiResponse,
  Language,
  RiskLevel,
} from '@/shared/types';

export interface ChatRequestPayload {
  messages: ChatTurn[];
  language: Language;
  riskLevel: RiskLevel;
}

const MAX_TURNS = 16;

function toChatTurns(messages: ChatMessage[]): ChatTurn[] {
  // A voice message has no text until transcription finishes. Keep it in the
  // UI but never send an empty turn to the server.
  return messages
    .filter((message) => message.content.trim().length > 0)
    .slice(-MAX_TURNS)
    .map(({ role, content }) => ({ role, content }));
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `Request failed (${response.status}).`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) detail = body.error;
    } catch {
      // Ignore non-JSON error bodies.
    }
    throw new Error(detail);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('The support service is not available right now.');
  }

  return (await response.json()) as T;
}

export async function requestChat(
  messages: ChatMessage[],
  language: Language,
  riskLevel: RiskLevel,
): Promise<ChatApiResponse> {
  const payload: ChatRequestPayload = {
    messages: toChatTurns(messages),
    language,
    riskLevel,
  };

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90_000),
  });

  return parseResponse<ChatApiResponse>(response);
}

export async function requestVoiceChat(
  audio: Blob,
  messages: ChatMessage[],
  language: Language,
  riskLevel: RiskLevel,
  durationMs: number,
): Promise<ChatVoiceApiResponse> {
  // Multipart avoids base64 inflation and keeps the audio a single in-memory
  // copy on both sides.
  const body = new FormData();
  body.append('audio', audio, 'voice-recording');
  body.append('messages', JSON.stringify(toChatTurns(messages)));
  body.append('language', language);
  body.append('riskLevel', riskLevel);
  body.append('durationMs', String(Math.max(0, Math.round(durationMs))));

  const response = await fetch('/api/voice-chat', {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(120_000),
  });

  return parseResponse<ChatVoiceApiResponse>(response);
}

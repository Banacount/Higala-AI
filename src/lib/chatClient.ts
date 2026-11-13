import type {
  ChatApiResponse,
  ChatMessage,
  ChatTurn,
  Language,
  RiskLevel,
} from '@/shared/types';

export interface ChatRequestPayload {
  messages: ChatTurn[];
  language: Language;
  riskLevel: RiskLevel;
}

export async function requestChat(
  messages: ChatMessage[],
  language: Language,
  riskLevel: RiskLevel,
): Promise<ChatApiResponse> {
  const payload: ChatRequestPayload = {
    messages: messages.slice(-16).map(({ role, content }) => ({ role, content })),
    language,
    riskLevel,
  };

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90_000),
  });

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

  return (await response.json()) as ChatApiResponse;
}

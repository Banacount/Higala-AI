import { useCallback, useMemo, useState } from 'react';
import { useApp, STORAGE_KEYS } from '@/context/AppContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { requestChat } from '@/lib/chatClient';
import { uid } from '@/lib/utils';
import { buildDemoReply } from '@/shared/demo';
import { screenText } from '@/shared/safety';
import {
  maxRisk,
  type ChatApiResponse,
  type ChatMessage,
  type RiskLevel,
} from '@/shared/types';

function initialRiskFrom(messages: ChatMessage[]): RiskLevel {
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.riskLevel);
  return lastAssistant?.riskLevel ?? 'none';
}

export function useChat() {
  const { profile } = useApp();
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>(
    STORAGE_KEYS.chat,
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(() =>
    initialRiskFrom(messages),
  );

  const demoMode = useMemo(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === 'assistant');
    return Boolean(lastAssistant?.demo);
  }, [messages]);

  const appendMessage = useCallback(
    (message: ChatMessage) => {
      setMessages((current) => [...current, message].slice(-80));
    },
    [setMessages],
  );

  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || loading) return;

      setError(null);
      const screen = screenText(text);
      const nextRisk = screen.level;
      setRiskLevel(nextRisk);

      const userMessage: ChatMessage = {
        id: uid(),
        role: 'user',
        content: text.slice(0, 4_000),
        createdAt: Date.now(),
      };

      const history = [...messages, userMessage];
      appendMessage(userMessage);
      setLoading(true);

      try {
        const response = await requestChat(
          history,
          profile.language,
          nextRisk,
        );
        const assistantMessage: ChatMessage = {
          id: uid(),
          role: 'assistant',
          content: response.message,
          challenge: response.challenge,
          suggestedTool: response.suggestedTool,
          riskLevel: response.riskLevel,
          demo: response.demo,
          createdAt: Date.now(),
        };
        appendMessage(assistantMessage);
        setRiskLevel(maxRisk(screen.level, response.riskLevel));
      } catch (caught) {
        const fallback: ChatApiResponse = buildDemoReply({
          text,
          language: profile.language,
          riskLevel: nextRisk,
        });
        appendMessage({
          id: uid(),
          role: 'assistant',
          content: fallback.message,
          challenge: fallback.challenge,
          suggestedTool: fallback.suggestedTool,
          riskLevel: fallback.riskLevel,
          demo: true,
          createdAt: Date.now(),
        });
        setRiskLevel(nextRisk);
        setError(
          caught instanceof Error
            ? caught.message
            : 'The live service is unavailable, so Higala used an offline response.',
        );
      } finally {
        setLoading(false);
      }
    },
    [appendMessage, loading, messages, profile.language],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setRiskLevel('none');
    setError(null);
    setLoading(false);
  }, [setMessages]);

  return {
    messages,
    loading,
    error,
    riskLevel,
    demoMode,
    send,
    reset,
    dismissError: () => setError(null),
  };
}

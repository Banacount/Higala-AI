import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp, STORAGE_KEYS } from '@/context/AppContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { requestChat, requestVoiceChat } from '@/lib/chatClient';
import { uid } from '@/lib/utils';
import { buildDemoReply } from '@/shared/demo';
import { screenText } from '@/shared/safety';
import {
  maxRisk,
  type ChatApiResponse,
  type ChatMessage,
  type ChatVoice,
  type RiskLevel,
} from '@/shared/types';

const MAX_STORED_MESSAGES = 80;

function initialRiskFrom(messages: ChatMessage[]): RiskLevel {
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.riskLevel);
  return lastAssistant?.riskLevel ?? 'none';
}

function revokeVoiceUrl(message: ChatMessage): void {
  if (message.kind !== 'voice' || !message.voice?.url) return;
  if (typeof URL.revokeObjectURL !== 'function') return;
  URL.revokeObjectURL(message.voice.url);
}

function createVoiceUrl(blob: Blob): string {
  if (typeof URL.createObjectURL !== 'function') return '';
  try {
    return URL.createObjectURL(blob);
  } catch {
    return '';
  }
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
  // Guards against double-submits before React has re-rendered the disabled UI.
  const busyRef = useRef(false);
  // Bumped by `reset` so an in-flight request cannot repopulate a cleared chat.
  const epochRef = useRef(0);

  // A recording left in `processing` by a reload or crash can never finish,
  // because the audio was session-only. Mark it failed so the UI stops
  // showing a spinner forever (the transcript, if any, is kept).
  useEffect(() => {
    setMessages((current) => {
      let changed = false;
      const next = current.map((message) => {
        if (
          message.kind === 'voice' &&
          message.voice?.status === 'processing'
        ) {
          changed = true;
          return {
            ...message,
            voice: { ...message.voice, status: 'failed' as const },
          };
        }
        return message;
      });
      return changed ? next : current;
    });
  }, [setMessages]);

  const demoMode = useMemo(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === 'assistant');
    return Boolean(lastAssistant?.demo);
  }, [messages]);

  const appendMessage = useCallback(
    (message: ChatMessage) => {
      setMessages((current) => {
        const next = [...current, message];
        if (next.length <= MAX_STORED_MESSAGES) return next;
        next.slice(0, next.length - MAX_STORED_MESSAGES).forEach(revokeVoiceUrl);
        return next.slice(-MAX_STORED_MESSAGES);
      });
    },
    [setMessages],
  );

  const updateMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === id ? { ...message, ...patch } : message,
        ),
      );
    },
    [setMessages],
  );

  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || busyRef.current) return;

      busyRef.current = true;
      setError(null);
      const epoch = epochRef.current;
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
        // The conversation was reset while this request was in flight.
        if (epochRef.current !== epoch) return;
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
      } catch {
        if (epochRef.current !== epoch) return;
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
          'Live AI was unavailable, so Higala used an offline response. Your conversation is still saved on this device.',
        );
      } finally {
        if (epochRef.current === epoch) {
          busyRef.current = false;
          setLoading(false);
        }
      }
    },
    [appendMessage, messages, profile.language],
  );

  const sendVoice = useCallback(
    async (blob: Blob, durationMs: number) => {
      if (busyRef.current || blob.size === 0) return;

      busyRef.current = true;
      setError(null);
      setLoading(true);
      const epoch = epochRef.current;

      const voice: ChatVoice = {
        url: createVoiceUrl(blob),
        mimeType: blob.type || 'audio/webm',
        durationMs: Math.max(0, Math.round(durationMs)),
        size: blob.size,
        status: 'processing',
      };
      const userMessage: ChatMessage = {
        id: uid(),
        role: 'user',
        kind: 'voice',
        content: '',
        voice,
        createdAt: Date.now(),
      };

      // Snapshot the existing history before the optimistic bubble is added.
      const history = messages;
      appendMessage(userMessage);

      try {
        const response = await requestVoiceChat(
          blob,
          history,
          profile.language,
          riskLevel,
          durationMs,
        );

        // The conversation was reset while this request was in flight.
        if (epochRef.current !== epoch) return;

        updateMessage(userMessage.id, {
          content: response.transcript,
          voice: { ...voice, status: 'ready' },
        });
        appendMessage({
          id: uid(),
          role: 'assistant',
          content: response.message,
          challenge: response.challenge,
          suggestedTool: response.suggestedTool,
          riskLevel: response.riskLevel,
          demo: response.demo,
          createdAt: Date.now(),
        });
        setRiskLevel(
          maxRisk(screenText(response.transcript).level, response.riskLevel),
        );
        if (response.demo) {
          setError(
            'Live AI was unavailable, so Higala transcribed your voice message and replied offline. Your conversation is still saved on this device.',
          );
        }
      } catch (caught) {
        if (epochRef.current !== epoch) return;
        updateMessage(userMessage.id, {
          voice: { ...voice, status: 'failed' },
        });
        setError(
          caught instanceof Error
            ? `Voice message: ${caught.message}`
            : 'Voice message: the recording could not be processed.',
        );
      } finally {
        if (epochRef.current === epoch) {
          busyRef.current = false;
          setLoading(false);
        }
      }
    },
    [
      appendMessage,
      messages,
      profile.language,
      riskLevel,
      updateMessage,
    ],
  );

  const reset = useCallback(() => {
    epochRef.current += 1;
    setMessages((current) => {
      current.forEach(revokeVoiceUrl);
      return [];
    });
    setRiskLevel('none');
    setError(null);
    setLoading(false);
    busyRef.current = false;
  }, [setMessages]);

  return {
    messages,
    loading,
    error,
    riskLevel,
    demoMode,
    send,
    sendVoice,
    reset,
    dismissError: () => setError(null),
  };
}

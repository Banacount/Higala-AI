import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Info, RotateCcw, ShieldCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useChat } from '@/hooks/useChat';
import { BrandMark } from '@/components/BrandMark';
import { CandorExplainer } from '@/components/CandorExplainer';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatCrisisStrip } from '@/components/chat/ChatCrisisStrip';
import { ChatEmptyState } from '@/components/chat/ChatEmptyState';
import { LanguagePicker } from '@/components/chat/LanguagePicker';
import { LANGUAGE_OPTIONS } from '@/lib/constants';

export function ChatPage() {
  const { profile, openCrisis } = useApp();
  const [searchParams] = useSearchParams();
  const [draft, setDraft] = useState(() => searchParams.get('prompt') ?? '');
  const [candorOpen, setCandorOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    loading,
    error,
    riskLevel,
    demoMode,
    send,
    sendVoice,
    reset,
    dismissError,
  } = useChat();

  const promptFromUrl = searchParams.get('prompt');

  useEffect(() => {
    if (promptFromUrl) setDraft(promptFromUrl);
  }, [promptFromUrl]);

  useEffect(() => {
    const pane = scrollRef.current;
    if (!pane) return;
    const behavior: ScrollBehavior = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
      ? 'auto'
      : 'smooth';
    // Scroll the message pane directly. `scrollIntoView` would also scroll the
    // page when the pane has no overflow, exposing blank space during replies.
    pane.scrollTo({ top: pane.scrollHeight, behavior });
  }, [messages.length, loading, error]);

  const language =
    LANGUAGE_OPTIONS.find((option) => option.value === profile.language) ??
    LANGUAGE_OPTIONS[0];

  const submit = () => {
    const text = draft;
    if (!text.trim() || loading) return;
    setDraft('');
    void send(text);
  };

  const pickSuggestion = (text: string) => {
    setDraft(text);
    window.requestAnimationFrame(() => {
      document.getElementById('chat-message')?.focus();
    });
  };

  const newChat = () => {
    if (messages.length > 0) {
      const confirmed = window.confirm(
        'Start a new conversation? This clears the chat saved on this device.',
      );
      if (!confirmed) return;
    }
    reset();
    setDraft('');
  };

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden lg:h-dvh">
      <header className="shrink-0 border-b border-pine-900/8 bg-cream">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative shrink-0">
              <BrandMark size={38} />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-cream bg-pine-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display text-lg font-semibold leading-none text-pine-950">
                  Higala
                </h1>
                {demoMode ? (
                  <span
                    className="rounded-full bg-sun-soft px-1.5 py-0.5 text-[0.5rem] font-extrabold uppercase tracking-[0.1em] text-[#8a6018]"
                    title="The latest reply came from the offline demo engine because a live Gemini reply was not available."
                  >
                    Demo
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-[0.6rem] font-semibold uppercase tracking-[0.11em] text-muted/70">
                Online · 24/7 · {language.label}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <LanguagePicker />
            <button
              type="button"
              onClick={newChat}
              aria-label="Start a new conversation"
              title="Start a new conversation"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-pine-900/10 bg-white/60 text-pine-800 transition hover:bg-white"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setCandorOpen(true)}
              aria-label="Why Higala does not just agree"
              title="Why Higala does not just agree"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-pine-900/10 bg-white/60 text-pine-800 transition hover:bg-white"
            >
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="scrollbar-thin relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-transparent via-transparent to-pine-50/45"
      >
        <div
          className="mx-auto flex w-full max-w-3xl flex-col px-4 py-5 sm:px-6 sm:py-7"
          aria-live="polite"
        >
          {messages.length === 0 && !loading ? (
            <ChatEmptyState onPick={pickSuggestion} />
          ) : null}

          <div className="space-y-5 pb-2">
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}

            {loading ? (
              <div className="flex gap-2.5 animate-fade-in sm:gap-3">
                <BrandMark size={30} className="mt-0.5 shrink-0" />
                <div>
                  <p className="mb-1 text-xs font-extrabold text-pine-950">
                    Higala
                  </p>
                  <div className="inline-flex items-center gap-1 rounded-[1.4rem] rounded-bl-[0.4rem] border border-pine-900/8 bg-white/80 px-4 py-3.5">
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-pine-500" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-pine-500" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-pine-500" />
                    <span className="sr-only">Higala is typing</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-sun/25 bg-sun-soft/80 px-3.5 py-2.5">
              <div className="flex items-start gap-2">
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#8a6018]"
                  aria-hidden="true"
                />
                <p className="text-[0.68rem] leading-relaxed text-[#72511a]">
                  {error}
                </p>
              </div>
              <button
                type="button"
                onClick={dismissError}
                className="shrink-0 rounded-full bg-white/60 px-2 py-1 text-[0.6rem] font-bold text-pine-800"
              >
                Dismiss
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-pine-900/8 bg-cream px-3 pb-2 pt-2.5 sm:px-6 sm:pb-3">
        <div className="mx-auto max-w-3xl">
          <ChatCrisisStrip riskLevel={riskLevel} />
          <ChatComposer
            draft={draft}
            onDraftChange={setDraft}
            onSend={submit}
            onSendVoice={(blob, durationMs) => {
              void sendVoice(blob, durationMs);
            }}
            loading={loading}
          />
          <p className="mt-1.5 text-center text-[0.58rem] leading-relaxed text-muted/55">
            Higala is peer support, not emergency care. If you are in danger,
            call{' '}
            <a className="font-bold text-clay underline" href="tel:911">
              911
            </a>{' '}
            or{' '}
            <a className="font-bold text-clay underline" href="tel:1553">
              1553
            </a>
            .{' '}
            <button
              type="button"
              onClick={openCrisis}
              className="font-bold text-pine-700 underline"
            >
              More help
            </button>
          </p>
        </div>
      </div>

      <CandorExplainer open={candorOpen} onClose={() => setCandorOpen(false)} />
    </div>
  );
}

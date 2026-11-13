import { useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowUpRight, Check, Copy } from 'lucide-react';
import type { ChatMessage } from '@/shared/types';
import { TOOL_DETAILS } from '@/lib/constants';
import { formatTime } from '@/lib/utils';
import { BrandMark } from '@/components/BrandMark';
import { ToolIcon } from '@/components/tools/ToolIcon';

export function ChatBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const tool =
    message.suggestedTool && message.suggestedTool !== 'none'
      ? TOOL_DETAILS[message.suggestedTool]
      : null;
  const toolHref =
    message.suggestedTool === 'mood-check'
      ? '/mood'
      : `/toolkit?tool=${message.suggestedTool}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access may be blocked; fail quietly.
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="flex max-w-[86%] flex-col items-end sm:max-w-[76%]">
          <div className="rounded-[1.4rem] rounded-br-[0.4rem] bg-pine-900 px-4 py-3 text-[0.94rem] leading-relaxed text-cream shadow-[0_12px_30px_-20px_rgba(7,37,28,.8)]">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <p className="mt-1 pr-1 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-muted/70">
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 animate-fade-up sm:gap-3">
      <div className="mt-0.5 shrink-0">
        <BrandMark size={30} />
      </div>
      <div className="min-w-0 max-w-[88%] sm:max-w-[80%]">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-extrabold text-pine-950">Higala</span>
          {message.demo ? (
            <span className="rounded-full bg-sun-soft px-1.5 py-0.5 text-[0.52rem] font-extrabold uppercase tracking-[0.12em] text-[#8a6018]">
              Demo
            </span>
          ) : null}
          <span className="text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-muted/60">
            {formatTime(message.createdAt)}
          </span>
        </div>

        <div className="rounded-[1.4rem] rounded-bl-[0.4rem] border border-pine-900/8 bg-white/80 px-4 py-3.5 shadow-[0_12px_40px_-30px_rgba(7,37,28,.5)]">
          <div className="prose-higala">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>

          {message.challenge ? (
            <p className="mt-2.5 border-l-2 border-sun/70 pl-3 text-[0.82rem] leading-relaxed text-pine-900/80">
              {message.challenge}
            </p>
          ) : null}

          {tool ? (
            <Link
              to={toolHref}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-pine-200 bg-pine-50 py-1.5 pl-2 pr-3 text-xs font-bold text-pine-800 transition hover:border-pine-300 hover:bg-pine-100"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pine-100 text-pine-700">
                <ToolIcon id={message.suggestedTool!} className="h-3.5 w-3.5" />
              </span>
              Try {tool.title} · {tool.duration}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        <div className="mt-1 flex items-center gap-3 pl-1">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-muted/55 transition hover:text-pine-700"
            aria-label="Copy message"
          >
            {copied ? (
              <Check className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Copy className="h-3 w-3" aria-hidden="true" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {message.riskLevel === 'crisis' || message.riskLevel === 'elevated' ? (
            <span className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-clay">
              Safety check
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

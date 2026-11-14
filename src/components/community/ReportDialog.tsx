import { useEffect, useState } from 'react';
import { CheckCircle2, Flag } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  reportPost as reportPostRequest,
  reportReply as reportReplyRequest,
} from '@/lib/communityClient';
import {
  COMMUNITY_REPORT_REASONS,
  type CommunityReportReason,
} from '@/shared/community';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export function ReportDialog({
  open,
  postId,
  replyId,
  onClose,
  onReported,
}: {
  open: boolean;
  postId: string;
  replyId?: string;
  onClose: () => void;
  onReported?: () => void;
}) {
  const { getIdToken } = useAuth();
  const [reason, setReason] = useState<CommunityReportReason>('harassment');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason('harassment');
    setDescription('');
    setSubmitting(false);
    setError(null);
    setSubmitted(false);
  }, [open]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (replyId) {
        await reportReplyRequest(
          { postId, replyId, reason, description: description.trim() },
          token,
        );
      } else {
        await reportPostRequest(
          { postId, reason, description: description.trim() },
          token,
        );
      }
      setSubmitted(true);
      onReported?.();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The report could not be sent.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Community safety"
      title={
        submitted
          ? 'Report received'
          : replyId
            ? 'Report this reply'
            : 'Report this post'
      }
      description={
        submitted
          ? 'Thank you for looking out for the community. A moderator will review this.'
          : 'Reports are private. The author will not see who reported them.'
      }
      footer={
        submitted ? (
          <Button onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        ) : (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={submitting}>
              <Flag className="h-4 w-4" aria-hidden="true" />
              {submitting ? 'Sending…' : 'Send report'}
            </Button>
          </div>
        )
      }
    >
      {submitted ? (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-100 text-pine-700 dark:bg-pine-800/80 dark:text-pine-200">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted dark:text-pine-200/75">
            If someone is in immediate danger, please call 911 or 1553. A report
            here is reviewed by a moderator, not an emergency service.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <fieldset>
            <legend className="text-[0.64rem] font-extrabold uppercase tracking-[0.16em] text-pine-700 dark:text-pine-300">
              {replyId ? 'What is wrong with this reply?' : 'What is wrong with this post?'}
            </legend>
            <div className="mt-2 space-y-2">
              {COMMUNITY_REPORT_REASONS.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm transition ${
                    reason === option.id
                      ? 'border-pine-700/40 bg-pine-50 text-pine-900 dark:border-pine-400/60 dark:bg-pine-800/70 dark:text-cream'
                      : 'border-pine-900/8 bg-white/60 text-ink/80 hover:bg-white dark:border-white/10 dark:bg-pine-950/60 dark:text-pine-100/85 dark:hover:border-pine-500/40 dark:hover:bg-pine-900/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={option.id}
                    checked={reason === option.id}
                    onChange={() => setReason(option.id)}
                    className="h-4 w-4 accent-pine-700 dark:accent-pine-400"
                  />
                  <span className="font-medium">{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-[0.64rem] font-extrabold uppercase tracking-[0.16em] text-pine-700 dark:text-pine-300">
              Anything else a moderator should know? (optional)
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={1_000}
              placeholder="Add a little context, without sharing anyone's private information."
              className="mt-2 w-full resize-none rounded-2xl border border-pine-900/12 bg-white/80 px-4 py-3 text-sm leading-relaxed text-ink outline-none transition placeholder:text-muted/70 focus:border-pine-600/50 focus:ring-2 focus:ring-pine-200 dark:border-white/12 dark:bg-pine-950/75 dark:text-cream dark:placeholder:text-pine-200/40 dark:focus:border-pine-400 dark:focus:ring-pine-500/25"
            />
          </label>

          {error ? (
            <p className="rounded-xl bg-clay-soft px-3 py-2 text-xs font-semibold text-clay dark:bg-clay/20 dark:text-[#f6b8a0]">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}

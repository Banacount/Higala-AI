import { HeartHandshake } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { COMMUNITY_GUIDELINES } from '@/shared/communityGuidelines';

export function CommunityGuidelinesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Community guidelines"
      title="How we keep this place safe"
      description="Higala is peer support, not a courtroom. These guidelines apply to every anonymous post."
      size="lg"
      footer={
        <Button onClick={onClose} className="w-full sm:w-auto">
          I understand
        </Button>
      }
    >
      <div className="space-y-3">
        {COMMUNITY_GUIDELINES.map((guideline, index) => (
          <div
            key={guideline.title}
            className="rounded-2xl border border-pine-900/8 bg-white/60 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine-100 text-[0.68rem] font-extrabold text-pine-700">
                {index + 1}
              </span>
              <div>
                <h3 className="text-sm font-bold text-pine-950">
                  {guideline.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {guideline.body}
                </p>
              </div>
            </div>
          </div>
        ))}
        <p className="flex items-start gap-2 rounded-2xl bg-sun-soft/70 px-4 py-3 text-xs leading-relaxed text-[#7a5a17]">
          <HeartHandshake
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          If someone is in immediate danger, use the crisis resources. Crisis is
          not a rule violation, and it is never a reason to shame someone here.
        </p>
      </div>
    </Modal>
  );
}

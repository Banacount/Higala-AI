import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Download,
  HeartPulse,
  Loader2,
  LockKeyhole,
  MessageCircle,
  Moon,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { STORAGE_KEYS, useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, PageShell, SafetyFooter } from '@/components/PageShell';
import { ThemePreferenceSelector } from '@/components/ThemeSwitch';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonStyles } from '@/components/ui/Button';
import { LANGUAGE_OPTIONS } from '@/lib/constants';
import { deleteMyCommunityData } from '@/lib/communityClient';
import { formatLongDate, initials, todayKey } from '@/lib/utils';

function readArray(key: string): unknown[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function SettingCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-pine-900/8 bg-white/72 p-5 shadow-lift dark:border-white/10 dark:bg-[#0e221b]/85 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pine-100 text-pine-700 dark:bg-pine-900/80 dark:text-pine-300">
          {icon}
        </span>
        <div>
          <h2 className="font-display text-xl font-semibold leading-tight text-pine-950 dark:text-cream">
            {title}
          </h2>
          <p className="mt-0.5 text-[0.7rem] leading-relaxed text-muted dark:text-pine-200/70">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-pine-900/6 bg-cream/70 p-3 dark:border-white/10 dark:bg-pine-950/60">
      <p className="font-display text-2xl font-semibold leading-none text-pine-900 dark:text-cream">
        {value}
      </p>
      <p className="mt-1 text-[0.56rem] font-extrabold uppercase tracking-[0.1em] text-pine-600 dark:text-pine-300">
        {label}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[0.56rem] leading-relaxed text-muted/60 dark:text-pine-200/55">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const PRIVACY_POINTS = [
  {
    title: 'Chat goes to Gemini only when live AI is on',
    body: 'Your messages are sent to Google’s Gemini API to generate a reply. The API key stays on the server, never in this browser. With no key configured, Higala uses offline demo responses.',
  },
  {
    title: 'Your personal Higala data stays on this device',
    body: 'Your profile, mood check-ins, thought records, safety plan, and chat history are stored in this browser’s localStorage. They are not sent to Anonymous Sharing and are not synced to another device.',
  },
  {
    title: 'Anonymous Sharing uses a private anonymous account',
    body: 'Community posts and reports are stored in Higala’s Firebase database and linked only to a random anonymous account ID. Your name, local profile, chat, moods, and safety plan are never attached. Platform operators, infrastructure providers, and legally required disclosures may still be able to link content to that anonymous ID.',
  },
  {
    title: 'No analytics, no tracking scripts',
    body: 'Higala does not include advertising or behaviour-tracking scripts. This is a support tool, not a data product.',
  },
  {
    title: 'You can clear it at any time',
    body: 'Use the controls here to remove one kind of data or everything at once. Clearing is immediate and cannot be undone.',
  },
];

export function SettingsPage() {
  const {
    profile,
    setName,
    setLanguage,
    moodEntries,
    thoughtRecords,
    safetyPlan,
    clearMoods,
    clearThoughtRecords,
    clearAllData,
  } = useApp();
  const { status: authStatus, getIdToken } = useAuth();

  const [chatCount, setChatCount] = useState(() => readArray(STORAGE_KEYS.chat).length);
  const [notice, setNotice] = useState('');
  const [communityBusy, setCommunityBusy] = useState(false);

  const saveNotice = (message: string) => setNotice(message);

  const clearChat = () => {
    if (!window.confirm('Clear the saved conversation from this device?')) {
      return;
    }
    try {
      window.localStorage.removeItem(STORAGE_KEYS.chat);
    } catch {
      // Storage may be unavailable; the current session still works.
    }
    setChatCount(0);
    saveNotice('Chat history cleared from this device.');
  };

  const clearMoodHistory = () => {
    if (!window.confirm('Clear all mood check-ins from this device?')) return;
    clearMoods();
    saveNotice('Mood history cleared.');
  };

  const clearThoughtHistory = () => {
    if (!window.confirm('Clear all thought records from this device?')) return;
    clearThoughtRecords();
    saveNotice('Thought records cleared.');
  };

  const clearEverything = () => {
    if (
      !window.confirm(
        'Clear ALL local Higala data on this device? This removes your profile, moods, thought records, safety plan, and chat. It cannot be undone. Community posts are stored separately and are not removed by this action.',
      )
    ) {
      return;
    }
    saveNotice('Clearing all local data…');
    clearAllData();
  };

  const clearCommunityData = async () => {
    if (authStatus !== 'ready') {
      saveNotice(
        'Community sign-in is not available right now, so community data cannot be deleted from this screen.',
      );
      return;
    }
    if (
      !window.confirm(
        'Delete ALL your Anonymous Sharing posts, reports, and accepted guidelines? Your local profile, moods, and chats are not affected. This cannot be undone.',
      )
    ) {
      return;
    }

    setCommunityBusy(true);
    saveNotice('Deleting your community data…');
    try {
      const token = await getIdToken();
      const result = await deleteMyCommunityData(token);
      saveNotice(
        `Community data deleted: ${result.deletedPosts} post${
          result.deletedPosts === 1 ? '' : 's'
        } and ${result.deletedReports} report${
          result.deletedReports === 1 ? '' : 's'
        }.`,
      );
    } catch (cause) {
      saveNotice(
        cause instanceof Error
          ? cause.message
          : 'Community data could not be deleted.',
      );
    } finally {
      setCommunityBusy(false);
    }
  };

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'Higala-AI',
      version: '1.0.0',
      profile,
      moodEntries,
      thoughtRecords,
      safetyPlan,
      chat: readArray(STORAGE_KEYS.chat),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `higala-data-${todayKey()}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    saveNotice('Your data was exported as a JSON file.');
  };

  const totalRecords =
    chatCount +
    moodEntries.length +
    thoughtRecords.length +
    (safetyPlan.updatedAt ? 1 : 0);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Settings"
        title={
          <>
            You and your{' '}
            <span className="italic text-pine-600 dark:text-pine-300">
              data.
            </span>
          </>
        }
        subtitle="Change how Higala speaks to you, see what is stored on this device, or clear it. Your data is yours—handle it that way."
        action={
          <Link
            to="/resources"
            className={buttonStyles({ variant: 'secondary', size: 'md' })}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Crisis resources
          </Link>
        }
      />

      {notice ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-pine-200 bg-pine-50 px-3.5 py-2.5 text-xs font-semibold text-pine-800 dark:border-pine-500/30 dark:bg-pine-900/60 dark:text-pine-100">
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <SettingCard
            icon={<Moon className="h-5 w-5" aria-hidden="true" />}
            title="Appearance"
            description="Adapts automatically to your browser’s dark mode preference, or pin Light or Dark any time."
          >
            <ThemePreferenceSelector />
          </SettingCard>

          <SettingCard
            icon={<UserRound className="h-5 w-5" aria-hidden="true" />}
            title="How should Higala call you?"
            description="A first name or a nickname. Nothing needs to be real."
          >
            <div className="flex items-center gap-3 rounded-xl border border-pine-900/6 bg-cream/65 p-3 dark:border-white/10 dark:bg-pine-950/60">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine-900 text-xs font-extrabold text-cream dark:bg-pine-500 dark:text-pine-950">
                {initials(profile.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-pine-950 dark:text-cream">
                  {profile.name.trim() || 'New friend'}
                </p>
                <p className="text-[0.6rem] text-muted dark:text-pine-200/65">
                  Local profile · no account needed
                </p>
              </div>
            </div>

            <label
              htmlFor="settings-name"
              className="mt-4 block text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-pine-700 dark:text-pine-300"
            >
              What should I call you?
            </label>
            <input
              id="settings-name"
              value={profile.name}
              onChange={(event) => setName(event.target.value.slice(0, 60))}
              placeholder="e.g. Sam, Alex, or your nickname"
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-pine-900/10 bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/40 focus:border-pine-400 focus:bg-white dark:border-white/12 dark:bg-pine-950/70 dark:text-cream dark:placeholder:text-pine-200/40 dark:focus:border-pine-400 dark:focus:bg-pine-950"
            />

            <p className="mt-4 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-pine-700 dark:text-pine-300">
              Language
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {LANGUAGE_OPTIONS.map((option) => {
                const selected = profile.language === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLanguage(option.value)}
                    aria-pressed={selected}
                    className={`rounded-xl border px-2 py-2.5 text-center transition ${
                      selected
                        ? 'border-pine-600 bg-pine-900 text-cream dark:border-pine-400/60 dark:bg-pine-800'
                        : 'border-pine-900/10 bg-white/65 text-pine-800 hover:border-pine-300 hover:bg-pine-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-pine-100 dark:hover:border-pine-400/40 dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    <span className="block text-xs font-bold">
                      {option.label}
                    </span>
                    <span
                      className={`mt-0.5 block text-[0.52rem] font-bold uppercase tracking-[0.06em] ${
                        selected
                          ? 'text-pine-200/70'
                          : 'text-muted/60 dark:text-pine-200/50'
                      }`}
                    >
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[0.65rem] leading-relaxed text-muted dark:text-pine-200/65">
              Higala replies in this language. You can switch between English,
              Bisaya, and Tagalog anytime.
            </p>
          </SettingCard>

          <SettingCard
            icon={<HeartPulse className="h-5 w-5" aria-hidden="true" />}
            title="Your data on this device"
            description="Everything below is stored in this browser. Nothing is synced to another device."
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Check-ins" value={moodEntries.length} />
              <Stat label="Thought checks" value={thoughtRecords.length} />
              <Stat label="Chat messages" value={chatCount} />
              <Stat
                label="Safety plan"
                value={safetyPlan.updatedAt ? 'Saved' : 'Empty'}
                hint={
                  safetyPlan.updatedAt
                    ? formatLongDate(new Date(safetyPlan.updatedAt))
                    : 'Not created yet'
                }
              />
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={clearChat}
                disabled={chatCount === 0}
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Clear chat
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={clearMoodHistory}
                disabled={moodEntries.length === 0}
              >
                <HeartPulse className="h-3.5 w-3.5" aria-hidden="true" />
                Clear moods
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={clearThoughtHistory}
                disabled={thoughtRecords.length === 0}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Clear thoughts
              </Button>
              <Button variant="secondary" size="sm" onClick={exportData}>
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Export data
              </Button>
            </div>

            <p className="mt-3 text-[0.65rem] leading-relaxed text-muted dark:text-pine-200/65">
              {totalRecords === 0
                ? 'Nothing is stored yet. Start with one honest check-in whenever you are ready.'
                : `${totalRecords} local record${totalRecords === 1 ? '' : 's'} across check-ins, thoughts, chat, and your safety plan.`}
            </p>
          </SettingCard>
        </div>

        <div className="space-y-4">
          <SettingCard
            icon={<LockKeyhole className="h-5 w-5" aria-hidden="true" />}
            title="Privacy, plainly."
            description="No fine print. Here is exactly what happens to your words."
          >
            <div className="space-y-2.5">
              {PRIVACY_POINTS.map((point) => (
                <div
                  key={point.title}
                  className="rounded-xl border border-pine-900/6 bg-cream/65 p-3.5 dark:border-white/10 dark:bg-pine-950/60"
                >
                  <p className="text-xs font-bold text-pine-900 dark:text-pine-100">
                    {point.title}
                  </p>
                  <p className="mt-1 text-[0.68rem] leading-relaxed text-muted dark:text-pine-200/70">
                    {point.body}
                  </p>
                </div>
              ))}
            </div>
          </SettingCard>

          <SettingCard
            icon={<Users className="h-5 w-5" aria-hidden="true" />}
            title="Anonymous Sharing data"
            description="Posts and reports you sent to the community live on Higala’s server, linked only to a random anonymous ID. Your local profile is never attached."
          >
            <div className="rounded-xl border border-pine-900/6 bg-cream/65 p-3.5 dark:border-white/10 dark:bg-pine-950/60">
              <p className="text-[0.7rem] leading-relaxed text-muted dark:text-pine-200/70">
                Deleting removes every community post you wrote, every report you
                sent, and your stored guidelines acceptance. It does not touch
                your profile, moods, thought records, safety plan, or chats on
                this device.
              </p>
            </div>
            <Button
              variant="danger"
              size="md"
              onClick={() => void clearCommunityData()}
              disabled={communityBusy}
              className="mt-3 w-full"
            >
              {communityBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              {communityBusy ? 'Deleting…' : 'Delete my community data'}
            </Button>
          </SettingCard>

          <section className="rounded-[1.5rem] border border-clay/20 bg-clay-soft/70 p-5 dark:border-clay/30 dark:bg-clay/15 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/65 text-clay dark:bg-clay/25 dark:text-[#f0a587]">
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold leading-tight text-[#5e2c18] dark:text-[#f6b8a0]">
                  Clear everything
                </h2>
                <p className="mt-0.5 text-[0.7rem] leading-relaxed text-[#7a4128]/75 dark:text-[#eab9a6]/85">
                  Removes your profile, moods, thought records, safety plan, and
                  chat from this browser. This cannot be undone, and it does not
                  remove community posts—use the community control above for
                  that.
                </p>
              </div>
            </div>
            <Button
              variant="danger"
              size="md"
              onClick={clearEverything}
              className="mt-4 w-full"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Clear all local data
            </Button>
          </section>

          <SettingCard
            icon={<Sparkles className="h-5 w-5" aria-hidden="true" />}
            title="About Higala-AI"
            description="A dialect-aware, radically candid companion for Kagay-anons."
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="mint">v1.0.0</Badge>
              <Badge tone="cream">Gemini 3</Badge>
              <Badge tone="cream">Vercel · Firebase</Badge>
              <Badge tone="sun">No yes-man</Badge>
            </div>
            <p className="mt-3 text-[0.7rem] leading-relaxed text-muted dark:text-pine-200/70">
              Higala is peer support, not a therapist, psychiatrist, or
              emergency service. It can help you think clearly and take a next
              step—but it cannot keep you safe on its own.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                to="/toolkit?tool=safety-plan"
                className={buttonStyles({
                  variant: 'soft',
                  size: 'sm',
                  className: 'justify-between sm:justify-center',
                })}
              >
                Safety plan
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link
                to="/resources"
                className={buttonStyles({
                  variant: 'secondary',
                  size: 'sm',
                  className: 'justify-between sm:justify-center',
                })}
              >
                Crisis lines
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </SettingCard>
        </div>
      </div>

      <SafetyFooter />
    </PageShell>
  );
}

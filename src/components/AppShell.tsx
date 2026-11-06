import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowUpRight,
  HeartPulse,
  House,
  LifeBuoy,
  MessageCircle,
  Settings2,
  Sparkles,
  Sprout,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Wordmark } from '@/components/BrandMark';
import { CrisisModal } from '@/components/CrisisModal';
import { initials } from '@/lib/utils';
import { LANGUAGE_OPTIONS } from '@/lib/constants';

const NAV_ITEMS = [
  { to: '/', label: 'Panimalay', english: 'Home', icon: House, end: true },
  {
    to: '/chat',
    label: 'Kaistorya',
    english: 'Talk',
    icon: MessageCircle,
    end: false,
  },
  {
    to: '/toolkit',
    label: 'Mga Himan',
    english: 'Tools',
    icon: Sprout,
    end: false,
  },
  {
    to: '/mood',
    label: 'Gibati',
    english: 'Mood',
    icon: HeartPulse,
    end: false,
  },
  {
    to: '/resources',
    label: 'Tabang',
    english: 'Help',
    icon: LifeBuoy,
    end: false,
  },
];

export function Sidebar() {
  const { profile, openCrisis } = useApp();
  const language =
    LANGUAGE_OPTIONS.find((option) => option.value === profile.language) ??
    LANGUAGE_OPTIONS[0];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col overflow-hidden bg-pine-950 text-cream lg:flex">
      <div className="pointer-events-none absolute inset-0 bg-weave opacity-70" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-pine-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-pine-400/10 blur-3xl" />

      <div className="relative z-10 flex h-full flex-col px-5 py-6">
        <NavLink to="/" className="mb-1 inline-flex" aria-label="Higala home">
          <Wordmark inverted />
        </NavLink>
        <p className="pl-[3.25rem] text-[0.62rem] font-bold uppercase tracking-[0.18em] text-pine-200/45">
          Higalaay, dili yes-man
        </p>

        <nav className="mt-8 flex-1 space-y-1.5" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200 ${
                  isActive
                    ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08)]'
                    : 'text-pine-100/65 hover:bg-white/[0.055] hover:text-pine-50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                      isActive
                        ? 'bg-pine-300/15 text-pine-200'
                        : 'bg-white/[0.035] text-pine-200/55 group-hover:text-pine-200'
                    }`}
                  >
                    <item.icon className="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-[0.84rem] font-semibold">
                    {item.label}
                  </span>
                  <span
                    className={`text-[0.56rem] font-bold uppercase tracking-[0.13em] ${
                      isActive ? 'text-pine-300' : 'text-pine-200/25'
                    }`}
                  >
                    {item.english}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-white/[0.055] p-3.5">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pine-300/15 text-pine-200">
              <LifeBuoy className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-[0.97rem] leading-snug text-cream">
                Dili ka kailangan mag-inusara.
              </p>
              <p className="mt-1 text-[0.66rem] leading-relaxed text-pine-200/60">
                You don’t have to be alone in this. Crisis support is one tap
                away.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCrisis}
            className="mt-3 flex w-full items-center justify-between rounded-xl bg-cream px-3 py-2 text-[0.7rem] font-bold text-pine-950 transition hover:bg-white"
          >
            <span>Get help now</span>
            <span className="flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.1em] text-pine-600">
              1553
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </span>
          </button>
        </div>

        <NavLink
          to="/settings"
          className="mt-3 flex items-center gap-2.5 rounded-2xl px-2 py-2 text-pine-100/75 transition hover:bg-white/[0.055] hover:text-cream"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pine-300/15 text-[0.68rem] font-extrabold text-pine-200">
            {initials(profile.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold">
              {profile.name.trim() || 'Bag-ong higala'}
            </span>
            <span className="block text-[0.6rem] uppercase tracking-[0.12em] text-pine-200/40">
              {language.label} · Settings
            </span>
          </span>
          <Settings2 className="h-4 w-4 text-pine-200/50" aria-hidden="true" />
        </NavLink>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-pine-200/30">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Powered by Gemini 3
        </p>
      </div>
    </aside>
  );
}

export function MobileTopBar() {
  const { openCrisis } = useApp();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-pine-900/8 bg-cream/90 px-4 backdrop-blur-xl lg:hidden">
      <NavLink to="/" aria-label="Higala home">
        <Wordmark compact />
      </NavLink>
      <div className="flex items-center gap-2">
        <NavLink
          to="/settings"
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-pine-900/10 bg-white/60 text-pine-800"
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
        </NavLink>
        <button
          type="button"
          onClick={openCrisis}
          aria-label="Get crisis help"
          className="flex h-9 items-center gap-1.5 rounded-full bg-pine-900 px-3.5 text-[0.68rem] font-bold text-cream"
        >
          <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
          Help
        </button>
      </div>
    </header>
  );
}

export function AppShell() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="min-h-dvh lg:pl-72">
      <Sidebar />
      <MobileTopBar />
      <main>
        <Outlet />
      </main>
      <MobileNav />
      <CrisisModal />
    </div>
  );
}

const MOBILE_ITEMS = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/chat', label: 'Talk', icon: MessageCircle, end: false },
  { to: '/toolkit', label: 'Tools', icon: Sprout, end: false },
  { to: '/mood', label: 'Mood', icon: HeartPulse, end: false },
  { to: '/resources', label: 'Help', icon: LifeBuoy, end: false },
];

export function MobileNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-pine-900/10 bg-cream/95 pb-safe backdrop-blur-xl lg:hidden"
    >
      <div className="grid grid-cols-5 px-2 pt-1.5">
        {MOBILE_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[0.58rem] font-bold transition-colors ${
                isActive
                  ? 'text-pine-900'
                  : 'text-muted hover:text-pine-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-7 w-9 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-pine-100 text-pine-800' : 'text-muted'
                  }`}
                >
                  <item.icon className="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

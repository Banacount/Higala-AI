import type { ReactNode } from 'react';
import { ShieldCheck, WifiOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

/**
 * Keeps the rest of Higala usable when community sign-in is not configured or
 * the network is down. Only the community surface shows this gate.
 */
export function CommunityAuthGate({ children }: { children: ReactNode }) {
  const { status, configured, error, retry } = useAuth();

  if (status === 'ready') return <>{children}</>;

  if (status === 'loading') {
    return (
      <div className="flex min-h-[22rem] items-center justify-center rounded-[1.8rem] border border-pine-900/8 bg-white/55 px-6 py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            className="h-8 w-8 animate-spin rounded-full border-2 border-pine-200 border-t-pine-600"
            aria-hidden="true"
          />
          <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.16em] text-muted">
            Connecting to the community…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.8rem] border border-pine-900/10 bg-white/65 px-6 py-12 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-100 text-pine-700">
        {configured ? (
          <WifiOff className="h-6 w-6" aria-hidden="true" />
        ) : (
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        )}
      </span>
      <h2 className="mt-4 font-display text-xl font-semibold text-pine-950">
        {configured
          ? 'The community could not connect'
          : 'Community sign-in is not set up yet'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
        {configured
          ? error ??
            'Check your connection and try again. The rest of Higala still works.'
          : 'This deployment needs Firebase Anonymous Auth configured before anonymous sharing can open. Ask the site owner to add the VITE_FIREBASE_* variables.'}
      </p>
      {configured ? (
        <Button className="mt-5" onClick={retry}>
          Try again
        </Button>
      ) : null}
      <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-muted/80">
        Your chats, moods, thought records, and safety plan stay on this device
        and are not affected.
      </p>
    </div>
  );
}

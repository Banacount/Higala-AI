import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { Pause, Play } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

export function VoicePlayer({
  src,
  durationMs,
  tone = 'dark',
}: {
  src: string;
  durationMs: number;
  tone?: 'light' | 'dark';
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [totalMs, setTotalMs] = useState(durationMs);
  const [unavailable, setUnavailable] = useState(false);

  const dark = tone === 'dark';

  useEffect(() => {
    setCurrentMs(0);
    setPlaying(false);
    setUnavailable(false);
    setTotalMs(durationMs);
  }, [src, durationMs]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || unavailable) return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setPlaying(false);
      }
    } else {
      audio.pause();
    }
  };

  const seek = (event: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const next = Number(event.target.value);
    if (!audio || !Number.isFinite(next)) return;

    audio.currentTime = next / 1_000;
    setCurrentMs(next);
  };

  const maxMs = Math.max(totalMs, 1);

  return (
    <div className="min-w-0 w-full">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          if (Number.isFinite(value) && value > 0) {
            setTotalMs(Math.round(value * 1_000));
          }
        }}
        onTimeUpdate={(event) =>
          setCurrentMs(Math.round(event.currentTarget.currentTime * 1_000))
        }
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentMs(0);
        }}
        onError={() => {
          setPlaying(false);
          setUnavailable(true);
        }}
        className="hidden"
      />

      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={unavailable}
          aria-label={playing ? 'Pause voice message' : 'Play voice message'}
          className={clsx(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:pointer-events-none disabled:opacity-50',
            dark
              ? 'bg-cream/15 text-cream hover:bg-cream/25'
              : 'bg-pine-100 text-pine-800 hover:bg-pine-200',
          )}
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Play className="ml-0.5 h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={maxMs}
            step={100}
            value={Math.min(currentMs, maxMs)}
            onChange={seek}
            disabled={unavailable}
            aria-label="Voice message progress"
            className={clsx(
              'h-1.5 w-full cursor-pointer disabled:cursor-default',
              dark ? 'accent-cream' : 'accent-pine-700',
            )}
          />
          <div
            className={clsx(
              'mt-0.5 flex items-center justify-between gap-2 text-[0.55rem] font-semibold tabular-nums tracking-[0.04em]',
              dark ? 'text-cream/60' : 'text-muted/70',
            )}
          >
            <span>{formatDuration(currentMs)}</span>
            <span>
              {unavailable ? 'Audio unavailable' : formatDuration(totalMs)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

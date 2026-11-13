import { MOOD_LEVELS } from '@/lib/constants';
import type { MoodEntry } from '@/shared/types';

const MOUTHS: Record<MoodEntry['level'], string> = {
  1: 'M14.5 31.5 Q22 25.5 29.5 31.5',
  2: 'M15.5 30.5 Q22 26.5 28.5 30.5',
  3: 'M16 29.5 H28',
  4: 'M15 27.5 Q22 33.5 29 27.5',
  5: 'M14 26.5 Q22 35 30 26.5',
};

export function MoodFace({
  level,
  size = 44,
  className,
}: {
  level: MoodEntry['level'];
  size?: number;
  className?: string;
}) {
  const mood = MOOD_LEVELS[level];
  const low = level <= 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="22" cy="22" r="21" fill={mood.soft} />
      <circle cx="22" cy="22" r="20" fill={mood.color} />
      <circle cx="22" cy="22" r="20" fill="white" opacity="0.08" />
      <ellipse cx="14.5" cy="27" rx="3.2" ry="2" fill="white" opacity="0.14" />
      <ellipse cx="29.5" cy="27" rx="3.2" ry="2" fill="white" opacity="0.14" />
      {low ? (
        <>
          <path
            d="M14 18.5 L18 19.5"
            stroke="#062018"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M30 18.5 L26 19.5"
            stroke="#062018"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="16.5" cy="22" r="1.45" fill="#062018" />
          <circle cx="27.5" cy="22" r="1.45" fill="#062018" />
        </>
      ) : (
        <>
          <circle cx="16.2" cy="20.5" r="1.55" fill="#062018" />
          <circle cx="27.8" cy="20.5" r="1.55" fill="#062018" />
        </>
      )}
      <path
        d={MOUTHS[level]}
        stroke="#062018"
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

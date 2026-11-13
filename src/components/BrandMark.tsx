import { useId } from 'react';

interface BrandMarkProps {
  size?: number;
  className?: string;
}

export function BrandMark({ size = 44, className }: BrandMarkProps) {
  const id = useId().replace(/:/g, '');
  const gradientId = `higala-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="8"
          y1="4"
          x2="56"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#239C72" />
          <stop offset="1" stopColor="#0B3B2E" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gradientId})`} />
      <path
        d="M17 19.5C17 16.4624 19.4624 14 22.5 14H41.5C44.5376 14 47 16.4624 47 19.5V35.5C47 38.5376 44.5376 41 41.5 41H32L23.5 47.5V41H22.5C19.4624 41 17 38.5376 17 35.5V19.5Z"
        fill="#F7F5EE"
      />
      <path
        d="M31.5 34.5C31.5 27.5964 36.5964 22.5 43.5 22.5C43.5 29.4036 38.4036 34.5 31.5 34.5Z"
        fill="#1B7F5E"
      />
      <path
        d="M31.5 34.5C31.5 28.8487 27.1513 24.5 21.5 24.5C21.5 30.1513 25.8487 34.5 31.5 34.5Z"
        fill="#88D3B2"
      />
      <path
        d="M31.5 34.5V24.5"
        stroke="#0B3B2E"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({
  inverted = false,
  compact = false,
}: {
  inverted?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark size={compact ? 36 : 42} />
      <div className="flex items-baseline gap-1.5">
        <span
          className={`font-display text-2xl font-semibold tracking-tight ${
            inverted ? 'text-cream' : 'text-pine-950'
          }`}
        >
          Higala
        </span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[0.58rem] font-extrabold uppercase tracking-[0.16em] ${
            inverted
              ? 'bg-white/15 text-pine-100'
              : 'bg-pine-900 text-pine-100'
          }`}
        >
          AI
        </span>
      </div>
    </div>
  );
}

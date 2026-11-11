import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type Variant =
  | 'primary'
  | 'secondary'
  | 'soft'
  | 'ghost'
  | 'danger'
  | 'light'
  | 'lightOutline';

type Size = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-pine-900 text-cream hover:bg-pine-800 shadow-[0_12px_28px_-18px_rgba(7,37,28,.7)]',
  secondary:
    'border border-pine-900/12 bg-white/75 text-pine-900 hover:border-pine-900/20 hover:bg-white',
  soft: 'bg-pine-100 text-pine-900 hover:bg-pine-200',
  ghost: 'text-pine-900 hover:bg-pine-50',
  danger: 'bg-clay-soft text-clay hover:bg-[#efd6cb]',
  light: 'bg-cream text-pine-950 hover:bg-white',
  lightOutline:
    'border border-white/20 bg-white/5 text-cream hover:border-white/30 hover:bg-white/10',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-[0.95rem]',
  icon: 'h-10 w-10',
};

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}): string {
  return clsx(
    'inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] transition duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
}

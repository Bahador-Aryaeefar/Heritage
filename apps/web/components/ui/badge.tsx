import type { ReactNode } from 'react';

export type BadgeTone = 'default' | 'muted';

// Design system §4: Badge/Eyebrow — one size for every pill.
// Tone changes color only; padding/type never vary per usage.
const toneClasses: Record<BadgeTone, string> = {
  default: 'bg-teal-200 text-teal-700',
  muted: 'bg-brown-800/10 text-brown-600',
};

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
};

export function Badge({ children, tone = 'default' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

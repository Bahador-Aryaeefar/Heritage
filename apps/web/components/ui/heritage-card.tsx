import type { ReactNode } from 'react';

type HeritageCardProps = {
  children: ReactNode;
  className?: string;
};

/** Simple card shell: soft shadow, gold-tint border, no corner ornaments. */
export function HeritageCard({ children, className = '' }: HeritageCardProps) {
  return (
    <div
      className={`overflow-hidden rounded-card border border-gold-600/20 bg-sand-100 shadow-[0_2px_16px_rgba(42,29,20,0.07)] ${className}`}
    >
      {children}
    </div>
  );
}

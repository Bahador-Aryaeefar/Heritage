import type { CSSProperties } from 'react';

// Design system §11 logo lockup — arch + QR corner (from heritage.html).
export function LogoMark({
  className = 'h-[42px] w-[42px]',
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg className={className} style={style} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M6 42V22C6 12.6 13.6 5 23 5H25C34.4 5 42 12.6 42 22V42"
        stroke="#4A3728"
        strokeWidth="4"
        fill="none"
      />
      <rect x="14" y="26" width="20" height="16" rx="2" fill="#1D6F8C" />
      <rect x="18" y="30" width="4" height="4" fill="#F5EDE1" />
      <rect x="26" y="30" width="4" height="4" fill="#F5EDE1" />
      <rect x="18" y="36" width="4" height="4" fill="#F5EDE1" />
    </svg>
  );
}

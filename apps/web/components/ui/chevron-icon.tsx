type ChevronIconProps = {
  className?: string;
  open?: boolean;
};

/** Shared disclosure chevron for Select / LanguageSwitcher (design-system controls). */
export function ChevronIcon({ className = '', open = false }: ChevronIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`h-5 w-5 shrink-0 text-teal-700 transition-transform ${open ? 'rotate-180' : ''} ${className}`}
    >
      <path
        d="M5.25 7.5 10 12.25 14.75 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

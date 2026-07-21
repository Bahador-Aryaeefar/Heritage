'use client';

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
};

export function Checkbox({ checked, onChange, label, disabled = false }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3 text-start disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 transition-colors ${
          checked
            ? 'border-teal-700 bg-teal-700 text-sand-50'
            : 'border-brown-800/40 bg-white'
        }`}
      >
        {checked ? (
          <svg viewBox="0 0 12 10" className="h-3 w-3" fill="none" aria-hidden="true">
            <path
              d="M1.5 5.2 4.4 8.1 10.5 1.9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="text-[15px] font-medium text-brown-800">{label}</span>
    </button>
  );
}

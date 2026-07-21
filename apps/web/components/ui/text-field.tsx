import type { ComponentPropsWithoutRef, ReactNode } from 'react';

const controlClass =
  'w-full rounded-button border border-brown-800/25 bg-white px-4 py-3 text-[15px] text-brown-950 outline-none transition-colors placeholder:text-brown-600/50 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15';


type FieldProps = {
  label: string;
  children: ReactNode;
  hint?: string;
};

export function Field({ label, children, hint }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold tracking-wide text-brown-800">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-brown-600">{hint}</span> : null}
    </label>
  );
}

type TextInputProps = ComponentPropsWithoutRef<'input'>;

export function TextInput({ className = '', ...props }: TextInputProps) {
  return <input className={`${controlClass} ${className}`} {...props} />;
}

type TextAreaProps = ComponentPropsWithoutRef<'textarea'>;

export function TextArea({ className = '', ...props }: TextAreaProps) {
  return <textarea className={`${controlClass} resize-y ${className}`} {...props} />;
}

export { controlClass };

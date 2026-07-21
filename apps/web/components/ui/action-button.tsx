import type { ComponentPropsWithoutRef } from 'react';

type ActionButtonVariant = 'primary' | 'secondary' | 'ghost';

const variantClasses: Record<ActionButtonVariant, string> = {
  primary: 'bg-teal-700 text-sand-50 border-2 border-transparent',
  secondary: 'bg-transparent text-brown-800 border-2 border-brown-800',
  ghost: 'bg-white text-brown-800 border-2 border-brown-800/20',
};

type ActionButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: ActionButtonVariant;
};

export function ActionButton({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ActionButtonProps) {
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center rounded-button px-5 py-2.5 text-[15px] font-bold transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

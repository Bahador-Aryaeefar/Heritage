import type { ComponentPropsWithoutRef } from 'react';

type ButtonVariant = 'primary' | 'secondary';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-teal-700 text-sand-50 border-2 border-transparent',
  secondary: 'bg-transparent text-brown-800 border-2 border-brown-800',
};

type ButtonProps = ComponentPropsWithoutRef<'a'> & {
  variant?: ButtonVariant;
};

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <a
      className={`inline-block rounded-button px-7 py-3.5 text-[15px] font-bold transition-transform hover:-translate-y-0.5 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}

import { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover active:bg-accent-active',
  secondary: 'border border-edge bg-panel-hover text-gray-100 hover:border-edge-light',
  danger: 'bg-danger text-white hover:bg-danger-hover',
  ghost: 'text-muted hover:bg-panel-hover hover:text-gray-100'
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2.5 text-sm rounded-lg',
  lg: 'px-6 py-3.5 text-base rounded-lg'
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  disabled,
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      type={type}
      disabled={disabled}
      className={
        `font-medium transition-colors focus:outline-none focus-visible:ring-2 ` +
        `focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 ` +
        `${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`
      }
      {...rest}
    />
  );
}

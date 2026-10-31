import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none';

    const variants = {
      default:
        'bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 shadow-xs hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
      secondary:
        'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface2)] shadow-xs hover:-translate-y-0.5 active:translate-y-0',
      outline:
        'border border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--surface2)]',
      ghost: 'text-[var(--text)] hover:bg-[var(--surface2)]',
      link: 'text-[var(--accent)] underline-offset-4 hover:underline p-0 h-auto',
      destructive:
        'bg-red-600 text-white hover:bg-red-700 shadow-xs active:bg-red-800',
    };

    const sizes = {
      default: 'min-h-[44px] px-5 py-2.5 text-sm rounded-xl',
      sm: 'min-h-[36px] px-3.5 py-1.5 text-xs rounded-lg',
      lg: 'min-h-[48px] px-6 py-3 text-base rounded-2xl',
      icon: 'h-10 w-10 rounded-xl p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };

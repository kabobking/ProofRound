import * as React from 'react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success';
}

function Alert({ className = '', variant = 'default', ...props }: AlertProps) {
  const variants = {
    default: 'border-[var(--border)] bg-[var(--surface2)] text-[var(--text)]',
    destructive:
      'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
    success:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  };

  return (
    <div
      role="alert"
      className={`relative w-full rounded-xl border p-4 text-sm leading-relaxed ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

function AlertDescription({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-sm [&_p]:leading-relaxed ${className}`}
      {...props}
    />
  );
}

export { Alert, AlertDescription };

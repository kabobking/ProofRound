import * as React from 'react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'default' | 'lg';
}

export function Spinner({ className = '', size = 'default', ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    default: 'h-10 w-10 border-2',
    lg: 'h-14 w-14 border-3',
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-solid border-[var(--accent)] border-t-transparent ${sizeClasses[size]} ${className}`}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

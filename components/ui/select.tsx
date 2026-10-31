import * as React from 'react';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', children, disabled, ...props }, ref) => {
    return (
      <select
        ref={ref}
        disabled={disabled}
        className={`flex min-h-[44px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] transition-all outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/15 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export type SelectOptionProps = React.OptionHTMLAttributes<HTMLOptionElement>;

const SelectOption = React.forwardRef<HTMLOptionElement, SelectOptionProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <option
        ref={ref}
        className={`bg-[var(--surface)] text-[var(--text)] ${className}`}
        {...props}
      >
        {children}
      </option>
    );
  }
);
SelectOption.displayName = 'SelectOption';

export { Select, SelectOption };

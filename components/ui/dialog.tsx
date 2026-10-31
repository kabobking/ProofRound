'use client';

import * as React from 'react';
import { X } from 'lucide-react';

interface DialogContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType | undefined>(undefined);

function useDialog() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a Dialog');
  }
  return context;
}

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open: controlledOpen, onOpenChange: controlledOnOpenChange, children }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = React.useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(value);
      }
      controlledOnOpenChange?.(value);
    },
    [isControlled, controlledOnOpenChange]
  );

  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({ children, asChild, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = useDialog();

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e);
        onOpenChange(true);
      },
    });
  }

  return (
    <button type="button" onClick={() => onOpenChange(true)} {...props}>
      {children}
    </button>
  );
}

export function DialogPortal({ children }: { children: React.ReactNode }) {
  const { open } = useDialog();
  if (!open) return null;
  return <>{children}</>;
}

export function DialogOverlay({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { onOpenChange } = useDialog();
  return (
    <div
      className={`fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[2px] transition-opacity animate-in fade-in-0 ${className}`}
      onClick={() => onOpenChange(false)}
      aria-hidden="true"
      {...props}
    />
  );
}

export function DialogContent({
  children,
  className = '',
  showClose = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { showClose?: boolean }) {
  const { open, onOpenChange } = useDialog();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <DialogOverlay />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-50 w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl transition-all duration-200 animate-in fade-in-0 zoom-in-95 sm:rounded-2xl ${className}`}
        onClick={e => e.stopPropagation()}
        {...props}
      >
        {children}
        {showClose && (
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface2)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function DialogHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col space-y-1.5 text-left ${className}`}
      {...props}
    />
  );
}

export function DialogFooter({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2 ${className}`}
      {...props}
    />
  );
}

export function DialogTitle({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={`text-xl font-semibold tracking-tight text-[var(--text)] ${className}`}
      {...props}
    />
  );
}

export function DialogDescription({ className = '', ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-sm leading-relaxed text-[var(--muted)] ${className}`}
      {...props}
    />
  );
}

export function DialogBody({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`space-y-4 py-2 ${className}`}
      {...props}
    />
  );
}

export function DialogSection({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`space-y-2 ${className}`}
      {...props}
    />
  );
}

export function DialogGrid({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`grid gap-3 sm:grid-cols-2 ${className}`}
      {...props}
    />
  );
}

export function DialogText({ className = '', ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-xs text-[var(--muted)] ${className}`}
      {...props}
    />
  );
}

export function DialogClose({ children, asChild, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = useDialog();

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e);
        onOpenChange(false);
      },
    });
  }

  return (
    <button type="button" onClick={() => onOpenChange(false)} {...props}>
      {children}
    </button>
  );
}

import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-6 pt-6">
      <div>
        {eyebrow ? <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">{eyebrow}</p> : null}
        <h3 className="text-lg font-medium text-zinc-900">{title}</h3>
      </div>
      {action ? <div className="flex-shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 pb-6 pt-4 ${className}`}>{children}</div>;
}

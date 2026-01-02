import { ReactNode } from "react";

export default function Badge({ children, variant = "muted" }: { children: ReactNode; variant?: "muted" | "success" | "warning" }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";
  const styles: Record<string, string> = {
    muted: "bg-zinc-100 text-zinc-700 border border-zinc-200",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border border-amber-100",
  };
  return <span className={`${base} ${styles[variant] || styles.muted}`}>{children}</span>;
}

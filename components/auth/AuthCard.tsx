export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-zinc-900">{title}</h1>
        <p className="mt-3 text-sm text-zinc-600 leading-relaxed">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

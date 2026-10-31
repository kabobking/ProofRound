export const dynamic = 'force-static';

export default function ApiHealthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6 text-[var(--text)] font-mono">
      <pre className="text-base">API is healthy.</pre>
    </main>
  );
}

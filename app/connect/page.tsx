import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export default function ConnectStripePlaceholder() {
  return (
    <div className="bg-[#fafafa]">
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
        <Card>
          <CardHeader title="Connect Stripe (read-only)" eyebrow="Placeholder" />
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-600">
              We’ll request read-only access. No charges. No changes. Full Stripe Connect flow will be added next.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                disabled
                className="rounded-lg bg-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 cursor-not-allowed"
              >
                Continue (coming soon)
              </button>
              <Link
                href="/dashboard"
                className="inline-flex rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-300 hover:text-zinc-900 transition-colors"
              >
                Back to dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

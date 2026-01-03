import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { requireAuthenticatedUser } from "@/lib/session";

export default async function ConnectStripePage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const auth = await requireAuthenticatedUser().catch(() => null);
  if (!auth) {
    redirect("/login?callbackUrl=/connect");
  }

  const { user } = auth!;
  const connected = Boolean(user.stripeAccountId);
  const error = searchParams?.error;

  return (
    <div className="bg-[#fafafa]">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Card>
          <CardHeader
            title="Connect Stripe (read-only)"
            eyebrow={connected ? "Connected" : "Setup"}
            action={
              connected ? (
                <Badge variant="success">Read-only</Badge>
              ) : (
                <Badge variant="warning">Not connected</Badge>
              )
            }
          />
          <CardContent className="space-y-4">
            {error ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Stripe connection failed: {decodeURIComponent(error)}
              </div>
            ) : null}

            <p className="text-sm text-zinc-600">
              We request Stripe Connect OAuth with <strong>scope=read_only</strong>. No write, charge, or payout
              permissions are requested. Tokens are encrypted server-side and never sent to the client.
            </p>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              <ul className="space-y-2">
                <li>• Redirect to Stripe, authorize with your existing account.</li>
                <li>• On return, we store the connected account ID and encrypted access/refresh tokens.</li>
                <li>• You can reconnect at any time to rotate credentials.</li>
              </ul>
            </div>

            {connected ? (
              <div className="space-y-2 text-sm text-zinc-700">
                <div className="font-medium text-zinc-900">Connected account</div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="success">Connected</Badge>
                  <span className="text-xs text-zinc-500">Account: {user.stripeAccountId}</span>
                  {user.stripeConnectedAt ? (
                    <span className="text-xs text-zinc-500">
                      Connected at {new Date(user.stripeConnectedAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/api/stripe/connect"
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                  >
                    Reconnect Stripe
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-300 hover:text-zinc-900 transition-colors"
                  >
                    Back to dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/api/stripe/connect"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  Connect Stripe (read-only)
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-300 hover:text-zinc-900 transition-colors"
                >
                  Back to dashboard
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

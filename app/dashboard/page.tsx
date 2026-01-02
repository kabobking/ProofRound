import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
  getMockMetrics,
  getMockPackets,
  getMockStripeConnection,
} from "@/lib/dashboard-mock";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import CopyLinkButton from "@/components/dashboard/CopyLinkButton";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Proofround",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { connected?: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const connectedOverride = searchParams?.connected === "1";
  const connection = getMockStripeConnection(session, { connectedOverride });
  const packets = getMockPackets(session).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const metrics = getMockMetrics(session);
  const latestPacket = connection.connected ? packets[0] : undefined;

  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "--";

  return (
    <div className="bg-[#fafafa]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 flex flex-col gap-2">
          <h1 className="text-3xl font-medium tracking-tight text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-600">
            Snapshot-based, read-only fundraising metrics. All data shown below is mock until Stripe is connected.
          </p>
        </header>

        {/* Account Status */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader title="Stripe" eyebrow="Account status" />
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={connection.connected ? "success" : "warning"}>
                  {connection.connected ? "Connected" : "Disconnected"}
                </Badge>
                <Badge>Read-only (planned)</Badge>
              </div>
              <p className="text-sm text-zinc-600">
                {connection.connected
                  ? `Connected ${formatDate(connection.connectedAt?.toISOString())}`
                  : "Connect Stripe (read-only) to enable packet generation."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Verification status" eyebrow="Current" />
            <CardContent className="space-y-2">
              {connection.connected ? (
                <Badge variant={latestPacket?.status === "Shared" ? "success" : "muted"}>
                  {latestPacket?.status ?? "Draft"}
                </Badge>
              ) : (
                <Badge variant="warning">Not ready</Badge>
              )}
              <p className="text-sm text-zinc-600">
                {connection.connected
                  ? latestPacket
                    ? `Latest packet: ${latestPacket.name}`
                    : "No packets yet. Generate your first snapshot to share with investors."
                  : "Connect Stripe (read-only) to generate a time-stamped verification packet."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Last snapshot" eyebrow="As of" />
            <CardContent className="space-y-2">
              <p className="text-xl font-semibold text-zinc-900">
                {latestPacket ? formatDate(latestPacket.asOfDate) : "--"}
              </p>
              <p className="text-sm text-zinc-600">
                {latestPacket ? "Snapshots are point-in-time and read-only." : "None yet. Connect Stripe to get started."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Next step" eyebrow="Guidance" />
            <CardContent className="space-y-2">
              <p className="text-sm text-zinc-700">
                {connection.connected
                  ? "Generate your next verification packet to share with investors."
                  : "Connect Stripe (read-only) to unlock packet generation and investor sharing."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Primary action */}
        <div className="mt-8">
          <Card className="border-indigo-100">
            <CardHeader
              title={connection.connected ? "Generate Verification Packet" : "Connect Stripe (read-only)"}
              eyebrow="Primary action"
              action={
                connection.connected ? (
                  <button
                    type="button"
                    className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors bg-indigo-600 hover:bg-indigo-700"
                  >
                    Generate packet
                  </button>
                ) : (
                  <Link
                    href="/connect"
                    className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors bg-indigo-600 hover:bg-indigo-700"
                  >
                    Connect Stripe
                  </Link>
                )
              }
            />
            <CardContent className="space-y-3">
              <p className="text-sm text-zinc-600">
                {connection.connected
                  ? "Creates a time-stamped snapshot of your Stripe metrics for investors."
                  : "Required before you can generate a verification packet."}
              </p>
              <p className="text-xs text-zinc-500">
                This captures a point-in-time snapshot of your Stripe metrics with read-only access.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Packets list */}
        <div className="mt-10">
          <Card>
            <CardHeader title="Verification packets" eyebrow="Snapshots" />
            <CardContent className="space-y-4">
              {packets.length === 0 ? (
                <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 p-6">
                  <p className="text-sm text-zinc-700">No packets yet.</p>
                  <button
                    type="button"
                    disabled={!connection.connected}
                    className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors ${
                      connection.connected
                        ? "bg-indigo-600 hover:bg-indigo-700"
                        : "bg-zinc-300 text-zinc-600 cursor-not-allowed"
                    }`}
                  >
                    Generate first packet
                  </button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-zinc-200">
                  <div className="grid grid-cols-12 bg-zinc-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <div className="col-span-4">Packet</div>
                    <div className="col-span-2">Created</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">As of</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  <div className="divide-y divide-zinc-200 bg-white">
                    {packets.map((packet) => (
                      <div key={packet.id} className="grid grid-cols-12 px-4 py-4 text-sm items-center">
                        <div className="col-span-4">
                          <p className="font-medium text-zinc-900">{packet.name}</p>
                          <p className="text-xs text-zinc-500">{packet.id}</p>
                        </div>
                        <div className="col-span-2 text-zinc-700">{formatDate(packet.createdAt)}</div>
                        <div className="col-span-2">
                          <Badge variant={packet.status === "Shared" ? "success" : packet.status === "Ready" ? "muted" : "warning"}>
                            {packet.status}
                          </Badge>
                        </div>
                        <div className="col-span-2 text-zinc-700">{formatDate(packet.asOfDate)}</div>
                        <div className="col-span-2 flex items-center justify-end gap-3">
                          <Link href="/p/demo" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                            View
                          </Link>
                          <CopyLinkButton url={packet.shareUrl} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Investor preview */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Investor preview" eyebrow="Read-only" />
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge>Read-only</Badge>
                <span className="text-xs text-zinc-500">Snapshot as of {formatDate(latestPacket?.asOfDate)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <MetricTile label="MRR" value={metrics.mrr} />
                <MetricTile label="ARR" value={metrics.arr} />
                <MetricTile label="Net revenue (30d)" value={metrics.netRevenue30d} />
                <MetricTile label="Refunds (30d)" value={metrics.refunds30d} />
                <MetricTile label="Churn MoM" value={metrics.churnMoM} />
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/p/demo"
                  className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 hover:-translate-y-0.5 hover:shadow-md transition-all"
                >
                  Open investor view
                </Link>
                <p className="text-xs text-zinc-500">Investors see a read-only, time-stamped packet.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Trust & Security" eyebrow="Designed for diligence. Built for least privilege." />
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-zinc-700">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Read-only Stripe access (no write or charge permissions).
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Point-in-time snapshots reduce data drift during diligence.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Designed to store aggregates/IDs only — no raw Stripe objects.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Planned: revocable/expiring share links for investor access.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Planned: audit-friendly timestamps and metric definitions.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-lg font-semibold text-zinc-900 mt-1">{value}</p>
    </div>
  );
}

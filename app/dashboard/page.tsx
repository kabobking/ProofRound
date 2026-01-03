import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ReportStatus } from "@prisma/client";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import GenerateReportButton from "@/components/dashboard/GenerateReportButton";
import ShareLinkButton from "@/components/dashboard/ShareLinkButton";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Dashboard — Proofround",
};

export default async function DashboardPage() {
  const auth = await requireAuthenticatedUser().catch(() => null);
  if (!auth) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const { user } = auth!;
  const reports = await prisma.report.findMany({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const latestReport = reports[0];

  const connected = Boolean(user.stripeAccountId);
  const formatDate = (value?: Date | string | null) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "--";

  const statusBadge = (status: ReportStatus) => {
    if (status === ReportStatus.ready) return "success";
    if (status === ReportStatus.failed) return "warning";
    return "warning";
  };

  return (
    <div className="bg-[#fafafa]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 flex flex-col gap-2">
          <h1 className="text-3xl font-medium tracking-tight text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-600">
            Connect Stripe with read-only access, generate investor PDFs, and share revocable links.
          </p>
        </header>

        {/* Account Status */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader title="Stripe" eyebrow="Account status" />
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={connected ? "success" : "warning"}>
                  {connected ? "Connected" : "Disconnected"}
                </Badge>
                <Badge>Read-only</Badge>
              </div>
              <p className="text-sm text-zinc-600">
                {connected
                  ? `Account: ${user.stripeAccountId} • Connected ${formatDate(user.stripeConnectedAt)}`
                  : "Connect Stripe (read-only) to enable report generation."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Verification status" eyebrow="Current" />
            <CardContent className="space-y-2">
              {connected && latestReport ? (
                <Badge variant={statusBadge(latestReport.status)}>Latest: {latestReport.status}</Badge>
              ) : (
                <Badge variant="warning">Not ready</Badge>
              )}
              <p className="text-sm text-zinc-600">
                {connected
                  ? latestReport
                    ? `Report created ${formatDate(latestReport.createdAt)}`
                    : "Generate your first investor report."
                  : "Connect Stripe to generate your first report."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Last report period" eyebrow="As of" />
            <CardContent className="space-y-2">
              <p className="text-xl font-semibold text-zinc-900">
                {latestReport
                  ? `${formatDate(latestReport.periodStart)} → ${formatDate(latestReport.periodEnd)}`
                  : "--"}
              </p>
              <p className="text-sm text-zinc-600">
                {latestReport ? "Point-in-time snapshot from Stripe balance data." : "Generate a report to populate."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Next step" eyebrow="Guidance" />
            <CardContent className="space-y-2">
              <p className="text-sm text-zinc-700">
                {connected
                  ? "Generate your next investor PDF and share a tokenized link."
                  : "Connect Stripe (read-only) to unlock investor reports."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Primary action */}
        <div className="mt-8">
          <Card className="border-indigo-100">
            <CardHeader
              title={connected ? "Generate investor report" : "Connect Stripe (read-only)"}
              eyebrow="Primary action"
              action={
                connected ? (
                  <GenerateReportButton />
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
                {connected
                  ? "Creates a time-stamped PDF sourced from Stripe balance transactions, stored privately in GCS."
                  : "Authorize read-only access to your existing Stripe account to enable reporting."}
              </p>
              <p className="text-xs text-zinc-500">
                Investor links are tokenized (`/r/[id]?t=...`) and can be rotated at any time.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Reports list */}
        <div className="mt-10">
          <Card>
            <CardHeader title="Investor reports" eyebrow="Generated from Stripe" />
            <CardContent className="space-y-4">
              {reports.length === 0 ? (
                <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 p-6">
                  <p className="text-sm text-zinc-700">No reports yet.</p>
                  {connected ? (
                    <GenerateReportButton />
                  ) : (
                    <Link
                      href="/connect"
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
                    >
                      Connect Stripe to generate
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-zinc-200">
                  <div className="grid grid-cols-12 bg-zinc-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <div className="col-span-4">Report</div>
                    <div className="col-span-2">Created</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Period</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  <div className="divide-y divide-zinc-200 bg-white">
                    {reports.map((report) => (
                      <div key={report.id} className="grid grid-cols-12 px-4 py-4 text-sm items-center">
                        <div className="col-span-4">
                          <p className="font-medium text-zinc-900">Report {report.id.slice(0, 8)}</p>
                          <p className="text-xs text-zinc-500">{report.stripeAccountId}</p>
                        </div>
                        <div className="col-span-2 text-zinc-700">{formatDate(report.createdAt)}</div>
                        <div className="col-span-2">
                          <Badge variant={statusBadge(report.status)}>{report.status}</Badge>
                        </div>
                        <div className="col-span-2 text-zinc-700">
                          {formatDate(report.periodStart)} → {formatDate(report.periodEnd)}
                        </div>
                        <div className="col-span-2 flex flex-col items-end gap-2">
                          {report.status === ReportStatus.ready ? (
                            <ShareLinkButton reportId={report.id} />
                          ) : (
                            <span className="text-xs text-zinc-500">Processing</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

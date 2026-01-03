import { notFound } from "next/navigation";
import { getSignedReportUrl } from "@/lib/gcs";
import { validateShareToken } from "@/lib/report-service";
import { ReportStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function InvestorReportPage({
  params,
  searchParams,
}: {
  params: { reportId: string };
  searchParams?: { t?: string };
}) {
  const token = searchParams?.t;
  if (!token) {
    notFound();
  }

  const report = await validateShareToken(params.reportId, token);
  if (!report || report.status !== ReportStatus.ready) {
    notFound();
  }

  const signedUrl = await getSignedReportUrl(report.pdfGcsPath);

  const formatDate = (value: Date | string) =>
    new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="bg-[#fafafa] min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
            Investor link
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-zinc-900">
            Stripe Verification Packet
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Read-only PDF generated from Stripe Connect data. Link access is tokenized and can be revoked by the owner.
          </p>
        </div>

        <div className="mb-4 text-sm text-zinc-600">
          <div>Report ID: {report.id}</div>
          <div>Stripe account: {report.stripeAccountId}</div>
          <div>
            Period: {formatDate(report.periodStart)} → {formatDate(report.periodEnd)}
          </div>
          <div>Created: {formatDate(report.createdAt)}</div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <a
            href={signedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            Download PDF
          </a>
          <span className="text-xs text-zinc-500">
            Signed URL expires in ~15 minutes and refreshes on reload.
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="relative h-[80vh] min-h-[600px] bg-zinc-50">
            <iframe
              src={signedUrl}
              className="h-full w-full border-0"
              title="Investor PDF"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

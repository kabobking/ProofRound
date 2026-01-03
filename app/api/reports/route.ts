import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/session";
import { buildShareUrl, generateReportForUser } from "@/lib/report-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const userResult = await requireAuthenticatedUser().catch(() => null);
  if (!userResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user } = userResult;
  if (!user.stripeAccountId || !user.stripeAccessTokenEncrypted) {
    return NextResponse.json(
      { error: "Stripe is not connected for this user" },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const end = body?.periodEnd ? new Date(body.periodEnd) : new Date();
  const start =
    body?.periodStart && typeof body.periodStart === "string"
      ? new Date(body.periodStart)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return NextResponse.json({ error: "Invalid periodStart or periodEnd" }, { status: 400 });
  }

  try {
    const { report, shareToken } = await generateReportForUser(user, {
      periodStart: start,
      periodEnd: end,
    });

    const shareUrl = buildShareUrl(request.nextUrl.origin, report.id, shareToken);

    const responseReport = {
      id: report.id,
      status: report.status,
      ownerUserId: report.ownerUserId,
      stripeAccountId: report.stripeAccountId,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      pdfGcsPath: report.pdfGcsPath,
      createdAt: report.createdAt,
    };

    return NextResponse.json({ report: responseReport, shareUrl }, { status: 201 });
  } catch (error) {
    console.error("Report generation failed", error);
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}

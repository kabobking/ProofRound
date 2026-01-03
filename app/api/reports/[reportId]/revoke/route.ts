import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/session";
import { buildShareUrl, rotateReportShareToken } from "@/lib/report-service";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  const userResult = await requireAuthenticatedUser().catch(() => null);
  if (!userResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { report, shareToken } = await rotateReportShareToken(params.reportId, userResult.user.id);
    const shareUrl = buildShareUrl(request.nextUrl.origin, report.id, shareToken);
    return NextResponse.json({ reportId: report.id, shareUrl });
  } catch (error) {
    console.error("Failed to rotate share token", error);
    return NextResponse.json({ error: "Unable to rotate token" }, { status: 400 });
  }
}

import { ReportStatus, type Report, type User } from "@prisma/client";
import { randomUUID } from "crypto";
import { decryptSecret, encryptSecret, generateShareToken, hashToken } from "./crypto";
import { prisma } from "./prisma";
import { generateReportPdf } from "./pdf";
import { uploadReportPdf } from "./gcs";
import { getAccountStripeClient } from "./stripe";
import { fetchStripeMetrics } from "./stripe-metrics";

export async function getOrCreateUserByEmail(email: string): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({ data: { email } });
}

export async function saveStripeConnection(
  userId: string,
  params: { accountId: string; accessToken: string; refreshToken?: string; connectedAt?: Date }
) {
  const accessTokenEncrypted = encryptSecret(params.accessToken);
  const refreshTokenEncrypted = params.refreshToken ? encryptSecret(params.refreshToken) : null;

  return prisma.user.update({
    where: { id: userId },
    data: {
      stripeAccountId: params.accountId,
      stripeAccessTokenEncrypted: accessTokenEncrypted,
      stripeRefreshTokenEncrypted: refreshTokenEncrypted,
      stripeConnectedAt: params.connectedAt ?? new Date(),
    },
  });
}

export type ReportCreationResult = {
  report: Report;
  shareToken: string;
};

export async function generateReportForUser(user: User, options: { periodStart: Date; periodEnd: Date }) {
  if (!user.stripeAccessTokenEncrypted || !user.stripeAccountId) {
    throw new Error("Stripe is not connected for this user");
  }

  const accessToken = decryptSecret(user.stripeAccessTokenEncrypted);
  const stripe = getAccountStripeClient(accessToken);

  const metrics = await fetchStripeMetrics(stripe, {
    periodStart: options.periodStart,
    periodEnd: options.periodEnd,
    includeInvoices: true,
    includeSubscriptions: true,
  });

  const reportId = randomUUID();
  const pdfBuffer = await generateReportPdf({
    reportId,
    accountId: user.stripeAccountId,
    periodStart: options.periodStart,
    periodEnd: options.periodEnd,
    metrics,
  });

  const pdfPath = await uploadReportPdf(pdfBuffer, reportId);
  const { token, hash } = generateShareToken();

  const report = await prisma.report.create({
    data: {
      id: reportId,
      ownerUserId: user.id,
      stripeAccountId: user.stripeAccountId,
      periodStart: options.periodStart,
      periodEnd: options.periodEnd,
      status: ReportStatus.ready,
      pdfGcsPath: pdfPath,
      shareTokenHash: hash,
    },
  });

  return { report, shareToken: token };
}

export function buildShareUrl(origin: string, reportId: string, shareToken: string) {
  const url = new URL(`/r/${reportId}`, origin);
  url.searchParams.set("t", shareToken);
  return url.toString();
}

export async function rotateReportShareToken(reportId: string, userId: string) {
  const existing = await prisma.report.findUnique({ where: { id: reportId } });
  if (!existing || existing.ownerUserId !== userId) {
    throw new Error("Report not found or access denied");
  }
  const { token, hash } = generateShareToken();
  const updated = await prisma.report.update({
    where: { id: reportId },
    data: { shareTokenHash: hash },
  });
  return { report: updated, shareToken: token };
}

export async function validateShareToken(reportId: string, token: string) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report || !report.shareTokenHash) return null;

  const hashed = hashToken(token);
  if (hashed !== report.shareTokenHash) return null;

  return report;
}

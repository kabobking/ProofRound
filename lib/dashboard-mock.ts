import crypto from "crypto";

export type MockPacketStatus = "Draft" | "Ready" | "Shared";

export type MockPacket = {
  id: string;
  name: string;
  createdAt: string;
  status: MockPacketStatus;
  asOfDate: string;
  shareUrl: string;
};

export type MockMetrics = {
  mrr: string;
  arr: string;
  netRevenue30d: string;
  churnMoM: string;
  refunds30d: string;
};

const baseDate = new Date("2024-08-15T12:00:00Z");

function seededRandom(seed: string) {
  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  const int = parseInt(hash.slice(0, 8), 16);
  return (min: number, max: number) => min + (int % (max - min + 1));
}

export function getMockStripeConnection(
  session: { user?: { email?: string | null } } | null,
  options?: { connectedOverride?: boolean }
) {
  const email = session?.user?.email ?? "founder@example.com";
  const rand = seededRandom(email);
  const envOverride = process.env.STRIPE_CONNECTED === "1";
  const connected = options?.connectedOverride ?? envOverride ?? false;
  const connectedAt = connected ? new Date(baseDate.getTime() - rand(1, 10) * 86400000) : undefined;
  return { connected, mode: "read-only" as const, connectedAt };
}

export function getMockPackets(session: { user?: { email?: string | null } } | null): MockPacket[] {
  const email = session?.user?.email ?? "founder@example.com";
  const rand = seededRandom(email);
  const count = rand(2, 4);
  const statuses: MockPacketStatus[] = ["Draft", "Ready", "Shared"];

  return Array.from({ length: count }).map((_, idx) => {
    const created = new Date(baseDate.getTime() - rand(1, 30) * 86400000 - idx * 86400000);
    const status = statuses[(idx + rand(0, 2)) % statuses.length];
    return {
      id: `pkt_${idx + 1}`,
      name: `Verification Packet ${idx + 1}`,
      createdAt: created.toISOString(),
      status,
      asOfDate: new Date(created.getTime() - 6 * 3600000).toISOString(),
      shareUrl: `https://investor.proofround.com/p/${idx + 1}`,
    };
  });
}

export function getMockMetrics(session: { user?: { email?: string | null } } | null): MockMetrics {
  return {
    mrr: "--",
    arr: "--",
    netRevenue30d: "--",
    churnMoM: "--",
    refunds30d: "--",
  };
}

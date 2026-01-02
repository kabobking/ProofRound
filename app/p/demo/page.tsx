import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export default function InvestorDemoPage() {
  return (
    <div className="bg-[#fafafa]">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Investor view</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight text-zinc-900">Verification Packet Preview</h1>
          <p className="mt-3 text-sm text-zinc-600">Read-only snapshot. No investor account required.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Snapshot" eyebrow="Summary" />
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge>Read-only</Badge>
                <span className="text-xs text-zinc-500">As of --</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <MetricTile label="MRR" value="--" />
                <MetricTile label="ARR" value="--" />
                <MetricTile label="Net revenue (30d)" value="--" />
                <MetricTile label="Refunds (30d)" value="--" />
                <MetricTile label="Churn MoM" value="--" />
              </div>
              <p className="text-xs text-zinc-500">Source-linked to Stripe (read-only). No write permissions.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="What investors see" eyebrow="Access" />
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm text-zinc-700">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Time-stamped packet with key revenue metrics.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Source-linked back to Stripe events for validation.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Read-only access. No credentials or account required.
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

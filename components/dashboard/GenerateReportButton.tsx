"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateReportButton() {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = async () => {
    setLoading(true);
    setShareUrl(null);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate report");
      }

      const data = await res.json();
      setShareUrl(data.shareUrl as string);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate report";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors ${
          loading
            ? "bg-indigo-300 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700"
        }`}
      >
        {loading ? "Generating..." : "Generate investor report"}
      </button>
      {shareUrl ? (
        <div className="flex flex-col gap-2 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <div className="font-medium text-emerald-900">New investor link</div>
          <div className="break-all">{shareUrl}</div>
          <button
            type="button"
            onClick={handleCopy}
            className="self-start rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
          >
            Copy link
          </button>
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {error}
        </div>
      ) : null}
    </div>
  );
}

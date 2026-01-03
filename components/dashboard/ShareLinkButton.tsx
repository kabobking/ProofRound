"use client";

import { useState } from "react";

export default function ShareLinkButton({ reportId }: { reportId: string }) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRotate = async () => {
    setLoading(true);
    setCopied(false);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Unable to generate share link");
      }
      const data = await res.json();
      setShareUrl(data.shareUrl as string);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to generate share link";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleRotate}
        disabled={loading}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors ${
          loading ? "bg-indigo-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
        }`}
      >
        {loading ? "Creating..." : "Create new share link"}
      </button>
      {shareUrl ? (
        <div className="flex flex-col gap-1 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
          <div className="truncate" title={shareUrl}>
            {shareUrl}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="self-start rounded-sm bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          {error}
        </div>
      ) : null}
    </div>
  );
}

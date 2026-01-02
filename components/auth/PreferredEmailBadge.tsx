"use client";

import { useEffect, useState } from "react";

const EMAIL_STORAGE_KEY = "proofround_preferred_email";

export default function PreferredEmailBadge() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(EMAIL_STORAGE_KEY);
      if (saved) {
        setEmail(saved);
      }
    } catch {
      // Ignore localStorage access issues.
    }
  }, []);

  if (!email) {
    return null;
  }

  return (
    <div className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
      Work email: {email} (from login form)
    </div>
  );
}

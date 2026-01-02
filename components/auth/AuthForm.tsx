"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

type AuthMode = "login" | "signup";

const EMAIL_STORAGE_KEY = "proofround_preferred_email";

function isValidEmail(value: string) {
  return value.includes("@");
}

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(EMAIL_STORAGE_KEY);
      if (saved) {
        setEmail(saved);
      }
    } catch {
      // Ignore localStorage access issues (private mode, disabled, etc.).
    }
  }, []);

  const helperCopy = useMemo(() => {
    return mode === "login"
      ? "Don't have an account?"
      : "Already have an account?";
  }, [mode]);

  const helperLink = mode === "login" ? "/get-started" : "/login";
  const helperAction = mode === "login" ? "Sign up" : "Sign in";
  const buttonLabel = mode === "login" ? "Continue with Google" : "Create account with Google";

  const handleChange = (value: string) => {
    setEmail(value);

    if (!value || isValidEmail(value)) {
      setError(null);
    } else {
      setError("Enter a valid email with an @ symbol.");
    }

    try {
      window.localStorage.setItem(EMAIL_STORAGE_KEY, value);
    } catch {
      // Ignore localStorage access issues.
    }
  };

  const handleContinue = async () => {
    const trimmed = email.trim();

    if (trimmed && !isValidEmail(trimmed)) {
      setError("Enter a valid email with an @ symbol.");
      return;
    }

    try {
      window.localStorage.setItem(EMAIL_STORAGE_KEY, trimmed);
    } catch {
      // Ignore localStorage access issues.
    }

    setIsLoading(true);

    const options = { callbackUrl: "/dashboard" };

    if (trimmed) {
      await signIn("google", options, { login_hint: trimmed });
    } else {
      await signIn("google", options);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-900 mb-2">
          Work email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="you@company.com"
          className={`w-full rounded-lg border px-4 py-2.5 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 ${
            error
              ? "border-rose-300 focus:border-rose-400 focus:ring-rose-200"
              : "border-zinc-300 focus:border-indigo-500 focus:ring-indigo-200"
          }`}
        />
        {error ? (
          <p className="mt-2 text-xs text-rose-600">{error}</p>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">Optional for now. We'll remember it for later.</p>
        )}
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleContinue}
          disabled={isLoading}
          className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {isLoading ? "Redirecting to Google..." : buttonLabel}
        </button>
        <p className="text-xs text-zinc-500 text-center">
          Read-only access. No charges. No changes to your Stripe account.
        </p>
      </div>

      <div className="pt-2 border-t border-zinc-200">
        <p className="text-xs text-zinc-500 text-center">
          {helperCopy}{" "}
          <Link href={helperLink} className="font-medium text-indigo-600 hover:text-indigo-700">
            {helperAction}
          </Link>
        </p>
      </div>
    </div>
  );
}

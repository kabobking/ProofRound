"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

type GoogleSignInButtonProps = {
  label?: string;
};

export default function GoogleSignInButton({
  label = "Continue with Google",
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <button
      type="button"
      onClick={handleSignIn}
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-3 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white">
        <svg viewBox="0 0 48 48" className="h-3.5 w-3.5" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.48 0 6.56 1.2 9.01 3.56l6.7-6.7C35.64 2.45 30.2 0 24 0 14.62 0 6.51 5.38 2.66 13.22l7.78 6.04C12.3 13.25 17.7 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.5 24.5c0-1.66-.15-3.26-.43-4.8H24v9.1h12.65c-.55 2.96-2.2 5.46-4.67 7.14l7.22 5.6C43.6 37.4 46.5 31.4 46.5 24.5z"
          />
          <path
            fill="#FBBC05"
            d="M10.44 28.26c-.55-1.62-.86-3.35-.86-5.16 0-1.81.31-3.54.86-5.16l-7.78-6.04C.93 15.55 0 19.67 0 24c0 4.33.93 8.45 2.66 12.1l7.78-7.84z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.2 0 11.4-2.05 15.2-5.56l-7.22-5.6c-2.01 1.35-4.59 2.16-7.98 2.16-6.3 0-11.7-3.75-13.56-9.04l-7.78 7.84C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
      </span>
      <span>{isLoading ? "Redirecting to Google..." : label}</span>
    </button>
  );
}

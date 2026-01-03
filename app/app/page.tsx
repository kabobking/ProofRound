import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AppPage() {
  const session = await getServerSession(authOptions);
  const primaryHref = session ? "/dashboard" : "/login";
  const primaryLabel = session ? "Go to dashboard" : "Sign in to get started";

  return (
    <div className="flex items-center justify-center bg-[#fafafa] py-16">
      <div className="mx-auto max-w-md text-center px-4">
        <h1 className="text-3xl font-medium tracking-tight text-zinc-900 mb-4">
          Proofround application
        </h1>
        <p className="text-zinc-600 mb-8 leading-relaxed">
          Connect your Stripe account with read-only access and generate investor-ready verification packets.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Link
            href={primaryHref}
            className="inline-flex rounded-lg bg-indigo-600 px-6 py-3 text-base font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            {primaryLabel}
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Back to marketing site
          </Link>
        </div>
      </div>
    </div>
  );
}

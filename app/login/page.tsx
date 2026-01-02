import AuthCard from "@/components/auth/AuthCard";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="bg-[#fafafa]">
      <div className="mx-auto max-w-md px-4 py-24 sm:px-6 lg:px-8">
        <AuthCard
          title="Sign in"
          subtitle="Continue with Google to access your Proofround dashboard."
        >
          <div className="space-y-4">
            <GoogleSignInButton />
            <p className="text-xs text-zinc-500 text-center">
              Read-only access. We never make changes to your data.
            </p>
          </div>
        </AuthCard>

        <div className="mt-6 space-y-4">
          <p className="text-xs text-zinc-500 text-center">
            New here?{" "}
            <Link href="/get-started" className="font-medium text-indigo-600 hover:text-indigo-700">
              Create an account
            </Link>
          </p>
          <Link
            href="/"
            className="block text-center text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

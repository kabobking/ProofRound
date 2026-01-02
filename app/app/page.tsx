import Link from 'next/link';

export default function AppPage() {
  return (
    <div className="flex items-center justify-center bg-[#fafafa] py-16">
      <div className="mx-auto max-w-md text-center px-4">
        <h1 className="text-3xl font-medium tracking-tight text-zinc-900 mb-4">
          Dashboard coming soon
        </h1>
        <p className="text-zinc-600 mb-8 leading-relaxed">
          The Proofround dashboard is under development. Check back soon to connect your Stripe account and generate verification packets.
        </p>
        <Link
          href="/"
          className="inline-flex rounded-lg bg-indigo-600 px-6 py-3 text-base font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Return to homepage
        </Link>
      </div>
    </div>
  );
}

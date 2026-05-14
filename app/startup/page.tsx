import { Suspense } from 'react';
import StartupPage from '../app/startup/page';

export default function StartupRoute() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text)]">
					<div className="text-center">
						<div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
						<p className="mt-4 text-[var(--muted)]">Loading startup...</p>
					</div>
				</div>
			}
		>
			<StartupPage />
		</Suspense>
	);
}

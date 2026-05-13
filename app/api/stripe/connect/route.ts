import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startupId = searchParams.get('startupId');
  const startupName = searchParams.get('startupName');

  // If you have a backend Stripe endpoint, redirect to it
  const backendUrl = process.env.NEXT_PUBLIC_STRIPE_CONNECT_BACKEND_URL;
  
  if (backendUrl) {
    const url = new URL('/api/stripe/connect', backendUrl);
    if (startupId) url.searchParams.set('startupId', startupId);
    if (startupName) url.searchParams.set('startupName', startupName);
    return redirect(url.toString());
  }

  // Fallback: redirect to Stripe dashboard setup
  // This would be your Stripe Connect URL from your environment
  const stripeUrl = process.env.NEXT_PUBLIC_STRIPE_OAUTH_URL;
  if (stripeUrl) {
    const url = new URL(stripeUrl);
    if (startupId) url.searchParams.set('startupId', startupId);
    if (startupName) url.searchParams.set('startupName', startupName);
    return redirect(url.toString());
  }

  return Response.json({ error: 'Stripe Connect URL not configured' }, { status: 400 });
}

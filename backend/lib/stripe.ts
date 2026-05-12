import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripeClient() {
  if (stripeInstance) {
    return stripeInstance;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required for the backend');
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  });

  return stripeInstance;
}
import Stripe from "stripe";

export const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2024-11-20";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function getPlatformStripeClient() {
  const secretKey = getRequiredEnv("STRIPE_SECRET_KEY");
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
}

export function getAccountStripeClient(accessToken: string) {
  return new Stripe(accessToken, { apiVersion: STRIPE_API_VERSION });
}

export function buildConnectAuthorizeUrl(state: string) {
  const clientId = getRequiredEnv("STRIPE_CONNECT_CLIENT_ID");
  const redirectUri = getRequiredEnv("STRIPE_CONNECT_REDIRECT_URI");

  const authorizeUrl = new URL("https://connect.stripe.com/oauth/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("scope", "read_only");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("always_prompt", "true");

  return authorizeUrl.toString();
}

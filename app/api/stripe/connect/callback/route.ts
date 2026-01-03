import { NextRequest, NextResponse } from "next/server";
import { getPlatformStripeClient } from "@/lib/stripe";
import { parseStateCookieValue } from "@/lib/crypto";
import { requireAuthenticatedUser } from "@/lib/session";
import { saveStripeConnection } from "@/lib/report-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    const description = searchParams.get("error_description") ?? oauthError;
    return NextResponse.redirect(
      new URL(`/connect?error=${encodeURIComponent(description)}`, origin)
    );
  }

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  const userResult = await requireAuthenticatedUser().catch(() => null);
  if (!userResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { user } = userResult;
  const stateCookie = parseStateCookieValue(request.cookies.get("stripe_oauth_state")?.value);

  const stateExpired = stateCookie ? Date.now() - stateCookie.createdAt > 15 * 60 * 1000 : true;

  if (!stateCookie || stateCookie.state !== stateParam || stateCookie.userId !== user.id || stateExpired) {
    return NextResponse.json({ error: "Invalid or expired state" }, { status: 400 });
  }

  try {
    const stripe = getPlatformStripeClient();
    const tokenResponse = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
      client_id: process.env.STRIPE_CONNECT_CLIENT_ID,
      redirect_uri: process.env.STRIPE_CONNECT_REDIRECT_URI,
    });

    if (!tokenResponse.stripe_user_id || !tokenResponse.access_token) {
      return NextResponse.json({ error: "Invalid token response from Stripe" }, { status: 502 });
    }

    await saveStripeConnection(user.id, {
      accountId: tokenResponse.stripe_user_id,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token ?? undefined,
      connectedAt: new Date(),
    });

    const response = NextResponse.redirect(new URL("/dashboard?connected=1", origin));
    response.cookies.set("stripe_oauth_state", "", {
      maxAge: 0,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error) {
    console.error("Stripe OAuth callback failed", error);
    return NextResponse.json({ error: "Stripe OAuth failed" }, { status: 500 });
  }
}

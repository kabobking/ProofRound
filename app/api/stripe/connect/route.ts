import { NextRequest, NextResponse } from "next/server";
import { buildConnectAuthorizeUrl } from "@/lib/stripe";
import { createStateCookieValue } from "@/lib/crypto";
import { requireAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { state, encoded } = createStateCookieValue(user.id);
    const authorizeUrl = buildConnectAuthorizeUrl(state);

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set("stripe_oauth_state", encoded, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Stripe connect redirect error", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

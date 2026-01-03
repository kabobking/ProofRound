import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { getOrCreateUserByEmail } from "./report-service";

export async function requireAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    throw new Error("Unauthorized");
  }

  const user = await getOrCreateUserByEmail(session.user.email);
  return { session, user };
}

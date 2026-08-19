import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserPlanContext } from "./db/users";
import { getPlan } from "./plans";

export function isClerkConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
}

export async function getAuthContext() {
  if (!isClerkConfigured()) {
    return {
      userId: null as string | null,
      email: null as string | null,
      plan: getPlan("guest"),
      user: null,
      authEnabled: false,
    };
  }

  const { userId } = await auth();
  if (!userId) {
    return {
      userId: null,
      email: null,
      plan: getPlan("guest"),
      user: null,
      authEnabled: true,
    };
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  const context = await getUserPlanContext(userId, email);
  return {
    userId,
    email,
    plan: context.plan,
    user: context.user,
    authEnabled: true,
  };
}
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Keep most page routes public; APIs enforce auth/plan themselves with JSON errors.
const isProtectedRoute = createRouteMatcher(["/site(.*)", "/admin(.*)"]);

const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

const clerkProxy = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export default clerkConfigured
  ? clerkProxy
  : function proxy() {
      return;
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
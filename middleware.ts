import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInPage = createRouteMatcher(["/signin"]);
const isProtectedRoute = createRouteMatcher(["/", "/onboarding", "/lesson-plans/:path*", "/lesson-notes/:path*", "/settings"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const isAuthenticated = await convexAuth.isAuthenticated();
  
  // Redirect authenticated users away from signin page
  // Redirect to onboarding first - onboarding page will redirect to home if already completed
  // This prevents users from seeing the home page flash before onboarding
  if (isSignInPage(request) && isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/onboarding");
  }
  
  // Protect routes that require authentication
  if (isProtectedRoute(request) && !isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/signin");
  }
  
  // Onboarding page is protected - users must be authenticated
  // The page itself will check if onboarding is completed and redirect accordingly
  // No additional middleware logic needed here since the page handles the check
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

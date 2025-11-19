"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";

export default function Home() {
  const router = useRouter();
  const userProfile = useQuery(api.functions.userProfile.queries.getCurrentUserProfile);

  // Redirect immediately without rendering anything if onboarding not completed
  useEffect(() => {
    if (userProfile !== undefined) {
      if (userProfile === null) {
        // Not authenticated, redirect to signin (middleware should handle this, but safety check)
        router.replace("/signin");
        return;
      }
      if (!userProfile.onboardingCompleted) {
        // Authenticated but onboarding not completed - redirect immediately
        router.replace("/onboarding");
        return;
      }
    }
  }, [userProfile, router]);

  // Don't render anything until we know onboarding is completed
  // This prevents the flash of home page content
  if (userProfile === undefined) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center">
        <Spinner className="size-8" />
      </main>
    );
  }

  // Don't render home if not authenticated or onboarding not completed
  // Return null immediately to prevent any flash
  if (userProfile === null || !userProfile.onboardingCompleted) {
    return null;
  }

  return (
    <main>
      <h1>Hello World</h1>
    </main>
  );
}



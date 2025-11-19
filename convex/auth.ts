import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    // Automatically create userProfile when a user signs in with Google
    async afterUserCreatedOrUpdated(
      ctx: MutationCtx,
      args: {
        userId: Id<"users">;
        profile?: {
          email?: string | null;
          name?: string | null;
          image?: string | null;
        };
        account?: {
          providerAccountId?: string;
          provider?: string;
        };
      }
    ) {
      const userId = args.userId;
      
      // Check if profile already exists
      const existingProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .first();

      // Get Google account data from callback args
      const email = args.profile?.email ?? undefined;
      const name = args.profile?.name ?? undefined;
      const profilePhoto = args.profile?.image ?? undefined;
      const googleId = args.account?.providerAccountId ?? undefined;

      if (!existingProfile && email && name) {
        // Create userProfile with Google data
        try {
          await ctx.db.insert("userProfiles", {
            userId,
            name,
            email,
            profilePhoto,
            googleId,
            preferredLanguage: "en", // Default to English
            onboardingCompleted: false, // Will be set to true when schoolName and country are provided
          });
        } catch (error) {
          console.error("Error creating user profile in callback:", error);
          // Don't throw - allow sign-in to continue even if profile creation fails
          // The user can complete onboarding manually
        }
      } else if (existingProfile) {
        // Update existing profile with latest Google data if needed
        const updates: {
          name?: string;
          email?: string;
          profilePhoto?: string;
          googleId?: string;
        } = {};

        if (name && name !== existingProfile.name) {
          updates.name = name;
        }
        if (email && email !== existingProfile.email) {
          updates.email = email;
        }
        if (profilePhoto && profilePhoto !== existingProfile.profilePhoto) {
          updates.profilePhoto = profilePhoto;
        }
        if (googleId && googleId !== existingProfile.googleId) {
          updates.googleId = googleId;
        }

        if (Object.keys(updates).length > 0) {
          try {
            await ctx.db.patch(existingProfile._id, updates);
          } catch (error) {
            console.error("Error updating user profile in callback:", error);
          }
        }
      }
    },
  },
});

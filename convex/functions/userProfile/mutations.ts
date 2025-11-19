import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { capitalizeWords, normalizeWhitespace } from "../utils/string";
import {
  createAuthError,
  createNotFoundError,
  createValidationError,
} from "../utils/errors";

/**
 * Create or update user profile after Google OAuth sign-in
 * Requires authentication - this should be called after successful Google OAuth authentication
 * Users can only create/update their own profile
 * Default language is set to English ("en") for new profiles
 */
export const createOrUpdateUserProfile = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    profilePhoto: v.optional(v.string()),
    googleId: v.optional(v.string()),
    schoolName: v.optional(v.string()),
    country: v.optional(v.string()),
    preferredLanguage: v.optional(v.union(v.literal("en"), v.literal("fr"), v.literal("rw"))),
  },
  returns: v.id("userProfiles"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (existingProfile) {
      // Update existing profile
      const updates: {
        name?: string;
        email?: string;
        profilePhoto?: string;
        googleId?: string;
        schoolName?: string;
        country?: string;
        preferredLanguage?: "en" | "fr" | "rw";
        onboardingCompleted?: boolean;
      } = {};

      if (args.name !== undefined) updates.name = args.name;
      if (args.email !== undefined) updates.email = args.email;
      if (args.profilePhoto !== undefined) updates.profilePhoto = args.profilePhoto;
      if (args.googleId !== undefined) updates.googleId = args.googleId;
      if (args.schoolName !== undefined) {
        // Capitalize and normalize school name
        updates.schoolName = capitalizeWords(normalizeWhitespace(args.schoolName));
      }
      if (args.country !== undefined) {
        // Capitalize and normalize country name
        updates.country = capitalizeWords(normalizeWhitespace(args.country));
      }
      if (args.preferredLanguage !== undefined) updates.preferredLanguage = args.preferredLanguage;

      // Check if onboarding should be marked as completed
      // Onboarding is complete when both schoolName and country are provided
      const finalSchoolName = args.schoolName !== undefined 
        ? capitalizeWords(normalizeWhitespace(args.schoolName))
        : existingProfile.schoolName;
      const finalCountry = args.country !== undefined 
        ? capitalizeWords(normalizeWhitespace(args.country))
        : existingProfile.country;
      
      if (finalSchoolName && finalCountry) {
        updates.onboardingCompleted = true;
      }

      try {
        await ctx.db.patch(existingProfile._id, updates);
        return existingProfile._id;
      } catch (error) {
        console.error("Error updating user profile:", error);
        throw createValidationError(
          "profile update",
          "Failed to update profile",
          "Please try again. If the problem persists, refresh the page."
        );
      }
    } else {
      // Create new profile with default language set to English
      // Capitalize and normalize schoolName and country before saving
      const schoolName = args.schoolName 
        ? capitalizeWords(normalizeWhitespace(args.schoolName))
        : undefined;
      const country = args.country 
        ? capitalizeWords(normalizeWhitespace(args.country))
        : undefined;
      
      // Onboarding is complete when both schoolName and country are provided
      const onboardingCompleted = !!(schoolName && country);
      
      try {
        return await ctx.db.insert("userProfiles", {
          userId,
          name: args.name.trim(),
          email: args.email.trim(),
          profilePhoto: args.profilePhoto,
          googleId: args.googleId,
          schoolName,
          country,
          preferredLanguage: args.preferredLanguage ?? "en", // Default to English
          onboardingCompleted,
        });
      } catch (error) {
        console.error("Error creating user profile:", error);
        throw createValidationError(
          "profile creation",
          "Failed to create profile",
          "Please try again. If the problem persists, refresh the page or contact support."
        );
      }
    }
  },
});

/**
 * Update user preferred language
 * Requires authentication - users can only update their own language preference
 * Supported languages: "en" (English), "fr" (French), "rw" (Kinyarwanda)
 * Returns the updated preferred language
 */
export const updatePreferredLanguage = mutation({
  args: {
    preferredLanguage: v.union(v.literal("en"), v.literal("fr"), v.literal("rw")),
  },
  returns: v.union(v.literal("en"), v.literal("fr"), v.literal("rw")),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw createAuthError();
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw createNotFoundError(
        "user profile",
        undefined,
        "Please complete your profile setup first. Go to your profile settings to create your profile."
      );
    }

    try {
      await ctx.db.patch(profile._id, {
        preferredLanguage: args.preferredLanguage,
      });

      return args.preferredLanguage;
    } catch (error) {
      console.error("Error updating preferred language:", error);
      throw createValidationError(
        "language preference",
        "Failed to update language preference",
        "Please try again. If the problem persists, refresh the page."
      );
    }
  },
});



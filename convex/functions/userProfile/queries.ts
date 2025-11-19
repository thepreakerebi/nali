import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get the current authenticated user's profile
 * Returns null if not authenticated or profile doesn't exist
 * Users can only access their own profile
 */
export const getCurrentUserProfile = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("userProfiles"),
      _creationTime: v.number(),
      userId: v.id("users"),
      name: v.string(),
      email: v.string(),
      profilePhoto: v.optional(v.string()),
      googleId: v.optional(v.string()),
      schoolName: v.optional(v.string()),
      preferredLanguage: v.optional(
        v.union(v.literal("en"), v.literal("fr"), v.literal("rw"))
      ),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    return profile ?? null;
  },
});

/**
 * Get user profile by user ID
 * Requires authentication - users can only access their own profile
 */
export const getProfileByUserId = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("userProfiles"),
      _creationTime: v.number(),
      userId: v.id("users"),
      name: v.string(),
      email: v.string(),
      profilePhoto: v.optional(v.string()),
      googleId: v.optional(v.string()),
      schoolName: v.optional(v.string()),
      preferredLanguage: v.optional(
        v.union(v.literal("en"), v.literal("fr"), v.literal("rw"))
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (currentUserId === null) {
      return null;
    }

    // Authorization check: users can only access their own profile
    if (currentUserId !== args.userId) {
      return null;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();
    return profile ?? null;
  },
});

/**
 * Get the current user's preferred language
 * Returns null if not authenticated, profile doesn't exist, or language is not set
 * Returns the preferred language code ("en", "fr", or "rw") if set
 */
export const getPreferredLanguage = query({
  args: {},
  returns: v.union(
    v.literal("en"),
    v.literal("fr"),
    v.literal("rw"),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    return profile?.preferredLanguage ?? null;
  },
});


import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Internal query to get user profile by user ID
 */
export const getProfileByUserId = internalQuery({
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
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();
    return profile ?? null;
  },
});


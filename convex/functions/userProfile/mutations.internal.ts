import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Internal mutation to create user profile
 */
export const createProfile = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    email: v.string(),
    profilePhoto: v.optional(v.string()),
    googleId: v.optional(v.string()),
    schoolName: v.optional(v.string()),
  },
  returns: v.id("userProfiles"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("userProfiles", {
      userId: args.userId,
      name: args.name,
      email: args.email,
      profilePhoto: args.profilePhoto,
      googleId: args.googleId,
      schoolName: args.schoolName,
    });
  },
});

/**
 * Internal mutation to update user profile
 */
export const updateProfile = internalMutation({
  args: {
    profileId: v.id("userProfiles"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    profilePhoto: v.optional(v.string()),
    googleId: v.optional(v.string()),
    schoolName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: {
      name?: string;
      email?: string;
      profilePhoto?: string;
      googleId?: string;
      schoolName?: string;
    } = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;
    if (args.profilePhoto !== undefined) updates.profilePhoto = args.profilePhoto;
    if (args.googleId !== undefined) updates.googleId = args.googleId;
    if (args.schoolName !== undefined) updates.schoolName = args.schoolName;

    await ctx.db.patch(args.profileId, updates);
    return null;
  },
});


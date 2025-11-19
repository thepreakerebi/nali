import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * List all classes for the current authenticated user
 * Returns empty array if not authenticated
 */
export const listClasses = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("classes"),
      _creationTime: v.number(),
      userId: v.id("users"),
      name: v.string(),
      gradeLevel: v.string(),
      academicYear: v.string(),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    return await ctx.db
      .query("classes")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();
  },
});

/**
 * Get count of classes for the current authenticated user
 * Returns 0 if not authenticated
 */
export const getClassesCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return 0;
    }

    const classes = await ctx.db
      .query("classes")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();
    
    return classes.length;
  },
});

/**
 * Get a class by ID
 * Requires authentication and returns null if class doesn't exist or user doesn't own it
 */
export const getClass = query({
  args: {
    classId: v.id("classes"),
  },
  returns: v.union(
    v.object({
      _id: v.id("classes"),
      _creationTime: v.number(),
      userId: v.id("users"),
      name: v.string(),
      gradeLevel: v.string(),
      academicYear: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const classDoc = await ctx.db.get(args.classId);
    // Authorization check: only return class if user owns it
    if (!classDoc || classDoc.userId !== userId) {
      return null;
    }

    return classDoc;
  },
});

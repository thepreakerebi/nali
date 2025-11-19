import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * List all subjects for the current authenticated user
 * Returns empty array if not authenticated
 */
export const listSubjects = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("subjects"),
      _creationTime: v.number(),
      userId: v.id("users"),
      classId: v.id("classes"),
      name: v.string(),
      description: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    return await ctx.db
      .query("subjects")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

/**
 * Get count of subjects for the current authenticated user
 * Returns 0 if not authenticated
 */
export const getSubjectsCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return 0;
    }

    const subjects = await ctx.db
      .query("subjects")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();
    
    return subjects.length;
  },
});

/**
 * Get a subject by ID
 * Requires authentication and returns null if subject doesn't exist or user doesn't own it
 */
export const getSubject = query({
  args: {
    subjectId: v.id("subjects"),
  },
  returns: v.union(
    v.object({
      _id: v.id("subjects"),
      _creationTime: v.number(),
      userId: v.id("users"),
      classId: v.id("classes"),
      name: v.string(),
      description: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const subjectDoc = await ctx.db.get(args.subjectId);
    // Authorization check: only return subject if user owns it
    if (!subjectDoc || subjectDoc.userId !== userId) {
      return null;
    }

    return subjectDoc;
  },
});

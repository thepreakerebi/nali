import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Create a new subject
 * Requires authentication - user must be signed in
 */
export const createSubject = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("subjects"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    return await ctx.db.insert("subjects", {
      userId,
      name: args.name,
      description: args.description,
    });
  },
});

/**
 * Update subject details
 * Requires authentication and ownership of the subject
 */
export const updateSubject = mutation({
  args: {
    subjectId: v.id("subjects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    const subjectDoc = await ctx.db.get(args.subjectId);
    if (!subjectDoc) {
      throw new Error("Subject not found");
    }

    // Authorization check: ensure user owns this subject
    if (subjectDoc.userId !== userId) {
      throw new Error("Unauthorized: You can only update your own subjects");
    }

    const updates: {
      name?: string;
      description?: string;
    } = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.subjectId, updates);
    return null;
  },
});

/**
 * Delete a subject
 * Requires authentication and ownership of the subject
 * Prevents deletion if there are associated lesson plans
 */
export const deleteSubject = mutation({
  args: {
    subjectId: v.id("subjects"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    const subjectDoc = await ctx.db.get(args.subjectId);
    if (!subjectDoc) {
      throw new Error("Subject not found");
    }

    // Authorization check: ensure user owns this subject
    if (subjectDoc.userId !== userId) {
      throw new Error("Unauthorized: You can only delete your own subjects");
    }

    // Check if there are any lesson plans using this subject
    const lessonPlans = await ctx.db
      .query("lessonPlans")
      .withIndex("by_subject_id", (q) => q.eq("subjectId", args.subjectId))
      .first();

    if (lessonPlans) {
      throw new Error(
        "Cannot delete subject: There are lesson plans associated with this subject"
      );
    }

    await ctx.db.delete(args.subjectId);
    return null;
  },
});


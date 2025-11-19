import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Create a new class
 * Requires authentication - user must be signed in
 */
export const createClass = mutation({
  args: {
    name: v.string(),
    gradeLevel: v.string(),
    academicYear: v.string(),
  },
  returns: v.id("classes"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    return await ctx.db.insert("classes", {
      userId,
      name: args.name,
      gradeLevel: args.gradeLevel,
      academicYear: args.academicYear,
    });
  },
});

/**
 * Update class details
 * Requires authentication and ownership of the class
 */
export const updateClass = mutation({
  args: {
    classId: v.id("classes"),
    name: v.optional(v.string()),
    gradeLevel: v.optional(v.string()),
    academicYear: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    const classDoc = await ctx.db.get(args.classId);
    if (!classDoc) {
      throw new Error("Class not found");
    }

    // Authorization check: ensure user owns this class
    if (classDoc.userId !== userId) {
      throw new Error("Unauthorized: You can only update your own classes");
    }

    const updates: {
      name?: string;
      gradeLevel?: string;
      academicYear?: string;
    } = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.gradeLevel !== undefined) updates.gradeLevel = args.gradeLevel;
    if (args.academicYear !== undefined) updates.academicYear = args.academicYear;

    await ctx.db.patch(args.classId, updates);
    return null;
  },
});

/**
 * Delete a class
 * Requires authentication and ownership of the class
 * Prevents deletion if there are associated lesson plans
 */
export const deleteClass = mutation({
  args: {
    classId: v.id("classes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    const classDoc = await ctx.db.get(args.classId);
    if (!classDoc) {
      throw new Error("Class not found");
    }

    // Authorization check: ensure user owns this class
    if (classDoc.userId !== userId) {
      throw new Error("Unauthorized: You can only delete your own classes");
    }

    // Check if there are any lesson plans using this class
    const lessonPlans = await ctx.db
      .query("lessonPlans")
      .withIndex("by_class_id", (q) => q.eq("classId", args.classId))
      .first();

    if (lessonPlans) {
      throw new Error(
        "Cannot delete class: There are lesson plans associated with this class"
      );
    }

    await ctx.db.delete(args.classId);
    return null;
  },
});


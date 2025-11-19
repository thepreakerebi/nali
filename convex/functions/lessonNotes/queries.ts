import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * List all lesson notes for the current authenticated user
 * Supports filtering by lessonPlanId
 * Returns empty array if not authenticated
 * Returns all results (no pagination) for sidebar display like Notion
 */
export const listLessonNotes = query({
  args: {
    lessonPlanId: v.optional(v.id("lessonPlans")),
  },
  returns: v.array(
    v.object({
      _id: v.id("lessonNotes"),
      _creationTime: v.number(),
      userId: v.id("users"),
      lessonPlanId: v.id("lessonPlans"),
      title: v.string(),
      content: v.any(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    // Store optional value in constant for proper type narrowing
    const lessonPlanId = args.lessonPlanId;

    if (lessonPlanId) {
      // Filter by lesson plan
      const notes = await ctx.db
        .query("lessonNotes")
        .withIndex("by_lesson_plan_id", (q) => q.eq("lessonPlanId", lessonPlanId))
        .order("desc")
        .collect();

      // Verify ownership (filter in memory)
      return notes.filter((note) => note.userId === userId);
    } else {
      // Filter by user only
      return await ctx.db
        .query("lessonNotes")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();
    }
  },
});

/**
 * Get a lesson note by ID
 * Requires authentication and returns null if note doesn't exist or user doesn't own it
 */
export const getLessonNote = query({
  args: {
    lessonNoteId: v.id("lessonNotes"),
  },
  returns: v.union(
    v.object({
      _id: v.id("lessonNotes"),
      _creationTime: v.number(),
      userId: v.id("users"),
      lessonPlanId: v.id("lessonPlans"),
      title: v.string(),
      content: v.any(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const lessonNote = await ctx.db.get(args.lessonNoteId);
    // Authorization check: only return note if user owns it
    if (!lessonNote || lessonNote.userId !== userId) {
      return null;
    }

    return lessonNote;
  },
});


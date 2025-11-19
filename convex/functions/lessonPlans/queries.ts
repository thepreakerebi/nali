import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * List all lesson plans for the current authenticated user
 * Supports filtering by classId and/or subjectId
 * Returns empty array if not authenticated
 * Returns all results (no pagination) for sidebar display like Notion
 */
export const listLessonPlans = query({
  args: {
    classId: v.optional(v.id("classes")),
    subjectId: v.optional(v.id("subjects")),
  },
  returns: v.array(
    v.object({
      _id: v.id("lessonPlans"),
      _creationTime: v.number(),
      userId: v.id("users"),
      classId: v.id("classes"),
      subjectId: v.id("subjects"),
      title: v.string(),
      content: v.any(),
      objectives: v.optional(v.array(v.string())),
      materials: v.optional(v.array(v.string())),
      methods: v.optional(v.array(v.string())),
      assessment: v.optional(v.array(v.string())),
      references: v.optional(v.array(v.string())),
      resources: v.optional(
        v.array(
          v.object({
            type: v.union(v.literal("youtube"), v.literal("document"), v.literal("link")),
            title: v.string(),
            url: v.string(),
            description: v.optional(v.string()),
          })
        )
      ),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    // Store optional values in constants for proper type narrowing
    const classId = args.classId;
    const subjectId = args.subjectId;

    // Apply filters based on provided arguments
    if (classId && subjectId) {
      // Both filters: use compound index for class, filter subject in memory
      const plans = await ctx.db
        .query("lessonPlans")
        .withIndex("by_user_id_and_class_id", (q) =>
          q.eq("userId", userId).eq("classId", classId)
        )
        .order("desc")
        .collect();
      
      return plans.filter((plan) => plan.subjectId === subjectId);
    } else if (classId) {
      // Filter by class only
      return await ctx.db
        .query("lessonPlans")
        .withIndex("by_user_id_and_class_id", (q) =>
          q.eq("userId", userId).eq("classId", classId)
        )
        .order("desc")
        .collect();
    } else if (subjectId) {
      // Filter by subject only
      return await ctx.db
        .query("lessonPlans")
        .withIndex("by_user_id_and_subject_id", (q) =>
          q.eq("userId", userId).eq("subjectId", subjectId)
        )
        .order("desc")
        .collect();
    } else {
      // No filters: use user index
      return await ctx.db
        .query("lessonPlans")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();
    }
  },
});

/**
 * Get a lesson plan by ID
 * Requires authentication and returns null if plan doesn't exist or user doesn't own it
 */
export const getLessonPlan = query({
  args: {
    lessonPlanId: v.id("lessonPlans"),
  },
  returns: v.union(
    v.object({
      _id: v.id("lessonPlans"),
      _creationTime: v.number(),
      userId: v.id("users"),
      classId: v.id("classes"),
      subjectId: v.id("subjects"),
      title: v.string(),
      content: v.any(),
      objectives: v.optional(v.array(v.string())),
      materials: v.optional(v.array(v.string())),
      methods: v.optional(v.array(v.string())),
      assessment: v.optional(v.array(v.string())),
      references: v.optional(v.array(v.string())),
      resources: v.optional(
        v.array(
          v.object({
            type: v.union(v.literal("youtube"), v.literal("document"), v.literal("link")),
            title: v.string(),
            url: v.string(),
            description: v.optional(v.string()),
          })
        )
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const lessonPlan = await ctx.db.get(args.lessonPlanId);
    // Authorization check: only return plan if user owns it
    if (!lessonPlan || lessonPlan.userId !== userId) {
      return null;
    }

    return lessonPlan;
  },
});


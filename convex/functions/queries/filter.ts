import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Unified filter function for lesson plans and lesson notes
 * Supports filtering by classId, subjectId, and lessonPlanId
 * Returns all results (no pagination) for sidebar display like Notion
 */
export const filterContent = query({
  args: {
    contentType: v.union(v.literal("lessonPlans"), v.literal("lessonNotes")),
    classId: v.optional(v.id("classes")),
    subjectId: v.optional(v.id("subjects")),
    lessonPlanId: v.optional(v.id("lessonPlans")),
  },
  returns: v.union(
    v.array(
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
    v.array(
      v.object({
        _id: v.id("lessonNotes"),
        _creationTime: v.number(),
        userId: v.id("users"),
        lessonPlanId: v.id("lessonPlans"),
        title: v.string(),
        content: v.any(),
      })
    )
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    // Store optional values in constants for proper type narrowing
    const classId = args.classId;
    const subjectId = args.subjectId;
    const lessonPlanId = args.lessonPlanId;

    if (args.contentType === "lessonPlans") {
      // Filter lesson plans
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
    } else {
      // Filter lesson notes
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
    }
  },
});


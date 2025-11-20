import { query, internalQuery } from "../../_generated/server";
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

    // Helper function to exclude embedding field from results
    const excludeEmbedding = (plan: any) => {
      const { embedding, ...planWithoutEmbedding } = plan;
      return planWithoutEmbedding;
    };

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
      
      return plans
        .filter((plan) => plan.subjectId === subjectId)
        .map(excludeEmbedding);
    } else if (classId) {
      // Filter by class only
      const plans = await ctx.db
        .query("lessonPlans")
        .withIndex("by_user_id_and_class_id", (q) =>
          q.eq("userId", userId).eq("classId", classId)
        )
        .order("desc")
        .collect();
      
      return plans.map(excludeEmbedding);
    } else if (subjectId) {
      // Filter by subject only
      const plans = await ctx.db
        .query("lessonPlans")
        .withIndex("by_user_id_and_subject_id", (q) =>
          q.eq("userId", userId).eq("subjectId", subjectId)
        )
        .order("desc")
        .collect();
      
      return plans.map(excludeEmbedding);
    } else {
      // No filters: use user index
      const plans = await ctx.db
        .query("lessonPlans")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();
      
      return plans.map(excludeEmbedding);
    }
  },
});

/**
 * Get count of lesson plans for the current authenticated user
 * Returns 0 if not authenticated
 */
export const getLessonPlansCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return 0;
    }

    const lessonPlans = await ctx.db
      .query("lessonPlans")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();
    
    return lessonPlans.length;
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

    // Exclude embedding field from response (not needed on frontend)
    const { embedding, ...planWithoutEmbedding } = lessonPlan;
    return planWithoutEmbedding;
  },
});

// ========== Internal Queries (for use by other backend functions) ==========

/**
 * Internal query to load lesson plans by IDs
 */
export const loadPlansByIds = internalQuery({
  args: {
    planIds: v.array(v.id("lessonPlans")),
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
      embedding: v.optional(v.array(v.float64())),
    })
  ),
  handler: async (ctx, args) => {
    const plans = [];
    for (const id of args.planIds) {
      const plan = await ctx.db.get(id);
      if (plan) {
        plans.push(plan);
      }
    }
    return plans;
  },
});

/**
 * Internal query to get class details
 */
export const getClassInternal = internalQuery({
  args: {
    classId: v.id("classes"),
  },
  returns: v.union(
    v.object({
      _id: v.id("classes"),
      name: v.string(),
      gradeLevel: v.string(),
      academicYear: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const classDoc = await ctx.db.get(args.classId);
    if (!classDoc) {
      return null;
    }
    return {
      _id: classDoc._id,
      name: classDoc.name,
      gradeLevel: classDoc.gradeLevel,
      academicYear: classDoc.academicYear,
    };
  },
});

/**
 * Internal query to get subject details
 */
export const getSubjectInternal = internalQuery({
  args: {
    subjectId: v.id("subjects"),
  },
  returns: v.union(
    v.object({
      _id: v.id("subjects"),
      name: v.string(),
      description: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const subjectDoc = await ctx.db.get(args.subjectId);
    if (!subjectDoc) {
      return null;
    }
    return {
      _id: subjectDoc._id,
      name: subjectDoc.name,
      description: subjectDoc.description,
    };
  },
});

/**
 * Internal query to get class and subject details
 */
export const getClassAndSubjectDetails = internalQuery({
  args: {
    classId: v.id("classes"),
    subjectId: v.id("subjects"),
  },
  returns: v.object({
    class: v.object({
      _id: v.id("classes"),
      name: v.string(),
      gradeLevel: v.string(),
      academicYear: v.string(),
    }),
    subject: v.object({
      _id: v.id("subjects"),
      name: v.string(),
      description: v.optional(v.string()),
    }),
  }),
  handler: async (ctx, args) => {
    const classDoc = await ctx.db.get(args.classId);
    const subjectDoc = await ctx.db.get(args.subjectId);

    if (!classDoc) {
      throw new Error("Class not found");
    }
    if (!subjectDoc) {
      throw new Error("Subject not found");
    }

    return {
      class: {
        _id: classDoc._id,
        name: classDoc.name,
        gradeLevel: classDoc.gradeLevel,
        academicYear: classDoc.academicYear,
      },
      subject: {
        _id: subjectDoc._id,
        name: subjectDoc.name,
        description: subjectDoc.description,
      },
    };
  },
});

/**
 * Internal query to get lesson plan title and content for embedding generation
 */
export const getLessonPlanForEmbedding = internalQuery({
  args: {
    lessonPlanId: v.id("lessonPlans"),
  },
  returns: v.union(
    v.object({
      title: v.string(),
      content: v.any(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.lessonPlanId);
    if (!plan) {
      return null;
    }
    return {
      title: plan.title,
      content: plan.content,
    };
  },
});

/**
 * Internal query to get lesson plan title only
 */
export const getLessonPlanTitle = internalQuery({
  args: {
    lessonPlanId: v.id("lessonPlans"),
  },
  returns: v.union(
    v.object({
      title: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.lessonPlanId);
    if (!plan) {
      return null;
    }
    return {
      title: plan.title,
    };
  },
});


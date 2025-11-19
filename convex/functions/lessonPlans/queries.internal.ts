import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

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


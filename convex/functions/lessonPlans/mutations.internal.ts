import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Internal mutation to create a lesson plan
 */
export const createLessonPlan = internalMutation({
  args: {
    userId: v.id("users"),
    classId: v.id("classes"),
    subjectId: v.id("subjects"),
    title: v.string(),
    content: v.any(), // Blocknote.js JSON format
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
  },
  returns: v.id("lessonPlans"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("lessonPlans", {
      userId: args.userId,
      classId: args.classId,
      subjectId: args.subjectId,
      title: args.title,
      content: args.content,
      objectives: args.objectives,
      materials: args.materials,
      methods: args.methods,
      assessment: args.assessment,
      references: args.references,
      resources: args.resources,
      embedding: args.embedding,
    });
  },
});

/**
 * Internal mutation to update lesson plan
 * Used by scheduled actions that don't have auth context
 * Ownership is verified before scheduling
 */
export const updateLessonPlan = internalMutation({
  args: {
    lessonPlanId: v.id("lessonPlans"),
    title: v.optional(v.string()),
    content: v.optional(v.any()), // Blocknote.js JSON format
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: {
      title?: string;
      content?: unknown;
      objectives?: string[];
      materials?: string[];
      methods?: string[];
      assessment?: string[];
      references?: string[];
      resources?: Array<{
        type: "youtube" | "document" | "link";
        title: string;
        url: string;
        description?: string;
      }>;
    } = {};

    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.objectives !== undefined) updates.objectives = args.objectives;
    if (args.materials !== undefined) updates.materials = args.materials;
    if (args.methods !== undefined) updates.methods = args.methods;
    if (args.assessment !== undefined) updates.assessment = args.assessment;
    if (args.references !== undefined) updates.references = args.references;
    if (args.resources !== undefined) updates.resources = args.resources;

    await ctx.db.patch(args.lessonPlanId, updates);
    return null;
  },
});

/**
 * Internal mutation to update lesson plan embedding
 */
export const updateEmbedding = internalMutation({
  args: {
    lessonPlanId: v.id("lessonPlans"),
    embedding: v.array(v.float64()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.lessonPlanId, {
      embedding: args.embedding,
    });
    return null;
  },
});


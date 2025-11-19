import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../../_generated/api";

/**
 * Update a lesson plan
 * Requires authentication and ownership of the lesson plan
 * This mutation is called automatically when Blocknote.js content is edited
 * Automatically schedules embedding update when content or title changes
 */
export const updateLessonPlan = mutation({
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
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    const lessonPlan = await ctx.db.get(args.lessonPlanId);
    if (!lessonPlan) {
      throw new Error("Lesson plan not found");
    }

    // Authorization check: ensure user owns this lesson plan
    if (lessonPlan.userId !== userId) {
      throw new Error("Unauthorized: You can only update your own lesson plans");
    }

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
      embedding?: number[];
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

    // Schedule embedding update if content or title changed
    // This runs asynchronously in an action (which can call node functions)
    if (args.content !== undefined || args.title !== undefined) {
      await ctx.scheduler.runAfter(
        0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (internal as any).functions.lessonPlans.actions.updateEmbedding.updateLessonPlanEmbedding,
        {
          lessonPlanId: args.lessonPlanId,
        }
      );
    }

    return null;
  },
});

/**
 * Delete a lesson plan
 * Requires authentication and ownership of the lesson plan
 * Also deletes all associated lesson notes
 */
export const deleteLessonPlan = mutation({
  args: {
    lessonPlanId: v.id("lessonPlans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    const lessonPlan = await ctx.db.get(args.lessonPlanId);
    if (!lessonPlan) {
      throw new Error("Lesson plan not found");
    }

    // Authorization check: ensure user owns this lesson plan
    if (lessonPlan.userId !== userId) {
      throw new Error("Unauthorized: You can only delete your own lesson plans");
    }

    // Delete all associated lesson notes
    const lessonNotes = await ctx.db
      .query("lessonNotes")
      .withIndex("by_lesson_plan_id", (q) => q.eq("lessonPlanId", args.lessonPlanId))
      .collect();

    for (const note of lessonNotes) {
      // Verify ownership before deleting (safety check)
      if (note.userId === userId) {
        await ctx.db.delete(note._id);
      }
    }

    // Delete the lesson plan
    await ctx.db.delete(args.lessonPlanId);
    return null;
  },
});


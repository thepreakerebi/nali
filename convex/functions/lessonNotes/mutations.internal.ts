import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Internal mutation to create a new lesson note.
 * Used by the AI agent action to store generated notes.
 */
export const createLessonNote = internalMutation({
  args: {
    userId: v.id("users"),
    lessonPlanId: v.id("lessonPlans"),
    title: v.string(),
    content: v.any(), // Blocknote.js JSON format
    embedding: v.optional(v.array(v.float64())),
  },
  returns: v.id("lessonNotes"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("lessonNotes", {
      userId: args.userId,
      lessonPlanId: args.lessonPlanId,
      title: args.title,
      content: args.content,
      embedding: args.embedding,
    });
  },
});


import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Internal mutation to update lesson note embedding
 */
export const updateEmbedding = internalMutation({
  args: {
    lessonNoteId: v.id("lessonNotes"),
    embedding: v.array(v.float64()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.lessonNoteId, {
      embedding: args.embedding,
    });
    return null;
  },
});


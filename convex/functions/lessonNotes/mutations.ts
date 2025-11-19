import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../../_generated/api";

/**
 * Update a lesson note
 * Requires authentication and ownership of the lesson note
 * This mutation is called automatically when Blocknote.js content is edited
 * Automatically schedules embedding update when content or title changes
 */
export const updateLessonNote = mutation({
  args: {
    lessonNoteId: v.id("lessonNotes"),
    title: v.optional(v.string()),
    content: v.optional(v.any()), // Blocknote.js JSON format
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    const lessonNote = await ctx.db.get(args.lessonNoteId);
    if (!lessonNote) {
      throw new Error("Lesson note not found");
    }

    // Authorization check: ensure user owns this lesson note
    if (lessonNote.userId !== userId) {
      throw new Error("Unauthorized: You can only update your own lesson notes");
    }

    const updates: {
      title?: string;
      content?: unknown;
      embedding?: number[];
    } = {};

    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;

    await ctx.db.patch(args.lessonNoteId, updates);

    // Schedule embedding update if content or title changed
    // This runs asynchronously in an action (which can call node functions)
    if (args.content !== undefined || args.title !== undefined) {
      await ctx.scheduler.runAfter(
        0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (internal as any).functions.lessonNotes.actions.updateEmbedding.updateLessonNoteEmbedding,
        {
          lessonNoteId: args.lessonNoteId,
        }
      );
    }

    return null;
  },
});

/**
 * Delete a lesson note
 * Requires authentication and ownership of the lesson note
 */
export const deleteLessonNote = mutation({
  args: {
    lessonNoteId: v.id("lessonNotes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    const lessonNote = await ctx.db.get(args.lessonNoteId);
    if (!lessonNote) {
      throw new Error("Lesson note not found");
    }

    // Authorization check: ensure user owns this lesson note
    if (lessonNote.userId !== userId) {
      throw new Error("Unauthorized: You can only delete your own lesson notes");
    }

    await ctx.db.delete(args.lessonNoteId);
    return null;
  },
});


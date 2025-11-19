import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../../_generated/api";
import {
  createAuthError,
  createNotFoundError,
  createAuthorizationError,
  createValidationError,
} from "../utils/errors";

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
      throw createAuthError();
    }

    const lessonNote = await ctx.db.get(args.lessonNoteId);
    if (!lessonNote) {
      throw createNotFoundError(
        "lesson note",
        args.lessonNoteId,
        "The lesson note may have been deleted or you may have the wrong ID. Please refresh the page or check your lesson notes list."
      );
    }

    // Authorization check: ensure user owns this lesson note
    if (lessonNote.userId !== userId) {
      throw createAuthorizationError("lesson note", "update");
    }

    // Validate title if provided
    if (args.title !== undefined) {
      if (!args.title || args.title.trim().length === 0) {
        throw createValidationError(
          "title",
          "Title cannot be empty",
          "Please provide a title for your lesson note or remove this field to keep the current title."
        );
      }
    }

    const updates: {
      title?: string;
      content?: unknown;
      embedding?: number[];
    } = {};

    if (args.title !== undefined) updates.title = args.title.trim();
    if (args.content !== undefined) updates.content = args.content;

    try {
      await ctx.db.patch(args.lessonNoteId, updates);

      // Schedule embedding update if content or title changed
      // This runs asynchronously in an action (which can call node functions)
      if (args.content !== undefined || args.title !== undefined) {
        try {
          await ctx.scheduler.runAfter(
            0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (internal as any).functions.lessonNotes.actions.updateEmbedding.updateLessonNoteEmbedding,
            {
              lessonNoteId: args.lessonNoteId,
            }
          );
        } catch (schedulerError) {
          // Log but don't fail the update if embedding scheduling fails
          console.error("Error scheduling embedding update:", schedulerError);
        }
      }

      return null;
    } catch (error) {
      console.error("Error updating lesson note:", error);
      throw createValidationError(
        "lesson note update",
        "Failed to update lesson note",
        "Your changes may not have been saved. Please try again. If the problem persists, refresh the page."
      );
    }
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
      throw createAuthError();
    }

    const lessonNote = await ctx.db.get(args.lessonNoteId);
    if (!lessonNote) {
      throw createNotFoundError(
        "lesson note",
        args.lessonNoteId,
        "The lesson note may have been deleted or you may have the wrong ID. Please refresh the page."
      );
    }

    // Authorization check: ensure user owns this lesson note
    if (lessonNote.userId !== userId) {
      throw createAuthorizationError("lesson note", "delete");
    }

    try {
      await ctx.db.delete(args.lessonNoteId);
      return null;
    } catch (error) {
      console.error("Error deleting lesson note:", error);
      throw createValidationError(
        "lesson note deletion",
        "Failed to delete lesson note",
        "Please try again. If the problem persists, refresh the page."
      );
    }
  },
});


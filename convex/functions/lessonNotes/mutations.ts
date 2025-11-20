import { mutation, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import {
  createAuthError,
  createNotFoundError,
  createAuthorizationError,
  createValidationError,
  ActionableError,
} from "../utils/errors";
import { toTitleCase } from "../utils/string";

/**
 * Create a new lesson note
 * Requires authentication and ownership of the lesson plan
 * Creates an empty BlockNote document that can be edited
 */
export const createLessonNote = mutation({
  args: {
    lessonPlanId: v.id("lessonPlans"),
    title: v.string(),
  },
  returns: v.id("lessonNotes"),
  handler: async (ctx, args): Promise<Id<"lessonNotes">> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw createAuthError();
    }

    // Validate title
    if (!args.title || args.title.trim().length === 0) {
      throw createValidationError(
        "title",
        "Title cannot be empty",
        "Please provide a title for your lesson note."
      );
    }

    // Verify lesson plan exists and user owns it
    const lessonPlanDoc = await ctx.db.get(args.lessonPlanId);
    if (!lessonPlanDoc) {
      throw createNotFoundError(
        "lesson plan",
        args.lessonPlanId,
        "The lesson plan may have been deleted. Please refresh the page and try again."
      );
    }
    if (lessonPlanDoc.userId !== userId) {
      throw createAuthorizationError("lesson plan", "access");
    }

    // Create empty BlockNote content (array of blocks format)
    const emptyContent = [
      {
        type: "paragraph",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
        },
        content: [],
        children: [],
      },
    ];

    try {
      // Insert lesson note directly
      const lessonNoteId = await ctx.db.insert("lessonNotes", {
        userId,
        lessonPlanId: args.lessonPlanId,
        title: toTitleCase(args.title.trim()),
        content: emptyContent,
      });

      // Schedule AI generation after creation
      // Note: Auth is not propagated to scheduled functions, so we pass userId explicitly
      try {
        await ctx.scheduler.runAfter(
          0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (internal as any).functions.lessonNotes.actions.generateLessonNote.generateLessonNote,
          {
            lessonNoteId,
            userId,
            lessonPlanId: args.lessonPlanId,
          }
        );
      } catch (schedulerError) {
        // Log but don't fail the creation if scheduling fails
        console.error("Error scheduling lesson note generation:", schedulerError);
      }

      return lessonNoteId;
    } catch (error) {
      console.error("Error creating lesson note:", error);
      
      // If it's already an ActionableError, re-throw it
      if (error instanceof ActionableError) {
        throw error;
      }
      
      // Otherwise, wrap it in a validation error
      throw createValidationError(
        "lesson note creation",
        "Failed to create lesson note",
        "Please try again. If the problem persists, refresh the page."
      );
    }
  },
});

/**
 * Internal mutation to create a new lesson note.
 * Used by the AI agent action to store generated notes.
 */
export const createLessonNoteInternal = internalMutation({
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
      title: toTitleCase(args.title.trim()),
      content: args.content,
      embedding: args.embedding,
    });
  },
});

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

    if (args.title !== undefined) updates.title = toTitleCase(args.title.trim());
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
 * Internal mutation to update a lesson note
 * Used by scheduled actions that don't have auth context
 */
export const updateLessonNoteInternal = internalMutation({
  args: {
    lessonNoteId: v.id("lessonNotes"),
    title: v.optional(v.string()),
    content: v.optional(v.any()),
    embedding: v.optional(v.array(v.float64())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: {
      title?: string;
      content?: unknown;
      embedding?: number[];
    } = {};

    if (args.title !== undefined) updates.title = toTitleCase(args.title.trim());
    if (args.content !== undefined) updates.content = args.content;
    if (args.embedding !== undefined) updates.embedding = args.embedding;

    await ctx.db.patch(args.lessonNoteId, updates);
    return null;
  },
});

/**
 * Internal mutation to update lesson note embedding
 * Used by scheduled actions that don't have auth context
 */
export const updateEmbeddingInternal = internalMutation({
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


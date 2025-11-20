import { mutation } from "../../_generated/server";
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
 * Create a new lesson plan
 * Requires authentication and ownership of the class and subject
 * Creates an empty BlockNote document that can be edited
 */
export const createLessonPlan = mutation({
  args: {
    classId: v.id("classes"),
    subjectId: v.id("subjects"),
    title: v.string(),
  },
  returns: v.id("lessonPlans"),
  handler: async (ctx, args): Promise<Id<"lessonPlans">> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw createAuthError();
    }

    // Validate title
    if (!args.title || args.title.trim().length === 0) {
      throw createValidationError(
        "title",
        "Title cannot be empty",
        "Please provide a title for your lesson plan."
      );
    }

    // Verify class exists and user owns it
    const classDoc = await ctx.db.get(args.classId);
    if (!classDoc) {
      throw createNotFoundError(
        "class",
        args.classId,
        "The class may have been deleted. Please refresh the page and try again."
      );
    }
    if (classDoc.userId !== userId) {
      throw createAuthorizationError("class", "access");
    }

    // Verify subject exists and user owns it
    const subjectDoc = await ctx.db.get(args.subjectId);
    if (!subjectDoc) {
      throw createNotFoundError(
        "subject",
        args.subjectId,
        "The subject may have been deleted. Please refresh the page and try again."
      );
    }
    if (subjectDoc.userId !== userId) {
      throw createAuthorizationError("subject", "access");
    }

    // Verify subject belongs to the class
    if (subjectDoc.classId !== args.classId) {
      throw createValidationError(
        "subject",
        "Subject does not belong to the selected class",
        "Please select a subject that belongs to the chosen class."
      );
    }

    // Create empty BlockNote content (array of blocks format)
    // BlockNote stores content as an array of blocks
    // BlockNote will generate IDs automatically when content is loaded into the editor
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
      // Insert lesson plan directly (mutations can't call internal mutations)
      const lessonPlanId = await ctx.db.insert("lessonPlans", {
        userId,
        classId: args.classId,
        subjectId: args.subjectId,
        title: toTitleCase(args.title.trim()),
        content: emptyContent,
      });

      return lessonPlanId;
    } catch (error) {
      console.error("Error creating lesson plan:", error);
      
      // If it's already an ActionableError, re-throw it
      if (error instanceof ActionableError) {
        throw error;
      }
      
      // Otherwise, wrap it in a validation error
      throw createValidationError(
        "lesson plan creation",
        "Failed to create lesson plan",
        "Please try again. If the problem persists, refresh the page."
      );
    }
  },
});

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
      throw createAuthError();
    }

    const lessonPlan = await ctx.db.get(args.lessonPlanId);
    if (!lessonPlan) {
      throw createNotFoundError(
        "lesson plan",
        args.lessonPlanId,
        "The lesson plan may have been deleted or you may have the wrong ID. Please refresh the page or check your lesson plans list."
      );
    }

    // Authorization check: ensure user owns this lesson plan
    if (lessonPlan.userId !== userId) {
      throw createAuthorizationError("lesson plan", "update");
    }

    // Validate title if provided
    if (args.title !== undefined) {
      if (!args.title || args.title.trim().length === 0) {
        throw createValidationError(
          "title",
          "Title cannot be empty",
          "Please provide a title for your lesson plan or remove this field to keep the current title."
        );
      }
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

    if (args.title !== undefined) updates.title = toTitleCase(args.title.trim());
    if (args.content !== undefined) updates.content = args.content;
    if (args.objectives !== undefined) updates.objectives = args.objectives;
    if (args.materials !== undefined) updates.materials = args.materials;
    if (args.methods !== undefined) updates.methods = args.methods;
    if (args.assessment !== undefined) updates.assessment = args.assessment;
    if (args.references !== undefined) updates.references = args.references;
    if (args.resources !== undefined) updates.resources = args.resources;

    try {
      await ctx.db.patch(args.lessonPlanId, updates);

      // Schedule embedding update if content or title changed
      // This runs asynchronously in an action (which can call node functions)
      if (args.content !== undefined || args.title !== undefined) {
        try {
          await ctx.scheduler.runAfter(
            0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (internal as any).functions.lessonPlans.actions.updateEmbedding.updateLessonPlanEmbedding,
            {
              lessonPlanId: args.lessonPlanId,
            }
          );
        } catch (schedulerError) {
          // Log but don't fail the update if embedding scheduling fails
          console.error("Error scheduling embedding update:", schedulerError);
        }
      }

      return null;
    } catch (error) {
      console.error("Error updating lesson plan:", error);
      throw createValidationError(
        "lesson plan update",
        "Failed to update lesson plan",
        "Your changes may not have been saved. Please try again. If the problem persists, refresh the page."
      );
    }
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
      throw createAuthError();
    }

    const lessonPlan = await ctx.db.get(args.lessonPlanId);
    if (!lessonPlan) {
      throw createNotFoundError(
        "lesson plan",
        args.lessonPlanId,
        "The lesson plan may have been deleted or you may have the wrong ID. Please refresh the page."
      );
    }

    // Authorization check: ensure user owns this lesson plan
    if (lessonPlan.userId !== userId) {
      throw createAuthorizationError("lesson plan", "delete");
    }

    try {
      // Delete all associated lesson notes
      const lessonNotes = await ctx.db
        .query("lessonNotes")
        .withIndex("by_lesson_plan_id", (q) => q.eq("lessonPlanId", args.lessonPlanId))
        .collect();

      for (const note of lessonNotes) {
        // Verify ownership before deleting (safety check)
        if (note.userId === userId) {
          try {
            await ctx.db.delete(note._id);
          } catch (noteError) {
            console.error(`Error deleting lesson note ${note._id}:`, noteError);
            // Continue deleting other notes even if one fails
          }
        }
      }

      // Delete the lesson plan
      await ctx.db.delete(args.lessonPlanId);
      return null;
    } catch (error) {
      console.error("Error deleting lesson plan:", error);
      throw createValidationError(
        "lesson plan deletion",
        "Failed to delete lesson plan",
        "Please try again. If the problem persists, refresh the page."
      );
    }
  },
});


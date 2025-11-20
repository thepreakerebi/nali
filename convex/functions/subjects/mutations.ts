import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../../_generated/dataModel";
import {
  createAuthError,
  createNotFoundError,
  createAuthorizationError,
  createDependencyError,
  createValidationError,
} from "../utils/errors";
import { toTitleCase } from "../utils/string";

/**
 * Create a new subject
 * Requires authentication - user must be signed in
 */
export const createSubject = mutation({
  args: {
    classId: v.id("classes"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("subjects"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw createAuthError();
    }

    // Validate input
    if (!args.name || args.name.trim().length === 0) {
      throw createValidationError(
        "subject name",
        "Subject name cannot be empty",
        "Please provide a name for your subject (e.g., 'Mathematics', 'Science', 'English')."
      );
    }

    // Verify class exists and user owns it
    const classDoc = await ctx.db.get(args.classId);
    if (!classDoc) {
      throw createNotFoundError(
        "class",
        args.classId,
        "The class may have been deleted or you may have the wrong ID. Please refresh the page."
      );
    }

    if (classDoc.userId !== userId) {
      throw createAuthorizationError("class", "use");
    }

    try {
      return await ctx.db.insert("subjects", {
        userId,
        classId: args.classId,
        name: toTitleCase(args.name.trim()),
        description: args.description?.trim(),
      });
    } catch (error) {
      console.error("Error creating subject:", error);
      throw createValidationError(
        "subject creation",
        "Failed to create subject",
        "Please check your input and try again. If the problem persists, refresh the page."
      );
    }
  },
});

/**
 * Update subject details
 * Requires authentication and ownership of the subject
 */
export const updateSubject = mutation({
  args: {
    subjectId: v.id("subjects"),
    classId: v.optional(v.id("classes")),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw createAuthError();
    }

    const subjectDoc = await ctx.db.get(args.subjectId);
    if (!subjectDoc) {
      throw createNotFoundError(
        "subject",
        args.subjectId,
        "The subject may have been deleted or you may have the wrong ID. Please refresh the page or check your subject list."
      );
    }

    // Authorization check: ensure user owns this subject
    if (subjectDoc.userId !== userId) {
      throw createAuthorizationError("subject", "update");
    }

    // Validate updates
    if (args.name !== undefined) {
      if (!args.name || args.name.trim().length === 0) {
        throw createValidationError(
          "subject name",
          "Subject name cannot be empty",
          "Please provide a valid subject name or remove this field to keep the current name."
        );
      }
    }

    // If classId is being updated, verify the new class exists and user owns it
    if (args.classId !== undefined) {
      const classDoc = await ctx.db.get(args.classId);
      if (!classDoc) {
        throw createNotFoundError(
          "class",
          args.classId,
          "The class may have been deleted or you may have the wrong ID. Please refresh the page."
        );
      }

      if (classDoc.userId !== userId) {
        throw createAuthorizationError("class", "use");
      }
    }

    const updates: {
      classId?: Id<"classes">;
      name?: string;
      description?: string;
    } = {};

    if (args.classId !== undefined) updates.classId = args.classId;
    if (args.name !== undefined) updates.name = toTitleCase(args.name.trim());
    if (args.description !== undefined) updates.description = args.description.trim();

    try {
      await ctx.db.patch(args.subjectId, updates);
      return null;
    } catch (error) {
      console.error("Error updating subject:", error);
      throw createValidationError(
        "subject update",
        "Failed to update subject",
        "Please try again. If the problem persists, refresh the page."
      );
    }
  },
});

/**
 * Delete a subject
 * Requires authentication and ownership of the subject
 * Prevents deletion if there are associated lesson plans
 */
export const deleteSubject = mutation({
  args: {
    subjectId: v.id("subjects"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw createAuthError();
    }

    const subjectDoc = await ctx.db.get(args.subjectId);
    if (!subjectDoc) {
      throw createNotFoundError(
        "subject",
        args.subjectId,
        "The subject may have been deleted or you may have the wrong ID. Please refresh the page."
      );
    }

    // Authorization check: ensure user owns this subject
    if (subjectDoc.userId !== userId) {
      throw createAuthorizationError("subject", "delete");
    }

    try {
      // Delete all lesson plans for this subject (which will cascade delete lesson notes)
    const lessonPlans = await ctx.db
      .query("lessonPlans")
      .withIndex("by_subject_id", (q) => q.eq("subjectId", args.subjectId))
        .collect();

      for (const plan of lessonPlans) {
        // Verify ownership before deleting (safety check)
        if (plan.userId === userId) {
          // Delete all lesson notes for this lesson plan
          const lessonNotes = await ctx.db
            .query("lessonNotes")
            .withIndex("by_lesson_plan_id", (q) => q.eq("lessonPlanId", plan._id))
            .collect();

          for (const note of lessonNotes) {
            if (note.userId === userId) {
              try {
                await ctx.db.delete(note._id);
              } catch (noteError) {
                console.error(`Error deleting lesson note ${note._id}:`, noteError);
    }
            }
          }

          // Delete the lesson plan
          try {
            await ctx.db.delete(plan._id);
          } catch (planError) {
            console.error(`Error deleting lesson plan ${plan._id}:`, planError);
          }
        }
      }

      // Finally, delete the subject
      await ctx.db.delete(args.subjectId);
      return null;
    } catch (error) {
      console.error("Error deleting subject:", error);
      throw createValidationError(
        "subject deletion",
        "Failed to delete subject",
        "Please try again. If the problem persists, refresh the page."
      );
    }
  },
});


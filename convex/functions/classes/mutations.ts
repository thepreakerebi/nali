import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  createAuthError,
  createNotFoundError,
  createAuthorizationError,
  createValidationError,
} from "../utils/errors";
import { toTitleCase } from "../utils/string";

/**
 * Create a new class
 * Requires authentication - user must be signed in
 */
export const createClass = mutation({
  args: {
    name: v.string(),
    gradeLevel: v.string(),
    academicYear: v.string(),
  },
  returns: v.id("classes"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw createAuthError();
    }

    // Validate input
    if (!args.name || args.name.trim().length === 0) {
      throw createValidationError(
        "class name",
        "Class name cannot be empty",
        "Please provide a name for your class (e.g., 'Grade 5A' or 'Mathematics Class')."
      );
    }

    if (!args.gradeLevel || args.gradeLevel.trim().length === 0) {
      throw createValidationError(
        "grade level",
        "Grade level cannot be empty",
        "Please specify the grade level (e.g., 'Grade 5' or 'Primary 3')."
      );
    }

    if (!args.academicYear || args.academicYear.trim().length === 0) {
      throw createValidationError(
        "academic year",
        "Academic year cannot be empty",
        "Please specify the academic year (e.g., '2024-2025' or '2024')."
      );
    }

    try {
      return await ctx.db.insert("classes", {
        userId,
        name: toTitleCase(args.name.trim()),
        gradeLevel: toTitleCase(args.gradeLevel.trim()),
        academicYear: toTitleCase(args.academicYear.trim()),
      });
    } catch (error) {
      console.error("Error creating class:", error);
      throw createValidationError(
        "class creation",
        "Failed to create class",
        "Please check your input and try again. If the problem persists, refresh the page."
      );
    }
  },
});

/**
 * Update class details
 * Requires authentication and ownership of the class
 */
export const updateClass = mutation({
  args: {
    classId: v.id("classes"),
    name: v.optional(v.string()),
    gradeLevel: v.optional(v.string()),
    academicYear: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw createAuthError();
    }

    const classDoc = await ctx.db.get(args.classId);
    if (!classDoc) {
      throw createNotFoundError(
        "class",
        args.classId,
        "The class may have been deleted or you may have the wrong ID. Please refresh the page or check your class list."
      );
    }

    // Authorization check: ensure user owns this class
    if (classDoc.userId !== userId) {
      throw createAuthorizationError("class", "update");
    }

    // Validate updates
    if (args.name !== undefined) {
      if (!args.name || args.name.trim().length === 0) {
        throw createValidationError(
          "class name",
          "Class name cannot be empty",
          "Please provide a valid class name or remove this field to keep the current name."
        );
      }
    }

    if (args.gradeLevel !== undefined && args.gradeLevel.trim().length === 0) {
      throw createValidationError(
        "grade level",
        "Grade level cannot be empty",
        "Please provide a valid grade level or remove this field to keep the current value."
      );
    }

    if (args.academicYear !== undefined && args.academicYear.trim().length === 0) {
      throw createValidationError(
        "academic year",
        "Academic year cannot be empty",
        "Please provide a valid academic year or remove this field to keep the current value."
      );
    }

    const updates: {
      name?: string;
      gradeLevel?: string;
      academicYear?: string;
    } = {};

    if (args.name !== undefined) updates.name = toTitleCase(args.name.trim());
    if (args.gradeLevel !== undefined) updates.gradeLevel = toTitleCase(args.gradeLevel.trim());
    if (args.academicYear !== undefined) updates.academicYear = toTitleCase(args.academicYear.trim());

    try {
      await ctx.db.patch(args.classId, updates);
      return null;
    } catch (error) {
      console.error("Error updating class:", error);
      throw createValidationError(
        "class update",
        "Failed to update class",
        "Please try again. If the problem persists, refresh the page."
      );
    }
  },
});

/**
 * Delete a class
 * Requires authentication and ownership of the class
 * Prevents deletion if there are associated lesson plans
 */
export const deleteClass = mutation({
  args: {
    classId: v.id("classes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw createAuthError();
    }

    const classDoc = await ctx.db.get(args.classId);
    if (!classDoc) {
      throw createNotFoundError(
        "class",
        args.classId,
        "The class may have been deleted or you may have the wrong ID. Please refresh the page."
      );
    }

    // Authorization check: ensure user owns this class
    if (classDoc.userId !== userId) {
      throw createAuthorizationError("class", "delete");
    }

    try {
      // Delete all lesson plans for this class (which will cascade delete lesson notes)
    const lessonPlans = await ctx.db
      .query("lessonPlans")
      .withIndex("by_class_id", (q) => q.eq("classId", args.classId))
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

      // Delete subjects that are only used by lesson plans for this class
      const subjectsUsedByThisClass = new Set<Id<"subjects">>();
      for (const plan of lessonPlans) {
        if (plan.userId === userId) {
          subjectsUsedByThisClass.add(plan.subjectId);
        }
      }

      // Check each subject to see if it's used by other classes' lesson plans
      for (const subjectId of subjectsUsedByThisClass) {
        const otherLessonPlans = await ctx.db
          .query("lessonPlans")
          .withIndex("by_subject_id", (q) => q.eq("subjectId", subjectId))
          .collect();

        // Only delete subject if it's only used by lesson plans for this class
        const isOnlyUsedByThisClass = otherLessonPlans.every(
          (plan) => plan.classId === args.classId && plan.userId === userId
        );

        if (isOnlyUsedByThisClass) {
          const subjectDoc = await ctx.db.get(subjectId);
          if (subjectDoc && subjectDoc.userId === userId) {
            try {
              await ctx.db.delete(subjectId);
            } catch (subjectError) {
              console.error(`Error deleting subject ${subjectId}:`, subjectError);
            }
          }
        }
      }

      // Finally, delete the class
      await ctx.db.delete(args.classId);
      return null;
    } catch (error) {
      console.error("Error deleting class:", error);
      throw createValidationError(
        "class deletion",
        "Failed to delete class",
        "Please try again. If the problem persists, refresh the page."
      );
    }
  },
});


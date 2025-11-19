import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * List all subjects for the current authenticated user
 * Returns empty array if not authenticated
 * Includes class name for each subject
 */
export const listSubjects = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("subjects"),
      _creationTime: v.number(),
      userId: v.id("users"),
      classId: v.id("classes"),
      className: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    const subjects = await ctx.db
      .query("subjects")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Fetch class names for all subjects
    const subjectsWithClassNames = await Promise.all(
      subjects.map(async (subject) => {
        try {
          const classDoc = await ctx.db.get(subject.classId);
          if (!classDoc) {
            console.error(`[listSubjects] Class not found for subject ${subject._id}, classId: ${subject.classId}`);
            return {
              ...subject,
              className: "",
            };
          }
          
          // Get the class name - ensure it exists and is a string
          const className = classDoc.name 
            ? String(classDoc.name).trim() 
            : "";
          
          if (!className) {
            console.warn(`[listSubjects] Class ${subject.classId} has empty name for subject ${subject._id}`);
          }
          
          return {
            ...subject,
            className: className,
          };
        } catch (error) {
          console.error(`[listSubjects] Error fetching class for subject ${subject._id}, classId: ${subject.classId}:`, error);
          return {
            ...subject,
            className: "",
          };
        }
      })
    );

    return subjectsWithClassNames;
  },
});

/**
 * Get count of subjects for the current authenticated user
 * Returns 0 if not authenticated
 */
export const getSubjectsCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return 0;
    }

    const subjects = await ctx.db
      .query("subjects")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();
    
    return subjects.length;
  },
});

/**
 * Get a subject by ID
 * Requires authentication and returns null if subject doesn't exist or user doesn't own it
 */
export const getSubject = query({
  args: {
    subjectId: v.id("subjects"),
  },
  returns: v.union(
    v.object({
      _id: v.id("subjects"),
      _creationTime: v.number(),
      userId: v.id("users"),
      classId: v.id("classes"),
      name: v.string(),
      description: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const subjectDoc = await ctx.db.get(args.subjectId);
    // Authorization check: only return subject if user owns it
    if (!subjectDoc || subjectDoc.userId !== userId) {
      return null;
    }

    return subjectDoc;
  },
});

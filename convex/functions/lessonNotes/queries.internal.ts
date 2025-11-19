import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";

/**
 * Internal query to get lesson plan details for note generation.
 * Used by actions to retrieve necessary context.
 */
export const getLessonPlanForNoteGeneration = internalQuery({
  args: {
    lessonPlanId: v.id("lessonPlans"),
  },
  returns: v.union(
    v.object({
      _id: v.id("lessonPlans"),
      _creationTime: v.number(),
      userId: v.id("users"),
      classId: v.id("classes"),
      subjectId: v.id("subjects"),
      title: v.string(),
      content: v.any(),
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
      embedding: v.optional(v.array(v.float64())),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.lessonPlanId);
    if (!plan) {
      return null;
    }

    return {
      _id: plan._id,
      _creationTime: plan._creationTime,
      userId: plan.userId,
      classId: plan.classId,
      subjectId: plan.subjectId,
      title: plan.title,
      content: plan.content,
      objectives: plan.objectives,
      materials: plan.materials,
      methods: plan.methods,
      assessment: plan.assessment,
      references: plan.references,
      resources: plan.resources,
      embedding: plan.embedding,
    };
  },
});

/**
 * Internal query to get class and subject details for a lesson note.
 * Used by actions to retrieve necessary context.
 */
export const getClassAndSubjectDetailsForNote = internalQuery({
  args: {
    lessonPlanId: v.id("lessonPlans"),
  },
  returns: v.object({
    class: v.union(
      v.object({
        _id: v.id("classes"),
        name: v.string(),
        gradeLevel: v.string(),
        academicYear: v.string(),
      }),
      v.null()
    ),
    subject: v.union(
      v.object({
        _id: v.id("subjects"),
        name: v.string(),
        description: v.optional(v.string()),
      }),
      v.null()
    ),
  }),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.lessonPlanId);
    if (!plan) {
      return { class: null, subject: null };
    }

    const classDoc = await ctx.db.get(plan.classId);
    const subjectDoc = await ctx.db.get(plan.subjectId);

    return {
      class: classDoc
        ? {
            _id: classDoc._id,
            name: classDoc.name,
            gradeLevel: classDoc.gradeLevel,
            academicYear: classDoc.academicYear,
          }
        : null,
      subject: subjectDoc
        ? {
            _id: subjectDoc._id,
            name: subjectDoc.name,
            description: subjectDoc.description,
          }
        : null,
    };
  },
});

/**
 * Internal query to get multiple lesson notes by their IDs.
 * Used by actions (e.g., vector search results) to hydrate full documents.
 */
export const loadNotesByIds = internalQuery({
  args: {
    noteIds: v.array(v.id("lessonNotes")),
  },
  returns: v.array(
    v.object({
      _id: v.id("lessonNotes"),
      _creationTime: v.number(),
      userId: v.id("users"),
      lessonPlanId: v.id("lessonPlans"),
      title: v.string(),
      content: v.any(),
      embedding: v.optional(v.array(v.float64())),
    })
  ),
  handler: async (ctx, args) => {
    const notes: Doc<"lessonNotes">[] = [];
    for (const id of args.noteIds) {
      const note = await ctx.db.get(id);
      if (note) {
        notes.push(note);
      }
    }
    return notes;
  },
});

/**
 * Internal query to get lesson note title and content for embedding generation
 */
export const getLessonNoteForEmbedding = internalQuery({
  args: {
    lessonNoteId: v.id("lessonNotes"),
  },
  returns: v.union(
    v.object({
      title: v.string(),
      content: v.any(),
      lessonPlanId: v.id("lessonPlans"),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.lessonNoteId);
    if (!note) {
      return null;
    }
    return {
      title: note.title,
      content: note.content,
      lessonPlanId: note.lessonPlanId,
    };
  },
});


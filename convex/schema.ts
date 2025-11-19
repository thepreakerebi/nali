import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  // User profiles store additional profile information linked to auth users
  userProfiles: defineTable({
    userId: v.id("users"), // References auth user from authTables
    name: v.string(),
    email: v.string(),
    profilePhoto: v.optional(v.string()),
    googleId: v.optional(v.string()),
    schoolName: v.optional(v.string()),
    country: v.optional(v.string()),
    preferredLanguage: v.optional(v.union(v.literal("en"), v.literal("fr"), v.literal("rw"))),
  })
    .index("by_user_id", ["userId"])
    .index("by_email", ["email"])
    .index("by_google_id", ["googleId"]),

  classes: defineTable({
    userId: v.id("users"), // References auth user from authTables
    name: v.string(),
    gradeLevel: v.string(),
    academicYear: v.string(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_and_academic_year", ["userId", "academicYear"]),

  subjects: defineTable({
    userId: v.id("users"), // References auth user from authTables
    name: v.string(),
    description: v.optional(v.string()),
  }).index("by_user_id", ["userId"]),

  lessonPlans: defineTable({
    userId: v.id("users"), // References auth user from authTables
    classId: v.id("classes"),
    subjectId: v.id("subjects"),
    title: v.string(),
    content: v.any(), // Blocknote.js JSON format
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
  })
    .index("by_user_id", ["userId"])
    .index("by_class_id", ["classId"])
    .index("by_subject_id", ["subjectId"])
    .index("by_user_id_and_class_id", ["userId", "classId"])
    .index("by_user_id_and_subject_id", ["userId", "subjectId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1024, // Mistral embeddings dimension
      filterFields: ["classId", "subjectId", "userId"],
    }),

  lessonNotes: defineTable({
    userId: v.id("users"), // References auth user from authTables
    lessonPlanId: v.id("lessonPlans"),
    title: v.string(),
    content: v.any(), // Blocknote.js JSON format
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_lesson_plan_id", ["lessonPlanId"])
    .index("by_user_id", ["userId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1024, // Mistral embeddings dimension
      filterFields: ["lessonPlanId", "userId"],
    }),
});

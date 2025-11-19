/**
 * Unified semantic search for lesson plans and lesson notes using vector search
 */

"use node";

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import { generateEmbedding } from "../utils/embeddings";
import type { Id } from "../../_generated/dataModel";

/**
 * Unified semantic search for lesson plans and lesson notes
 * Searches for content similar to the query text using vector embeddings
 * Supports filtering by classId, subjectId, lessonPlanId, and userId (implicit from auth)
 */
export const semanticSearch = action({
  args: {
    query: v.string(),
    contentType: v.union(v.literal("lessonPlans"), v.literal("lessonNotes")),
    classId: v.optional(v.id("classes")),
    subjectId: v.optional(v.id("subjects")),
    lessonPlanId: v.optional(v.id("lessonPlans")),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.union(
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
        similarityScore: v.number(),
        contentType: v.literal("lessonPlans"),
      }),
      v.object({
        _id: v.id("lessonNotes"),
        _creationTime: v.number(),
        userId: v.id("users"),
        lessonPlanId: v.id("lessonPlans"),
        title: v.string(),
        content: v.any(),
        similarityScore: v.number(),
        contentType: v.literal("lessonNotes"),
      })
    )
  ),
  handler: async (ctx, args) => {
    try {
      // Get authenticated user ID
      const userId = await ctx.runQuery(api.functions.utils.auth.getCurrentUserId, {});
      if (!userId) {
        return [];
      }

      // Validate query
      if (!args.query || args.query.trim().length === 0) {
        return [];
      }

      // Generate embedding for the search query
      let queryEmbedding: number[];
      try {
        queryEmbedding = await generateEmbedding(args.query.trim());
      } catch (embeddingError) {
        console.error("Error generating embedding for semantic search:", embeddingError);
        // Return empty array instead of throwing - search failures shouldn't break the app
        return [];
      }

    // Store optional filter values for proper type narrowing
    const classId = args.classId;
    const subjectId = args.subjectId;
    const lessonPlanId = args.lessonPlanId;

    if (args.contentType === "lessonPlans") {
      // Search lesson plans
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vectorSearchResults = await (ctx.vectorSearch as any)(
        "lessonPlans",
        "by_embedding",
        {
          vector: queryEmbedding,
          limit: Math.min(args.limit || 10, 20), // Cap at 20
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          filter: (q: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let filter: any = q.eq("userId", userId);
            if (classId) {
              filter = filter.eq("classId", classId as Id<"classes">);
            }
            if (subjectId) {
              filter = filter.eq("subjectId", subjectId as Id<"subjects">);
            }
            return filter;
          },
        }
      );

      if (vectorSearchResults.length === 0) {
        return [];
      }

      // Load the actual lesson plan documents
      const planIds = vectorSearchResults.map((result: { _id: Id<"lessonPlans"> }) => result._id);
      const plans: Array<{
        _id: Id<"lessonPlans">;
        _creationTime: number;
        userId: Id<"users">;
        classId: Id<"classes">;
        subjectId: Id<"subjects">;
        title: string;
        content: unknown;
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
      }> = await ctx.runQuery(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (internal as any).functions.lessonPlans.queries.loadPlansByIds,
        { planIds }
      );

      // Combine plans with similarity scores
      const results = plans
        .map((plan) => {
          const searchResult = vectorSearchResults.find(
            (r: { _id: Id<"lessonPlans">; _score: number }) => r._id === plan._id
          );
          return {
            ...plan,
            similarityScore: searchResult?._score || 0,
            contentType: "lessonPlans" as const,
          };
        })
        .filter((result) => result.similarityScore > 0.5) // Only return reasonably similar results
        .sort((a, b) => b.similarityScore - a.similarityScore); // Sort by similarity score descending

      return results;
    } else {
      // Search lesson notes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vectorSearchResults = await (ctx.vectorSearch as any)(
        "lessonNotes",
        "by_embedding",
        {
          vector: queryEmbedding,
          limit: Math.min(args.limit || 10, 20), // Cap at 20
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          filter: (q: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let filter: any = q.eq("userId", userId);
            if (lessonPlanId) {
              filter = filter.eq("lessonPlanId", lessonPlanId as Id<"lessonPlans">);
            }
            return filter;
          },
        }
      );

      if (vectorSearchResults.length === 0) {
        return [];
      }

      // Load the actual lesson note documents
      const noteIds = vectorSearchResults.map((result: { _id: Id<"lessonNotes"> }) => result._id);
      const notes: Array<{
        _id: Id<"lessonNotes">;
        _creationTime: number;
        userId: Id<"users">;
        lessonPlanId: Id<"lessonPlans">;
        title: string;
        content: unknown;
      }> = await ctx.runQuery(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (internal as any).functions.lessonNotes.queries.loadNotesByIds,
        { noteIds }
      );

      // Combine notes with similarity scores
      const results = notes
        .map((note) => {
          const searchResult = vectorSearchResults.find(
            (r: { _id: Id<"lessonNotes">; _score: number }) => r._id === note._id
          );
          return {
            ...note,
            similarityScore: searchResult?._score || 0,
            contentType: "lessonNotes" as const,
          };
        })
        .filter((result) => result.similarityScore > 0.5) // Only return reasonably similar results
        .sort((a, b) => b.similarityScore - a.similarityScore); // Sort by similarity score descending

      return results;
    }
    } catch (error) {
      console.error("Error in semantic search:", error);
      // Return empty array instead of throwing - search failures shouldn't break the app
      return [];
    }
  },
});


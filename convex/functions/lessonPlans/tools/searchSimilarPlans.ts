/**
 * Tool for searching similar lesson plans using vector search
 */

"use node";

import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { ActionCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";


const searchSimilarPlansSchema = z.object({
  query: z.string().describe("Search query describing the lesson plan topic and objectives"),
  classId: z.string().optional().describe("Class ID to filter by (as string)"),
  subjectId: z.string().optional().describe("Subject ID to filter by (as string)"),
  limit: z.number().optional().default(5).describe("Maximum number of similar plans to return"),
});

type SearchSimilarPlansParams = z.infer<typeof searchSimilarPlansSchema>;

interface SimilarPlan {
  title: string;
  topic: string;
  objectives: string[];
  methods: string[];
  similarityScore: number;
}

export function createSearchSimilarPlansTool(ctx: ActionCtx) {
  return tool({
    description:
      "Search for similar lesson plans in the database using semantic search. Use this to find reference plans that are similar to what you're creating. This helps maintain consistency and provides inspiration.",
    inputSchema: searchSimilarPlansSchema,
    execute: async ({
      query,
      classId,
      subjectId,
      limit = 5,
    }: SearchSimilarPlansParams) => {
      try {
        // Generate embedding for the search query
        const { generateEmbedding } = await import(
          "../../utils/embeddings"
        );
        const queryEmbedding = await generateEmbedding(query);

        // Perform vector search
        // Note: We need to get userId from the action context, but tools don't have direct access
        // For now, we'll filter by classId and subjectId only
        // Using type assertion to work around Convex's complex filter type system
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vectorSearchResults = await (ctx.vectorSearch as any)(
          "lessonPlans",
          "by_embedding",
          {
            vector: queryEmbedding,
            limit: Math.min(limit, 10), // Cap at 10
            ...(classId && subjectId
              ? {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  filter: (q: any) => q.eq("classId", classId as Id<"classes">).eq("subjectId", subjectId as Id<"subjects">),
                }
              : classId
              ? {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  filter: (q: any) => q.eq("classId", classId as Id<"classes">),
                }
              : subjectId
              ? {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  filter: (q: any) => q.eq("subjectId", subjectId as Id<"subjects">),
                }
              : {}),
          }
        );

        if (vectorSearchResults.length === 0) {
          return {
            similarPlans: [],
            message: "No similar lesson plans found",
          };
        }

        // Load the actual lesson plan documents
        const planIds = vectorSearchResults.map((result: { _id: Id<"lessonPlans"> }) => result._id);
        // TypeScript doesn't fully recognize internal API structure, so we use type assertion
        const plans: Array<{
          _id: Id<"lessonPlans">;
          title: string;
          objectives?: string[];
          methods?: string[];
        }> = await ctx.runQuery(
          // @ts-expect-error - internal API path structure not fully typed by Convex
          (internal as unknown as { functions: { lessonPlans: { queries: { loadPlansByIds: unknown } } } }).functions.lessonPlans.queries.loadPlansByIds,
          { planIds }
        );

        // Format results with similarity scores
        const similarPlans: SimilarPlan[] = plans
          .map((plan: {
            _id: Id<"lessonPlans">;
            title: string;
            objectives?: string[];
            methods?: string[];
          }) => {
            const searchResult = vectorSearchResults.find(
              (r: { _id: Id<"lessonPlans">; _score: number }) => r._id === plan._id
            );
            return {
              title: plan.title,
              topic: plan.title, // Using title as topic indicator
              objectives: plan.objectives || [],
              methods: plan.methods || [],
              similarityScore: searchResult?._score || 0,
            };
          })
          .filter((plan: SimilarPlan) => plan.similarityScore > 0.7); // Only return reasonably similar plans

        return {
          similarPlans,
          totalFound: similarPlans.length,
          message: `Found ${similarPlans.length} similar lesson plan(s) for reference`,
        };
      } catch (error) {
        console.error("Error searching similar plans:", error);
        // Don't throw - return empty results if search fails
        return {
          similarPlans: [],
          message: "Unable to search similar plans",
        };
      }
    },
  });
}


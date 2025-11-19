/**
 * Tool for searching similar lesson notes using vector search
 */

"use node";

import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { ActionCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";

const searchSimilarNotesSchema = z.object({
  query: z.string().describe("Search query describing the lesson note topic and content"),
  lessonPlanId: z.string().optional().describe("Lesson plan ID to filter by (as string)"),
  limit: z.number().optional().default(5).describe("Maximum number of similar notes to return"),
});

type SearchSimilarNotesParams = z.infer<typeof searchSimilarNotesSchema>;

interface SimilarNote {
  title: string;
  content: string;
  similarityScore: number;
}

export function createSearchSimilarNotesTool(ctx: ActionCtx) {
  return tool({
    description:
      "Search for similar lesson notes in the database using semantic search. Use this to find reference notes that are similar to what you're creating. This helps maintain consistency and provides inspiration.",
    inputSchema: searchSimilarNotesSchema,
    execute: async ({
      query,
      lessonPlanId,
      limit = 5,
    }: SearchSimilarNotesParams) => {
      try {
        // Generate embedding for the search query
        const { generateEmbedding } = await import(
          "../../utils/embeddings"
        );
        const queryEmbedding = await generateEmbedding(query);

        // Perform vector search
        // Using type assertion to work around Convex's complex filter type system
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vectorSearchResults = await (ctx.vectorSearch as any)(
          "lessonNotes",
          "by_embedding",
          {
            vector: queryEmbedding,
            limit: Math.min(limit, 10), // Cap at 10
            ...(lessonPlanId
              ? {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  filter: (q: any) => q.eq("lessonPlanId", lessonPlanId as Id<"lessonPlans">),
                }
              : {}),
          }
        );

        if (vectorSearchResults.length === 0) {
          return {
            similarNotes: [],
            message: "No similar lesson notes found",
          };
        }

        // Load the actual lesson note documents
        const noteIds = vectorSearchResults.map((result: { _id: Id<"lessonNotes"> }) => result._id);
        // TypeScript doesn't fully recognize internal API structure, so we use type assertion
        const notes: Array<{
          _id: Id<"lessonNotes">;
          title: string;
          content: unknown;
        }> = await ctx.runQuery(
          // @ts-expect-error - internal API path structure not fully typed by Convex
          (internal as unknown as { functions: { lessonNotes: { queries: { loadNotesByIds: unknown } } } }).functions.lessonNotes.queries.loadNotesByIds,
          { noteIds }
        );

        // Format results with similarity scores
        const similarNotes: SimilarNote[] = notes
          .map((note: {
            _id: Id<"lessonNotes">;
            title: string;
            content: unknown;
          }) => {
            const searchResult = vectorSearchResults.find(
              (r: { _id: Id<"lessonNotes">; _score: number }) => r._id === note._id
            );
            // Extract text content from Blocknote JSON for context
            const contentText = typeof note.content === "object" && note.content !== null && "blocks" in note.content
              ? JSON.stringify(note.content).substring(0, 500)
              : String(note.content).substring(0, 500);
            
            return {
              title: note.title,
              content: contentText,
              similarityScore: searchResult?._score || 0,
            };
          })
          .filter((note: SimilarNote) => note.similarityScore > 0.7); // Only return reasonably similar notes

        return {
          similarNotes,
          totalFound: similarNotes.length,
          message: `Found ${similarNotes.length} similar lesson note(s) for reference`,
        };
      } catch (error) {
        console.error("Error searching similar notes:", error);
        // Don't throw - return empty results if search fails
        return {
          similarNotes: [],
          message: "Unable to search similar notes",
        };
      }
    },
  });
}


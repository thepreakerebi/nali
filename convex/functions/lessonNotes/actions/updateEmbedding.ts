/**
 * Internal action to update lesson note embedding
 * Called asynchronously after content updates
 */

"use node";

import { internalAction } from "../../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { generateEmbedding } from "../../utils/embeddings";
import { createEmbeddingError } from "../../utils/errors";

/**
 * Convert Blocknote JSON content to readable text for embedding generation
 */
function blocknoteToText(content: unknown): string {
  if (typeof content !== "object" || content === null) {
    return String(content);
  }

  if (!("blocks" in content) || !Array.isArray(content.blocks)) {
    return JSON.stringify(content);
  }

  const textParts: string[] = [];
  for (const block of content.blocks) {
    if (typeof block === "object" && block !== null) {
      if (
        "type" in block &&
        block.type === "heading" &&
        "props" in block &&
        typeof block.props === "object" &&
        block.props !== null &&
        "level" in block.props
      ) {
        const level = block.props.level as number;
        const prefix = "#".repeat(level) + " ";
        if ("content" in block && Array.isArray(block.content)) {
          const text = extractTextFromContent(block.content);
          if (text) textParts.push(prefix + text);
        }
      } else if ("content" in block && Array.isArray(block.content)) {
        const text = extractTextFromContent(block.content);
        if (text) textParts.push(text);
      }
    }
  }
  return textParts.join("\n\n");
}

function extractTextFromContent(content: unknown[]): string {
  const parts: string[] = [];
  for (const item of content) {
    if (
      typeof item === "object" &&
      item !== null &&
      "text" in item &&
      typeof item.text === "string"
    ) {
      parts.push(item.text);
    }
  }
  return parts.join("");
}

/**
 * Internal action to update lesson note embedding
 * Called asynchronously after content or title updates
 */
export const updateLessonNoteEmbedding = internalAction({
  args: {
    lessonNoteId: v.id("lessonNotes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Load the lesson note
    const lessonNote = await ctx.runQuery(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (internal as any).functions.lessonNotes.queries.getLessonNoteForEmbedding,
      {
        lessonNoteId: args.lessonNoteId,
      }
    );

    if (!lessonNote) {
      console.error(`Lesson note ${args.lessonNoteId} not found for embedding update`);
      return null;
    }

    try {
      // Get the associated lesson plan title for better embedding context
      const lessonPlan = await ctx.runQuery(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (internal as any).functions.lessonPlans.queries.getLessonPlanTitle,
        {
          lessonPlanId: lessonNote.lessonPlanId,
        }
      );

      // Convert Blocknote content to text
      const contentText = blocknoteToText(lessonNote.content);
      const planTitle = lessonPlan?.title || "";
      const embeddingText = `${planTitle} ${lessonNote.title} ${contentText.substring(0, 1000)}`;

      // Generate embedding
      let embedding: number[];
      try {
        embedding = await generateEmbedding(embeddingText);
      } catch (embeddingError) {
        console.error(`Error generating embedding for lesson note ${args.lessonNoteId}:`, embeddingError);
        // Don't throw - embedding generation failures shouldn't break the update flow
        // The embedding will be retried on the next content update
        return null;
      }

      // Update the lesson note with new embedding
      try {
        await ctx.runMutation(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (internal as any).functions.lessonNotes.mutations.updateEmbedding,
          {
            lessonNoteId: args.lessonNoteId,
            embedding,
          }
        );
      } catch (mutationError) {
        console.error(`Error saving embedding for lesson note ${args.lessonNoteId}:`, mutationError);
        // Don't throw - embedding update failures shouldn't break the update flow
      }
    } catch (error) {
      console.error(`Error updating embedding for lesson note ${args.lessonNoteId}:`, error);
      // Don't throw - embedding update failures shouldn't break the update flow
    }

    return null;
  },
});


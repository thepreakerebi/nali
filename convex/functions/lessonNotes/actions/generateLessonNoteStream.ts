/**
 * Streaming Lesson Note Generation Agent
 * Generates detailed lesson notes using Mistral AI with Firecrawl integration
 */

"use node";

import { Experimental_Agent as Agent, stepCountIs } from "ai";
import { mistral } from "@ai-sdk/mistral";
import { v } from "convex/values";
import { action } from "../../../_generated/server";
import { api, internal } from "../../../_generated/api";
import {
  LESSON_NOTE_GENERATION_SYSTEM_PROMPT,
  getLessonNoteGenerationPrompt,
} from "../../prompts/lessonNoteGeneration";
import { createExtractResourceContentTool } from "../../lessonPlans/tools/extractResourceContent";
import { createSearchSimilarNotesTool } from "../tools/searchSimilarNotes";
import { generateEmbedding } from "../../utils/embeddings";
import type { Id } from "../../../_generated/dataModel";

// Type definitions for tool results
interface ExtractedResource {
  title: string;
  url: string;
  type: "youtube" | "document" | "link";
  summary: string;
  keyConcepts?: string[];
  educationalValue?: string;
  videoId?: string;
  duration?: string;
}

interface SimilarNote {
  title: string;
  content: string;
  similarityScore: number;
}

// ToolCall and ToolResult interfaces kept for reference but not directly used due to stream structure
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ToolCall {
  toolName?: string;
  name?: string;
  args?: Record<string, unknown>;
  input?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ToolResult {
  toolName?: string;
  name?: string;
  result?: unknown;
  output?: unknown;
}

// Stream event types
type StreamEvent =
  | { type: "status"; message: string }
  | { type: "tool_call"; toolName: string; args: Record<string, unknown> }
  | { type: "tool_result"; toolName: string; result: unknown }
  | { type: "text_chunk"; text: string }
  | { type: "complete"; lessonNoteId: Id<"lessonNotes">; title: string }
  | { type: "error"; error: string };

/**
 * Convert Blocknote JSON content to readable text
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
      if ("type" in block && block.type === "heading" && "props" in block && typeof block.props === "object" && block.props !== null && "level" in block.props) {
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
    if (typeof item === "object" && item !== null && "text" in item && typeof item.text === "string") {
      parts.push(item.text);
    }
  }
  return parts.join("");
}

/**
 * Streaming lesson note generation action
 * Returns an async generator that yields stream events
 */
export const generateLessonNoteStream = action({
  args: {
    lessonPlanId: v.id("lessonPlans"),
    language: v.optional(v.union(v.literal("en"), v.literal("fr"), v.literal("rw"))),
    additionalContext: v.optional(v.string()),
  },
  handler: async function* (
    ctx,
    args
  ): AsyncGenerator<StreamEvent, void, unknown> {
    try {
      // Get user ID from auth
      const authUserId = await ctx.runQuery(
        api.functions.utils.auth.getCurrentUserId,
        {}
      );
      if (!authUserId) {
        yield { type: "error", error: "Authentication required" };
        return;
      }

      yield { type: "status", message: "Loading lesson plan..." };

      // Get lesson plan details
      const lessonPlan = await ctx.runQuery(
        // @ts-expect-error - internal API path structure not fully typed by Convex
        (internal as unknown as { functions: { lessonNotes: { queries: { getLessonPlanForNoteGeneration: unknown } } } }).functions.lessonNotes.queries.getLessonPlanForNoteGeneration,
        {
          lessonPlanId: args.lessonPlanId,
        }
      );

      if (!lessonPlan) {
        yield { type: "error", error: "Lesson plan not found" };
        return;
      }

      // Verify ownership
      if (lessonPlan.userId !== authUserId) {
        yield { type: "error", error: "Unauthorized: You can only generate notes for your own lesson plans" };
        return;
      }

      // Get class and subject details
      const { class: classDoc, subject: subjectDoc } = await ctx.runQuery(
        // @ts-expect-error - internal API path structure not fully typed by Convex
        (internal as unknown as { functions: { lessonNotes: { queries: { getClassAndSubjectDetailsForNote: unknown } } } }).functions.lessonNotes.queries.getClassAndSubjectDetailsForNote,
        {
          lessonPlanId: args.lessonPlanId,
        }
      );

      if (!classDoc || !subjectDoc) {
        yield { type: "error", error: "Class or subject not found" };
        return;
      }

      // Get user profile to retrieve country and language
      const userProfile = await ctx.runQuery(
        api.functions.userProfile.queries.getCurrentUserProfile,
        {}
      );

      const country = userProfile?.country || undefined;
      const language = args.language || userProfile?.preferredLanguage || "en";

      yield { type: "status", message: "Searching for similar lesson notes..." };

      // Search for similar notes for context
      const searchSimilarNotes = createSearchSimilarNotesTool(ctx);
      let similarNotesContext = "";

      try {
        const similarQuery = `${lessonPlan.title} ${subjectDoc.name} ${classDoc.gradeLevel}`;
        if (searchSimilarNotes && searchSimilarNotes.execute) {
          // @ts-expect-error - tool execute signature varies by tool implementation
          const similarResults = await searchSimilarNotes.execute({
            query: similarQuery,
            lessonPlanId: args.lessonPlanId as string,
            limit: 3,
          });

          if (
            similarResults &&
            "similarNotes" in similarResults &&
            Array.isArray(similarResults.similarNotes) &&
            similarResults.similarNotes.length > 0
          ) {
            similarNotesContext = similarResults.similarNotes
              .map(
                (note: SimilarNote) =>
                  `- ${note.title}: ${note.content.substring(0, 200)}...`
              )
              .join("\n");
          }
        }
      } catch (error) {
        console.error("Error searching similar notes:", error);
        // Continue without similar notes context
      }

      yield { type: "status", message: "Extracting detailed resource content..." };

      // Extract detailed content from lesson plan resources
      const extractResourceContent = createExtractResourceContentTool();
      let detailedResourcesContext = "";
      let extractedResources: ExtractedResource[] = [];

      if (lessonPlan.resources && lessonPlan.resources.length > 0) {
        const resourceUrls = lessonPlan.resources
          .slice(0, 5) // Limit to 5 for cost control
          .map((r: { url: string }) => r.url);

        try {
          if (extractResourceContent && extractResourceContent.execute) {
            // Extract topic from lesson plan title
            const topic = lessonPlan.title.split(" - ")[0] || lessonPlan.title;

            // @ts-expect-error - tool execute signature varies by tool implementation
            const extractResults = await extractResourceContent.execute({
              urls: resourceUrls,
              topic,
              subject: subjectDoc.name,
            });

            if (
              extractResults &&
              "resources" in extractResults &&
              Array.isArray(extractResults.resources)
            ) {
              extractedResources = extractResults.resources;
              detailedResourcesContext = extractedResources
                .map(
                  (r: ExtractedResource) =>
                    `- ${r.title} (${r.type}): ${r.summary || r.educationalValue || ""}${r.keyConcepts && r.keyConcepts.length > 0 ? `\n  Key Concepts: ${r.keyConcepts.join(", ")}` : ""}`
                )
                .join("\n\n");
            }
          }
        } catch (error) {
          console.error("Error extracting resource content:", error);
          // Continue with basic resource info
          detailedResourcesContext = lessonPlan.resources
            .slice(0, 5)
            .map((r: { title: string; type: "youtube" | "document" | "link"; description?: string; url: string }) => 
              `- ${r.title} (${r.type}): ${r.description || r.url}`
            )
            .join("\n");
        }
      }

      yield { type: "status", message: "Generating detailed lesson notes..." };

      // Convert lesson plan content to text for prompt
      const lessonPlanText = blocknoteToText(lessonPlan.content);

      // Create agent with tools
      const agent = new Agent({
        model: mistral("mistral-large-latest"),
        system: LESSON_NOTE_GENERATION_SYSTEM_PROMPT,
        tools: {
          extractResourceContent,
        },
        stopWhen: stepCountIs(15),
      });

      // Generate prompt
      const prompt = getLessonNoteGenerationPrompt({
        lessonPlanTitle: lessonPlan.title,
        lessonPlanContent: lessonPlanText,
        lessonPlanObjectives: lessonPlan.objectives,
        lessonPlanMethods: lessonPlan.methods,
        lessonPlanResources: lessonPlan.resources,
        topic: lessonPlan.title.split(" - ")[0] || lessonPlan.title,
        subject: subjectDoc.name,
        gradeLevel: classDoc.gradeLevel,
        country,
        language,
        detailedResourcesContext,
        similarNotesContext,
        additionalContext: args.additionalContext,
      });

      // Stream agent execution
      let fullText = "";
      const streamResult = agent.stream({ prompt });
      // The stream result itself is async iterable (matching vendorDiscoveryAgentStream pattern)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const step of streamResult as any) {
        // Handle tool calls - check both content array and direct toolCalls property
        const toolCalls = step.toolCalls || 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (step.content?.filter((c: any) => c.type === "tool-call") || []);
        
        if (toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
            const toolName = toolCall.toolName || toolCall.name;
            const args = toolCall.args || toolCall.input;
            
            yield {
              type: "tool_call",
              toolName: toolName || "unknown",
              args: (args || {}) as Record<string, unknown>,
            };
          }
        }

        // Handle tool results - check both content array and direct toolResults property
        const toolResults = step.toolResults || 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (step.content?.filter((c: any) => c.type === "tool-result") || []);
        
        if (toolResults.length > 0) {
          for (const toolResult of toolResults) {
            const toolName = toolResult.toolName || toolResult.name;
            const result = toolResult.result || toolResult.output;
            
            yield {
              type: "tool_result",
              toolName: toolName || "unknown",
              result,
            };
          }
        }

        // Handle text chunks - check both direct text property and content array
        const textChunks = step.text ? [step.text] : 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (step.content?.filter((c: any) => c.type === "text-delta") || []);
        
        for (const textChunk of textChunks) {
          const text = typeof textChunk === "string" ? textChunk : textChunk.text || "";
          if (text) {
            fullText += text;
            yield { type: "text_chunk", text };
          }
        }
      }

      if (!fullText.trim()) {
        yield { type: "error", error: "Failed to generate lesson note content" };
        return;
      }

      yield { type: "status", message: "Generating embedding..." };

      // Generate embedding for the lesson note
      const embeddingText = `${lessonPlan.title} ${fullText.substring(0, 1000)}`;
      const embedding = await generateEmbedding(embeddingText);

      yield { type: "status", message: "Saving lesson note..." };

      // Convert text to Blocknote JSON format
      // Split by double newlines to create paragraphs
      const paragraphs = fullText
        .split(/\n\n+/)
        .filter((p) => p.trim().length > 0);

      const blocknoteContent = {
        blocks: paragraphs.map((paragraph, idx) => {
          // Detect headings (lines starting with #)
          const trimmed = paragraph.trim();
          if (trimmed.startsWith("# ")) {
            return {
              id: `block-${idx}`,
              type: "heading",
              props: { level: 1 },
              content: [
                {
                  type: "text",
                  text: trimmed.substring(2),
                  styles: {},
                },
              ],
            };
          } else if (trimmed.startsWith("## ")) {
            return {
              id: `block-${idx}`,
              type: "heading",
              props: { level: 2 },
              content: [
                {
                  type: "text",
                  text: trimmed.substring(3),
                  styles: {},
                },
              ],
            };
          } else if (trimmed.startsWith("### ")) {
            return {
              id: `block-${idx}`,
              type: "heading",
              props: { level: 3 },
              content: [
                {
                  type: "text",
                  text: trimmed.substring(4),
                  styles: {},
                },
              ],
            };
          } else {
            // Regular paragraph
            return {
              id: `block-${idx}`,
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: trimmed,
                  styles: {},
                },
              ],
            };
          }
        }),
      };

      // Create lesson note title from lesson plan title
      const title = `Lesson Notes: ${lessonPlan.title}`;

      // Store lesson note
      const lessonNoteId = await ctx.runMutation(
        // @ts-expect-error - internal API path structure not fully typed by Convex
        (internal as unknown as { functions: { lessonNotes: { mutations: { createLessonNote: unknown } } } }).functions.lessonNotes.mutations.createLessonNote,
        {
          userId: authUserId,
          lessonPlanId: args.lessonPlanId,
          title,
          content: blocknoteContent,
          embedding,
        }
      );

      yield {
        type: "complete",
        lessonNoteId,
        title,
      };
    } catch (error) {
      console.error("Lesson note generation stream error:", error);
      yield {
        type: "error",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});


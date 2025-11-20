/**
 * Streaming Lesson Plan Generation Agent
 * Generates lesson plans using Mistral AI with Firecrawl integration
 */

"use node";

import { Experimental_Agent as Agent, stepCountIs } from "ai";
import { mistral } from "@ai-sdk/mistral";
import { generateObject } from "ai";
import { z } from "zod";
import { v } from "convex/values";
import { action } from "../../../_generated/server";
import { api, internal } from "../../../_generated/api";
import {
  LESSON_PLAN_GENERATION_SYSTEM_PROMPT,
  getLessonPlanGenerationPrompt,
  LESSON_PLAN_EXTRACTION_PROMPT,
} from "../../prompts/lessonPlanGeneration";
import { createSearchCurriculumResourcesTool } from "../tools/searchCurriculumResources";
import { createExtractResourceContentTool } from "../tools/extractResourceContent";
import { createSearchSimilarPlansTool } from "../tools/searchSimilarPlans";
import { generateEmbedding } from "../../utils/embeddings";
import {
  createExternalAPIError,
  formatError,
} from "../../utils/errors";
import type { Id } from "../../../_generated/dataModel";

// Type definitions for tool results
interface SimilarPlan {
  title: string;
  topic: string;
  objectives: string[];
  methods: string[];
  similarityScore: number;
}

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

interface FirecrawlSearchResult {
  url: string;
  title: string;
  description: string;
  position: number;
  type: "youtube" | "document" | "link";
}

interface ToolCall {
  toolName?: string;
  name?: string;
  args?: Record<string, unknown>;
  input?: Record<string, unknown>;
}

interface ToolResult {
  toolName?: string;
  name?: string;
  result?: unknown;
  output?: unknown;
}

// AgentStep interface kept for reference but not directly used due to stream structure
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface AgentStep {
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  text?: string;
}

// Stream event types
type StreamEvent =
  | { type: "status"; message: string }
  | { type: "tool_call"; toolName: string; args: Record<string, unknown> }
  | { type: "tool_result"; toolName: string; result: unknown }
  | { type: "text_chunk"; text: string }
  | { type: "complete"; lessonPlanId: Id<"lessonPlans">; title: string }
  | { type: "error"; error: string };

// Schema for structured lesson plan metadata extraction
const lessonPlanMetadataSchema = z.object({
  objectives: z.array(z.string()).describe("Learning objectives"),
  materials: z.array(z.string()).describe("Required materials and resources"),
  methods: z.array(z.string()).describe("Instructional methods and activities"),
  assessment: z.array(z.string()).describe("Assessment activities and evaluation criteria"),
  references: z.array(z.string()).describe("References and sources"),
  resources: z.array(
    z.object({
      type: z.enum(["youtube", "document", "link"]),
      title: z.string(),
      url: z.string(),
      description: z.optional(z.string()),
    })
  ).describe("Recommended resources (YouTube videos, documents, links)"),
});

/**
 * Streaming lesson plan generation action
 * Returns an async generator that yields stream events
 */
export const generateLessonPlanStream = action({
  args: {
    lessonPlanId: v.optional(v.id("lessonPlans")), // Optional: if provided, update existing plan
    classId: v.id("classes"),
    subjectId: v.id("subjects"),
    topic: v.string(),
    objectives: v.optional(v.array(v.string())),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    language: v.optional(v.union(v.literal("en"), v.literal("fr"), v.literal("rw"))),
  },
  handler: async function* (
    ctx,
    args
  ): AsyncGenerator<StreamEvent, void, unknown> {
    try {
      // Get user ID from auth (actions can't directly use getAuthUserId, need to use runQuery)
      const authUserId = await ctx.runQuery(
        api.functions.utils.auth.getCurrentUserId,
        {}
      );
      if (!authUserId) {
        yield {
          type: "error",
          error: "Please sign in to generate lesson plans. Click 'Sign In' to authenticate with your Google account.",
        };
        return;
      }

      yield { type: "status", message: "Loading class and subject information..." };

      // Get class and subject details
      const { class: classDoc, subject: subjectDoc } = await ctx.runQuery(
        // @ts-expect-error - internal API path structure not fully typed by Convex
        (internal as unknown as { functions: { lessonPlans: { queries: { getClassAndSubjectDetails: unknown } } } }).functions.lessonPlans.queries.getClassAndSubjectDetails,
        {
          classId: args.classId,
          subjectId: args.subjectId,
        }
      );

      // Verify ownership
      const classFull = await ctx.runQuery(api.functions.classes.queries.getClass, {
        classId: args.classId,
      });
      const subjectFull = await ctx.runQuery(api.functions.subjects.queries.getSubject, {
        subjectId: args.subjectId,
      });

      if (!classFull) {
        yield {
          type: "error",
          error: "The selected class was not found or you don't have permission to access it. Please select a different class or refresh the page.",
        };
        return;
      }

      if (!subjectFull) {
        yield {
          type: "error",
          error: "The selected subject was not found or you don't have permission to access it. Please select a different subject or refresh the page.",
        };
        return;
      }

      // Get user profile to retrieve country
      const userProfile = await ctx.runQuery(
        api.functions.userProfile.queries.getCurrentUserProfile,
        {}
      );

      // Use country from args if provided, otherwise from user profile, otherwise undefined
      const country = args.country || userProfile?.country || undefined;
      const language = args.language || userProfile?.preferredLanguage || "en";

      yield { type: "status", message: "Searching for similar lesson plans..." };

      // Search for similar plans for context
      const searchSimilarPlans = createSearchSimilarPlansTool(ctx);
      let similarPlansContext = "";

      try {
        const similarQuery = `${args.topic} ${subjectDoc.name} ${classDoc.gradeLevel}`;
        if (searchSimilarPlans && searchSimilarPlans.execute) {
          // @ts-expect-error - tool execute signature varies by tool implementation
          const similarResults = await searchSimilarPlans.execute({
            query: similarQuery,
            classId: args.classId as string,
            subjectId: args.subjectId as string,
            limit: 3,
          });

          if (
            similarResults &&
            "similarPlans" in similarResults &&
            Array.isArray(similarResults.similarPlans) &&
            similarResults.similarPlans.length > 0
          ) {
            similarPlansContext = similarResults.similarPlans
              .map(
                (plan: SimilarPlan) =>
                  `- ${plan.title} (Objectives: ${plan.objectives.join(", ")})`
              )
              .join("\n");
          }
        }
      } catch (error) {
        console.error("Error searching similar plans:", error);
        // Continue without similar plans context - not critical for generation
        yield {
          type: "status",
          message: "Note: Could not load similar lesson plans, but continuing with generation...",
        };
      }

      yield { type: "status", message: "Searching curriculum resources..." };

      // Create tools
      const searchCurriculumResources = createSearchCurriculumResourcesTool();
      const extractResourceContent = createExtractResourceContentTool();

      // Search for curriculum resources
      let searchResults: {
        resources: FirecrawlSearchResult[];
        query: string;
        totalFound: number;
      } | null = null;

      if (searchCurriculumResources && searchCurriculumResources.execute) {
        // @ts-expect-error - tool execute signature varies by tool implementation
        const result = await searchCurriculumResources.execute({
          topic: args.topic,
          subject: subjectDoc.name,
          gradeLevel: classDoc.gradeLevel,
          country: country,
          region: args.region,
          limit: 10,
        });

        if (result && "resources" in result && "totalFound" in result) {
          searchResults = result as {
            resources: FirecrawlSearchResult[];
            query: string;
            totalFound: number;
          };
        }
      }

      if (searchResults) {
        yield {
          type: "tool_result",
          toolName: "searchCurriculumResources",
          result: { totalFound: searchResults.totalFound },
        };
      }

      let curriculumResourcesContext = "";
      let extractedResources: ExtractedResource[] = [];

      if (searchResults && searchResults.resources && searchResults.resources.length > 0) {
        yield {
          type: "status",
          message: `Extracting content from ${Math.min(searchResults.resources.length, 5)} resources...`,
        };

        // Extract content from top resources (limit to 5 for cost control)
        const topResourceUrls = searchResults.resources
          .slice(0, 5)
          .map((r: FirecrawlSearchResult) => r.url);

        try {
          if (extractResourceContent && extractResourceContent.execute) {
            // @ts-expect-error - tool execute signature varies by tool implementation
            const extractResults = await extractResourceContent.execute({
              urls: topResourceUrls,
              topic: args.topic,
              subject: subjectDoc.name,
            });

            if (
              extractResults &&
              "resources" in extractResults &&
              Array.isArray(extractResults.resources)
            ) {
              extractedResources = extractResults.resources;
            }
          }
          curriculumResourcesContext = extractedResources
            .map(
              (r: ExtractedResource) =>
                `- ${r.title} (${r.type}): ${r.summary || r.educationalValue || ""}`
            )
            .join("\n");
        } catch (error) {
          console.error("Error extracting resource content:", error);
          // Continue with basic resource info
          curriculumResourcesContext = searchResults.resources
            .slice(0, 5)
            .map((r: FirecrawlSearchResult) => `- ${r.title}: ${r.description || ""}`)
            .join("\n");
        }
      }

      yield { type: "status", message: "Generating lesson plan content..." };

      // Create agent with tools
      const agent = new Agent({
        model: mistral("mistral-large-latest"),
        system: LESSON_PLAN_GENERATION_SYSTEM_PROMPT,
        tools: {
          searchCurriculumResources,
          extractResourceContent,
        },
        stopWhen: stepCountIs(15),
      });

      // Generate prompt
      const prompt = getLessonPlanGenerationPrompt({
        topic: args.topic,
        subject: subjectDoc.name,
        gradeLevel: classDoc.gradeLevel,
        academicYear: classDoc.academicYear,
        objectives: args.objectives,
        country: country,
        region: args.region,
        language: language,
        similarPlansContext,
        curriculumResources: curriculumResourcesContext,
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
        yield { type: "error", error: "Failed to generate lesson plan content" };
        return;
      }

      yield { type: "status", message: "Extracting structured metadata..." };

      // Extract structured metadata from generated content
      let metadata;
      try {
        const extractionResult = await generateObject({
          model: mistral("mistral-large-latest"),
          schema: lessonPlanMetadataSchema,
          prompt: `${LESSON_PLAN_EXTRACTION_PROMPT}\n\nLesson Plan Content:\n${fullText}`,
        });

        metadata = extractionResult.object;
      } catch (error) {
        console.error("Error extracting metadata:", error);
        // Use fallback metadata
        metadata = {
          objectives: args.objectives || [],
          materials: [],
          methods: [],
          assessment: [],
          references: [],
          resources: extractedResources.map((r: ExtractedResource) => ({
            type: r.type || "link",
            title: r.title || "Untitled",
            url: r.url || "",
            description: r.summary || r.educationalValue || "",
          })),
        };
      }

      yield { type: "status", message: "Saving lesson plan..." };

      // Convert text to Blocknote JSON format
      // Split by double newlines to create paragraphs
      const paragraphs = fullText
        .split(/\n\n+/)
        .filter((p) => p.trim().length > 0);

      const blocknoteContent = paragraphs.map((paragraph) => {
          // Detect headings (lines starting with #)
          const trimmed = paragraph.trim();
          if (trimmed.startsWith("# ")) {
            return {
              type: "heading",
              props: {
                level: 1,
                textColor: "default",
                backgroundColor: "default",
                textAlignment: "left",
              },
              content: [
                {
                  type: "text",
                  text: trimmed.substring(2),
                  styles: {},
                },
              ],
              children: [],
            };
          } else if (trimmed.startsWith("## ")) {
            return {
              type: "heading",
              props: {
                level: 2,
                textColor: "default",
                backgroundColor: "default",
                textAlignment: "left",
              },
              content: [
                {
                  type: "text",
                  text: trimmed.substring(3),
                  styles: {},
                },
              ],
              children: [],
            };
          } else if (trimmed.startsWith("### ")) {
            return {
              type: "heading",
              props: {
                level: 3,
                textColor: "default",
                backgroundColor: "default",
                textAlignment: "left",
              },
              content: [
                {
                  type: "text",
                  text: trimmed.substring(4),
                  styles: {},
                },
              ],
              children: [],
            };
          } else {
            // Regular paragraph
            return {
              type: "paragraph",
              props: {
                textColor: "default",
                backgroundColor: "default",
                textAlignment: "left",
              },
              content: [
                {
                  type: "text",
                  text: trimmed,
                  styles: {},
                },
              ],
              children: [],
            };
          }
        });

      yield { type: "status", message: "Generating embedding..." };

      // Generate embedding for the lesson plan
      let embedding: number[];
      try {
        const embeddingText = `${args.topic} ${fullText.substring(0, 1000)}`;
        embedding = await generateEmbedding(embeddingText);
      } catch (embeddingError) {
        console.error("Error generating embedding:", embeddingError);
        // Don't fail if embedding generation fails - the scheduled update will handle it
        embedding = [];
      }

      // If lessonPlanId is provided, update existing plan; otherwise create new one
      let finalLessonPlanId: Id<"lessonPlans">;
      
      if (args.lessonPlanId) {
        // Update existing lesson plan
        finalLessonPlanId = args.lessonPlanId;
        
        // Get existing plan to preserve title
        const existingPlan = await ctx.runQuery(
          api.functions.lessonPlans.queries.getLessonPlan,
          { lessonPlanId: args.lessonPlanId }
        );
        
        const title = existingPlan?.title || `${args.topic} - ${subjectDoc.name}`;
        
        // Update the lesson plan with generated content
        // The updateLessonPlan mutation will automatically schedule embedding update
        await ctx.runMutation(
          api.functions.lessonPlans.mutations.updateLessonPlan,
          {
            lessonPlanId: args.lessonPlanId,
            content: blocknoteContent,
            objectives: metadata.objectives,
            materials: metadata.materials,
            methods: metadata.methods,
            assessment: metadata.assessment,
            references: metadata.references,
            resources: metadata.resources,
          }
        );
        
        // Also update embedding directly via internal mutation
        if (embedding.length > 0) {
          try {
            await ctx.runMutation(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (internal as any).functions.lessonPlans.mutations.updateEmbedding,
              {
                lessonPlanId: args.lessonPlanId,
                embedding,
              }
            );
          } catch (embeddingUpdateError) {
            console.error("Error updating embedding:", embeddingUpdateError);
            // Don't fail - embedding will be updated by scheduled action
          }
        }
        
        yield {
          type: "complete",
          lessonPlanId: finalLessonPlanId,
          title,
        };
      } else {
        // Create new lesson plan
        const title = `${args.topic} - ${subjectDoc.name}`;
        
        finalLessonPlanId = await ctx.runMutation(
          // @ts-expect-error - internal API path structure not fully typed by Convex
          (internal as unknown as { functions: { lessonPlans: { mutations: { createLessonPlan: unknown } } } }).functions.lessonPlans.mutations.createLessonPlan,
          {
            userId: authUserId,
            classId: args.classId,
            subjectId: args.subjectId,
            title,
            content: blocknoteContent,
            objectives: metadata.objectives,
            materials: metadata.materials,
            methods: metadata.methods,
            assessment: metadata.assessment,
            references: metadata.references,
            resources: metadata.resources,
            embedding,
          }
        );
        
        yield {
          type: "complete",
          lessonPlanId: finalLessonPlanId,
          title,
        };
      }
    } catch (error) {
      console.error("Lesson plan generation stream error:", error);
      const formattedError = formatError(error);
      
      // Provide more specific error messages based on error type
      let errorMessage = formattedError.message;
      if (formattedError.action) {
        errorMessage += ` ${formattedError.action}`;
      }
      
      // Check for common error patterns
      if (error instanceof Error) {
        if (error.message.includes("API") || error.message.includes("Mistral")) {
          const apiError = createExternalAPIError("Mistral AI", "generate lesson plan", true);
          errorMessage = `${apiError.message} ${apiError.action || ""}`;
        } else if (error.message.includes("Firecrawl") || error.message.includes("search")) {
          const apiError = createExternalAPIError("Firecrawl", "search curriculum resources", true);
          errorMessage = `${apiError.message} ${apiError.action || ""}`;
        } else if (error.message.includes("timeout") || error.message.includes("time")) {
          errorMessage = "The request took too long. Please try again with a simpler topic or check your internet connection.";
        }
      }
      
      yield {
        type: "error",
        error: errorMessage,
      };
    }
  },
});


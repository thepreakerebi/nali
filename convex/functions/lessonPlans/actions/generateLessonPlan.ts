/**
 * Non-streaming lesson plan generation action
 * This internal action can be scheduled and generates lesson plan content
 */

"use node";

import { Experimental_Agent as Agent, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { internalAction } from "../../../_generated/server";
import { api, internal } from "../../../_generated/api";
import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import {
  LESSON_PLAN_GENERATION_SYSTEM_PROMPT,
  getLessonPlanGenerationPrompt,
  LESSON_PLAN_EXTRACTION_PROMPT,
} from "../../prompts/lessonPlanGeneration";
import { generateEmbedding } from "../../utils/embeddings";
import { formatError } from "../../utils/errors";

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
 * Generate lesson plan action (non-streaming)
 * This internal action can be scheduled and generates lesson plan content
 */
export const generateLessonPlan = internalAction({
  args: {
    lessonPlanId: v.optional(v.id("lessonPlans")),
    userId: v.id("users"),
    classId: v.id("classes"),
    subjectId: v.id("subjects"),
    topic: v.string(),
    objectives: v.optional(v.array(v.string())),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    language: v.optional(v.union(v.literal("en"), v.literal("fr"), v.literal("rw"))),
  },
  returns: v.object({
    success: v.boolean(),
    lessonPlanId: v.id("lessonPlans"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; lessonPlanId: Id<"lessonPlans"> }> => {
    try {
      // Note: Auth is not propagated to scheduled functions, so userId is passed explicitly
      // Ownership was already verified in the mutation before scheduling this action
      // Fetch class and subject separately using internal queries (doesn't require auth)
      // Internal queries are in queries.ts and accessed via internal.functions.{module}.queries.{name}
      const classDoc = await ctx.runQuery(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (internal as any).functions.lessonPlans.queries.getClassInternal,
        {
          classId: args.classId,
        }
      );
      const subjectDoc = await ctx.runQuery(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (internal as any).functions.lessonPlans.queries.getSubjectInternal,
        {
          subjectId: args.subjectId,
        }
      );

      if (!classDoc || !subjectDoc) {
        throw new Error("Class or subject not found");
      }

      // Get user profile to retrieve country and language
      // Note: This query requires auth, so it may return null in scheduled actions
      // We handle this gracefully by using defaults
      let userProfile = null;
      try {
        userProfile = await ctx.runQuery(
          api.functions.userProfile.queries.getCurrentUserProfile,
          {}
        );
      } catch (error) {
        // If query fails due to auth, continue with defaults
        console.warn("Could not fetch user profile (auth not available in scheduled actions):", error);
      }

      // Use country from args if provided, otherwise from user profile, otherwise undefined
      const country = args.country || userProfile?.country || undefined;
      const language = args.language || userProfile?.preferredLanguage || "en";

      // Create agent with OpenAI's built-in web search tool
      // The agent will automatically search for curriculum resources as needed
      const agent = new Agent({
        model: openai("gpt-4o"),
        system: LESSON_PLAN_GENERATION_SYSTEM_PROMPT,
        tools: {
          web_search: openai.tools.webSearch({
            searchContextSize: "high", // Get comprehensive search results
          }),
        },
        stopWhen: stepCountIs(15),
      });

      // Generate prompt
      // The agent will use web search to find curriculum resources automatically
      const prompt = getLessonPlanGenerationPrompt({
        topic: args.topic,
        subject: subjectDoc.name,
        gradeLevel: classDoc.gradeLevel,
        academicYear: classDoc.academicYear,
        objectives: args.objectives,
        country: country,
        region: args.region,
        language: language,
      });

      // Execute agent and get result (non-streaming, like Shamp project)
      const result = await agent.generate({ prompt });
      const fullText = result.text;

      if (!fullText.trim()) {
        throw new Error("Failed to generate lesson plan content");
      }

      // Extract resources from web search results if available
      // Check for sources in result.sources (if available) or extract from tool results in steps
      let extractedResources: Array<{
        type: "youtube" | "document" | "link";
        title: string;
        url: string;
        description: string;
      }> = [];

      // Try to get sources from result.sources (available when using generateText with web_search)
      if ("sources" in result && Array.isArray(result.sources)) {
        extractedResources = result.sources
          .filter((source) => source.sourceType === "url" && "url" in source)
          .map((source) => {
            const url = (source as { url: string; title?: string }).url;
            const title = (source as { url: string; title?: string }).title;
            return {
              type: url.includes("youtube.com") || url.includes("youtu.be") 
                ? "youtube" as const 
                : "link" as const,
              title: title || "Untitled",
              url,
              description: "",
            };
          });
      } else {
        // Extract URLs from tool results in steps (fallback for Agent)
        // Agent steps may contain web_search tool results with sources
        const toolResults = result.steps.flatMap((step) => {
          const stepAny = step as { toolResults?: Array<{ toolName?: string; result?: { sources?: Array<{ url?: string; title?: string }> } }> };
          return stepAny.toolResults?.filter((tr) => tr.toolName === "web_search") || [];
        });
        
        for (const toolResult of toolResults) {
          const resultAny = toolResult as { result?: { sources?: Array<{ url?: string; title?: string }> } };
          if (resultAny.result?.sources && Array.isArray(resultAny.result.sources)) {
            extractedResources = resultAny.result.sources
              .filter((source): source is { url: string; title?: string } => Boolean(source.url))
              .map((source) => ({
                type: source.url.includes("youtube.com") || source.url.includes("youtu.be") 
                  ? "youtube" as const 
                  : "link" as const,
                title: source.title || "Untitled",
                url: source.url,
                description: "",
              }));
            break; // Use first web_search result
          }
        }
      }

      // Extract structured metadata from generated content
      let metadata;
      try {
        const extractionResult = await generateObject({
          model: openai("gpt-4o"),
          schema: lessonPlanMetadataSchema,
          prompt: `${LESSON_PLAN_EXTRACTION_PROMPT}\n\nLesson Plan Content:\n${fullText}`,
        });

        metadata = extractionResult.object;
        
        // Merge web search sources into resources if not already included
        if (extractedResources.length > 0 && metadata.resources.length === 0) {
          metadata.resources = extractedResources;
        }
      } catch (error) {
        console.error("Error extracting metadata:", error);
        // Use fallback metadata with web search sources
        metadata = {
          objectives: args.objectives || [],
          materials: [],
          methods: [],
          assessment: [],
          references: [],
          resources: extractedResources,
        };
      }

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
        
        // Update the lesson plan with generated content
        // Use internal mutation since we don't have auth context in scheduled actions
        // Internal mutations are in mutations.ts and accessed via internal.functions.{module}.mutations.{name}
        await ctx.runMutation(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (internal as any).functions.lessonPlans.mutations.updateLessonPlanInternal,
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
              (internal as any).functions.lessonPlans.mutations.updateEmbeddingInternal,
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
      } else {
        throw new Error("lessonPlanId is required for scheduled generation");
      }

      return {
        success: true,
        lessonPlanId: finalLessonPlanId,
      };
    } catch (error) {
      console.error("Lesson plan generation error:", error);
      const formattedError = formatError(error);
      throw new Error(formattedError.message || "Failed to generate lesson plan");
    }
  },
});

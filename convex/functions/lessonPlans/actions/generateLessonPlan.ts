/**
 * Non-streaming lesson plan generation action
 * This internal action can be scheduled and generates lesson plan content
 */

"use node";

import { Experimental_Agent as Agent, stepCountIs } from "ai";
import { mistral } from "@ai-sdk/mistral";
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
import { createSearchCurriculumResourcesTool } from "../tools/searchCurriculumResources";
import { createExtractResourceContentTool } from "../tools/extractResourceContent";
import { generateEmbedding } from "../../utils/embeddings";
import { formatError } from "../../utils/errors";

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

      let curriculumResourcesContext = "";
      let extractedResources: ExtractedResource[] = [];

      if (searchResults && searchResults.resources && searchResults.resources.length > 0) {
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
        curriculumResources: curriculumResourcesContext,
      });

      // Execute agent and get result (non-streaming, like Shamp project)
      const result = await agent.generate({ prompt });
      const fullText = result.text;

      if (!fullText.trim()) {
        throw new Error("Failed to generate lesson plan content");
      }

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
        await ctx.runMutation(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (internal as any).functions.lessonPlans.mutations.updateLessonPlan,
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

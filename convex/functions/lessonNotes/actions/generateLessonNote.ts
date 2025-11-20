/**
 * Non-streaming lesson note generation action
 * This internal action can be scheduled and generates lesson note content
 */

"use node";

import { Experimental_Agent as Agent, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { internalAction } from "../../../_generated/server";
import { api, internal } from "../../../_generated/api";
import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import {
  LESSON_NOTE_GENERATION_SYSTEM_PROMPT,
  getLessonNoteGenerationPrompt,
} from "../../prompts/lessonNoteGeneration";
import { generateEmbedding } from "../../utils/embeddings";
import { formatError } from "../../utils/errors";
import { marked } from "marked";
import type { Tokens } from "marked";
import type { Block } from "@blocknote/core";
import { createSearchCurriculumResourcesTool } from "../../lessonPlans/tools/searchCurriculumResources";
import { createExtractResourceContentTool } from "../../lessonPlans/tools/extractResourceContent";
import { createSearchSimilarNotesTool } from "../tools/searchSimilarNotes";

/**
 * Helper function to convert BlockNote content to plain text
 */
function blocknoteToText(content: unknown[]): string {
  const parts: string[] = [];
  for (const item of content) {
    if (typeof item === "object" && item !== null && "text" in item) {
      parts.push((item as { text: string }).text);
    }
  }
  return parts.join("");
}

/**
 * Generate lesson note action (non-streaming)
 * This internal action can be scheduled and generates lesson note content
 */
export const generateLessonNote = internalAction({
  args: {
    lessonNoteId: v.id("lessonNotes"),
    userId: v.id("users"),
    lessonPlanId: v.id("lessonPlans"),
  },
  returns: v.object({
    success: v.boolean(),
    lessonNoteId: v.id("lessonNotes"),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; lessonNoteId: Id<"lessonNotes"> }> => {
    try {
      // Note: Auth is not propagated to scheduled functions, so userId is passed explicitly
      // Ownership was already verified in the mutation before scheduling this action
      
      // Get lesson plan details using internal queries
      // Internal queries are in queries.ts and accessed via internal.functions.{module}.queries.{name}
      const lessonPlan = await ctx.runQuery(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (internal as any).functions.lessonNotes.queries.getLessonPlanForNoteGeneration,
        {
          lessonPlanId: args.lessonPlanId,
        }
      );

      if (!lessonPlan) {
        throw new Error("Lesson plan not found");
      }

      // Get class and subject details
      const { class: classDoc, subject: subjectDoc } = await ctx.runQuery(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (internal as any).functions.lessonNotes.queries.getClassAndSubjectDetailsForNote,
        {
          lessonPlanId: args.lessonPlanId,
        }
      );

      if (!classDoc || !subjectDoc) {
        throw new Error("Class or subject not found");
      }

      // Get user profile to retrieve country and language (may be null in scheduled actions)
      let userProfile = null;
      try {
        userProfile = await ctx.runQuery(
          api.functions.userProfile.queries.getCurrentUserProfile,
          {}
        );
      } catch (error) {
        console.warn("Could not fetch user profile (auth not available in scheduled actions):", error);
      }

      const country = userProfile?.country || undefined;
      const language = userProfile?.preferredLanguage || "en";

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
                (note: { title: string; content: string }) =>
                  `- ${note.title}: ${note.content.substring(0, 200)}...`
              )
              .join("\n");
          }
        }
      } catch (error) {
        console.error("Error searching similar notes:", error);
        // Continue without similar notes context
      }

      // Extract detailed content from lesson plan resources
      const extractResourceContent = createExtractResourceContentTool();
      let detailedResourcesContext = "";

      if (lessonPlan.resources && lessonPlan.resources.length > 0) {
        const resourceUrls = lessonPlan.resources
          .slice(0, 5)
          .map((r: { url: string }) => r.url);

        try {
          if (extractResourceContent && extractResourceContent.execute) {
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
              detailedResourcesContext = extractResults.resources
                .map(
                  (r: { title: string; summary?: string; educationalValue?: string; keyConcepts?: string[] }) =>
                    `- ${r.title}: ${r.summary || r.educationalValue || ""}${r.keyConcepts && r.keyConcepts.length > 0 ? `\n  Key Concepts: ${r.keyConcepts.join(", ")}` : ""}`
                )
                .join("\n\n");
            }
          }
        } catch (error) {
          console.error("Error extracting resource content:", error);
          // Continue with basic resource info
          detailedResourcesContext = lessonPlan.resources
            .slice(0, 5)
            .map((r: { title: string; description?: string; url: string }) => 
              `- ${r.title}: ${r.description || r.url}`
            )
            .join("\n");
        }
      }

      // Create agent with tools
      const agent = new Agent({
        model: openai("gpt-4o"),
        system: LESSON_NOTE_GENERATION_SYSTEM_PROMPT,
        tools: {
          searchCurriculumResources: createSearchCurriculumResourcesTool(),
          extractResourceContent,
        },
        stopWhen: stepCountIs(15),
      });

      // Convert lesson plan content to text for prompt
      const lessonPlanText = blocknoteToText(lessonPlan.content as unknown[]);

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
      });

      // Execute agent and get result (non-streaming)
      const result = await agent.generate({ prompt });
      const fullText = result.text;

      if (!fullText.trim()) {
        throw new Error("Failed to generate lesson note content");
      }

      // Helper function to extract YouTube video ID from URL
      const extractYouTubeId = (url: string): string | null => {
        const patterns = [
          /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
          /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
        ];
        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match && match[1]) {
            return match[1];
          }
        }
        return null;
      };

      // Helper function to convert markdown tokens to inline content
      const tokensToInlineContent = (tokens: Tokens.Generic[]): Array<{ type: string; text?: string; href?: string; content?: string; styles?: Record<string, boolean> }> => {
        const result: Array<{ type: string; text?: string; href?: string; content?: string; styles?: Record<string, boolean> }> = [];
        
        for (const token of tokens) {
          if (token.type === "text") {
            const textToken = token as Tokens.Text;
            result.push({
              type: "text",
              text: textToken.text,
              styles: {},
            });
          } else if (token.type === "strong") {
            const strongToken = token as Tokens.Strong;
            const children = tokensToInlineContent(strongToken.tokens || []);
            for (const child of children) {
              result.push({
                ...child,
                styles: { ...child.styles, bold: true },
              });
            }
          } else if (token.type === "em") {
            const emToken = token as Tokens.Em;
            const children = tokensToInlineContent(emToken.tokens || []);
            for (const child of children) {
              result.push({
                ...child,
                styles: { ...child.styles, italic: true },
              });
            }
          } else if (token.type === "link") {
            const linkToken = token as Tokens.Link;
            let href = linkToken.href;
            
            // Remove utm_source and other tracking parameters
            if (href.includes("?")) {
              const [baseUrl, params] = href.split("?");
              if (params) {
                const cleanParams = params.split("&").filter((param) => !param.startsWith("utm_")).join("&");
                href = baseUrl + (cleanParams ? "?" + cleanParams : "");
              }
            }
            
            const children = tokensToInlineContent(linkToken.tokens || []);
            const linkText = children.length > 0 
              ? children.map(c => (c.type === "text" ? c.text : c.content || "")).join("") 
              : href;
            
            result.push({
              type: "link",
              content: linkText || href,
              href: href,
            } as { type: string; text?: string; href?: string; content?: string; styles?: Record<string, boolean> });
          } else if (token.type === "code") {
            const codeToken = token as Tokens.Code;
            result.push({
              type: "text",
              text: codeToken.text,
              styles: { code: true },
            });
          }
        }
        
        return result;
      };

      // Parse markdown to tokens
      const tokens = marked.lexer(fullText);
      
      // Convert tokens to BlockNote blocks
      const blocknoteContent: Block[] = [];
      
      for (const token of tokens) {
        if (token.type === "heading") {
          const headingToken = token as Tokens.Heading;
          const level = headingToken.depth;
          const inlineContent = tokensToInlineContent(headingToken.tokens || []);
          
          blocknoteContent.push({
            id: crypto.randomUUID(),
            type: "heading",
            props: {
              level: level as 1 | 2 | 3,
              textColor: "default",
              backgroundColor: "default",
              textAlignment: "left",
            },
            content: inlineContent.length > 0 ? inlineContent : [{ type: "text", text: headingToken.text || "", styles: {} }],
            children: [],
          } as Block);
        } else if (token.type === "paragraph") {
          const paraToken = token as Tokens.Paragraph;
          const inlineContent = tokensToInlineContent(paraToken.tokens || []);
          const textContent = paraToken.text || "";
          
          // Check if paragraph contains only a YouTube URL
          const youtubeUrlMatch = textContent.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s\)]+)/);
          
          if (youtubeUrlMatch && extractYouTubeId(youtubeUrlMatch[0])) {
            blocknoteContent.push({
              id: crypto.randomUUID(),
              type: "video",
              props: {
                url: youtubeUrlMatch[0],
                name: "",
                caption: "",
                showPreview: true,
                previewWidth: 512,
                textAlignment: "left",
                backgroundColor: "default",
              },
              content: undefined,
              children: [],
            } as Block);
          } else if (inlineContent.length > 0 || textContent.trim().length > 0) {
            blocknoteContent.push({
              id: crypto.randomUUID(),
              type: "paragraph",
              props: {
                textColor: "default",
                backgroundColor: "default",
                textAlignment: "left",
              },
              content: inlineContent.length > 0 ? inlineContent : [{ type: "text", text: textContent || "", styles: {} }],
              children: [],
            } as Block);
          }
        } else if (token.type === "list") {
          const listToken = token as Tokens.List;
          const isOrdered = listToken.ordered;
          
          for (const item of listToken.items) {
            const itemToken = item as Tokens.ListItem;
            const inlineContent = tokensToInlineContent(itemToken.tokens || []);
            const itemText = itemToken.text || "";
            
            if (itemText.toLowerCase().trim() === "list" || itemText.trim().length === 0) {
              continue;
            }
            
            blocknoteContent.push({
              id: crypto.randomUUID(),
              type: isOrdered ? "numberedListItem" : "bulletListItem",
              props: {
                textColor: "default",
                backgroundColor: "default",
                textAlignment: "left",
              },
              content: inlineContent.length > 0 ? inlineContent : [{ type: "text", text: itemText || "", styles: {} }],
              children: [],
            } as Block);
          }
        } else if (token.type === "code") {
          const codeToken = token as Tokens.Code;
          blocknoteContent.push({
            id: crypto.randomUUID(),
            type: "codeBlock",
            props: {
              language: codeToken.lang || "",
              textColor: "default",
              backgroundColor: "default",
            },
            content: [{ type: "text", text: codeToken.text, styles: {} }],
            children: [],
          } as Block);
        }
      }

      // Generate embedding for the lesson note
      let embedding: number[];
      try {
        const embeddingText = `${lessonPlan.title} ${fullText.substring(0, 1000)}`;
        embedding = await generateEmbedding(embeddingText);
      } catch (embeddingError) {
        console.error("Error generating embedding:", embeddingError);
        embedding = [];
      }

      // Update existing lesson note with generated content
      await ctx.runMutation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (internal as any).functions.lessonNotes.mutations.updateLessonNoteInternal,
        {
          lessonNoteId: args.lessonNoteId,
          content: blocknoteContent,
          embedding: embedding.length > 0 ? embedding : undefined,
        }
      );

      return {
        success: true,
        lessonNoteId: args.lessonNoteId,
      };
    } catch (error) {
      console.error("Lesson note generation error:", error);
      const formattedError = formatError(error);
      throw new Error(formattedError.message || "Failed to generate lesson note");
    }
  },
});


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
import { marked } from "marked";
import type { Tokens } from "marked";
import type { Block } from "@blocknote/core";
import { createSearchCurriculumResourcesTool } from "../tools/searchCurriculumResources";
import { createExtractResourceContentTool } from "../tools/extractResourceContent";

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

      // Create agent with Firecrawl tools for curriculum resource search and extraction
      // The agent will search for curriculum resources and extract detailed content as needed
      const agent = new Agent({
        model: openai("gpt-4o"),
        system: LESSON_PLAN_GENERATION_SYSTEM_PROMPT,
        tools: {
          searchCurriculumResources: createSearchCurriculumResourcesTool(),
          extractResourceContent: createExtractResourceContentTool(),
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

      // Extract resources from Firecrawl tool results
      // Check tool results in agent steps for searchCurriculumResources and extractResourceContent
      let extractedResources: Array<{
        type: "youtube" | "document" | "link";
        title: string;
        url: string;
        description: string;
      }> = [];

      // Extract resources from Firecrawl tool results in agent steps
      const toolResults = result.steps.flatMap((step) => {
        const stepAny = step as { 
          toolResults?: Array<{ 
            toolName?: string; 
            result?: unknown;
          }> 
        };
        return stepAny.toolResults || [];
      });

      // Process searchCurriculumResources tool results
      const searchResults = toolResults.filter((tr) => tr.toolName === "searchCurriculumResources");
      for (const searchResult of searchResults) {
        // Check if result exists before accessing properties (following Shamp pattern)
        if (!searchResult.result) {
          continue;
        }
        
        const resultAny = searchResult.result as { 
          resources?: Array<{
            url: string;
            title: string;
            description?: string;
            type?: "youtube" | "document" | "link";
          }>;
        };
        
        if (resultAny?.resources && Array.isArray(resultAny.resources)) {
          const resources = resultAny.resources
            .filter((resource) => {
              if (!resource.url) return false;
              // Filter out URLs with utm_source parameters (AI-generated tracking)
              return !resource.url.includes("utm_source=");
            })
            .map((resource) => {
              // Remove any utm parameters from URL
              const urlParts = resource.url.split("?");
              const baseUrl = urlParts[0];
              const params = urlParts[1] 
                ? urlParts[1].split("&").filter((param) => !param.startsWith("utm_")).join("&") 
                : "";
              const cleanUrl = baseUrl + (params ? "?" + params : "");
              
              return {
                type: (resource.type || 
                  (cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be") 
                    ? "youtube" 
                    : "link")) as "youtube" | "document" | "link",
                title: resource.title || "Untitled",
                url: cleanUrl,
                description: resource.description || "",
              };
            });
          
          extractedResources.push(...resources);
        }
      }

      // Process extractResourceContent tool results (these have more detailed information)
      const extractResults = toolResults.filter((tr) => tr.toolName === "extractResourceContent");
      for (const extractResult of extractResults) {
        // Check if result exists before accessing properties (following Shamp pattern)
        if (!extractResult.result) {
          continue;
        }
        
        const resultAny = extractResult.result as {
          resources?: Array<{
            url: string;
            title: string;
            summary?: string;
            type?: "youtube" | "document" | "link";
            educationalValue?: string;
          }>;
        };
        
        if (resultAny?.resources && Array.isArray(resultAny.resources)) {
          resultAny.resources
            .filter((resource) => {
              if (!resource.url) return false;
              // Filter out URLs with utm_source parameters
              return !resource.url.includes("utm_source=");
            })
            .forEach((resource) => {
              // Remove any utm parameters from URL
              const urlParts = resource.url.split("?");
              const baseUrl = urlParts[0];
              const params = urlParts[1] 
                ? urlParts[1].split("&").filter((param) => !param.startsWith("utm_")).join("&") 
                : "";
              const cleanUrl = baseUrl + (params ? "?" + params : "");
              
              // Use extract results (more detailed) but don't duplicate if already in extractedResources
              const existingIndex = extractedResources.findIndex((r) => r.url === cleanUrl);
              if (existingIndex >= 0) {
                // Update existing resource with more detailed info from extraction
                extractedResources[existingIndex] = {
                  ...extractedResources[existingIndex],
                  description: resource.summary || resource.educationalValue || extractedResources[existingIndex].description,
                };
              } else {
                // Add new resource
                extractedResources.push({
                  type: (resource.type || 
                    (cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be") 
                      ? "youtube" 
                      : "link")) as "youtube" | "document" | "link",
                  title: resource.title || "Untitled",
                  url: cleanUrl,
                  description: resource.summary || resource.educationalValue || "",
                });
              }
            });
        }
      }

      // Remove duplicates based on URL
      const uniqueResources = extractedResources.filter((resource, index, self) =>
        index === self.findIndex((r) => r.url === resource.url)
      );
      extractedResources = uniqueResources;

      // Extract structured metadata from generated content
      let metadata: {
        objectives: string[];
        materials: string[];
        methods: string[];
        assessment: string[];
        references: string[];
        resources: Array<{
          type: "youtube" | "document" | "link";
          title: string;
          url: string;
          description?: string;
        }>;
      };
      
      try {
        const extractionResult = await generateObject({
          model: openai("gpt-4o"),
          schema: lessonPlanMetadataSchema,
          prompt: `${LESSON_PLAN_EXTRACTION_PROMPT}\n\nLesson Plan Content:\n${fullText}`,
        });

        metadata = extractionResult.object;
        
        // Ensure resources array exists
        if (!metadata.resources) {
          metadata.resources = [];
        }
        
        // Merge Firecrawl tool sources into resources if not already included
        if (extractedResources.length > 0 && metadata.resources.length === 0) {
          metadata.resources = extractedResources;
        } else if (extractedResources.length > 0 && metadata.resources.length > 0) {
          // Merge extracted resources with metadata resources, avoiding duplicates
          const existingUrls = new Set(metadata.resources.map((r: { url: string }) => r.url));
          const newResources = extractedResources.filter((r) => !existingUrls.has(r.url));
          metadata.resources = [...metadata.resources, ...newResources];
        }
      } catch (error) {
        console.error("Error extracting metadata:", error);
        // Use fallback metadata with Firecrawl tool sources
        metadata = {
          objectives: args.objectives || [],
          materials: [],
          methods: [],
          assessment: [],
          references: [],
          resources: extractedResources || [],
        };
      }
      
      // Final safety check: ensure resources array always exists
      if (!metadata.resources || !Array.isArray(metadata.resources)) {
        metadata.resources = extractedResources || [];
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
        // Return type allows both 'text' and 'content' properties for flexibility
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
            
            // Check if it's a YouTube URL
            if (extractYouTubeId(href)) {
              // YouTube links will be handled separately as video blocks at paragraph level
              // Just push the link text for now
              const children = tokensToInlineContent(linkToken.tokens || []);
              for (const child of children) {
                result.push(child);
              }
            } else {
              // Regular link - BlockNote format: { type: "link", content: "text", href: "url" }
              const children = tokensToInlineContent(linkToken.tokens || []);
              const linkText = children.length > 0 
                ? children.map(c => (c.type === "text" ? c.text : c.content || "")).join("") 
                : href;
              
              // Clean URL to remove utm parameters
              let cleanHref = href;
              if (cleanHref.includes("?")) {
                const [baseUrl, params] = cleanHref.split("?");
                if (params) {
                  const cleanParams = params.split("&").filter((param) => !param.startsWith("utm_")).join("&");
                  cleanHref = baseUrl + (cleanParams ? "?" + cleanParams : "");
                }
              }
              
              result.push({
                type: "link",
                content: linkText || cleanHref,
                href: cleanHref,
              } as { type: string; text?: string; href?: string; content?: string; styles?: Record<string, boolean> });
            }
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
      
      // First pass: collect all blocks, identifying metadata headings
      const tempBlocks: Array<{ token: Tokens.Generic; isMetadata: boolean }> = [];
      let consecutiveMetadataCount = 0;
      
      for (const token of tokens) {
        if (token.type === "heading") {
          const headingToken = token as Tokens.Heading;
          const headingText = headingToken.text || "";
          // Check if this is a metadata heading (Subject, Topic, Grade Level, etc.)
          // Match patterns like "Subject: Mathematics" or "Subject:Mathematics"
          const isMetadataField = /^(subject|topic|grade level|academic year|language|duration):\s*/i.test(headingText);
          
          if (isMetadataField) {
            consecutiveMetadataCount++;
            tempBlocks.push({ token, isMetadata: true });
          } else {
            // If we had consecutive metadata, we've reached the end
            if (consecutiveMetadataCount > 0) {
              consecutiveMetadataCount = 0;
            }
            tempBlocks.push({ token, isMetadata: false });
          }
        } else {
          // Non-heading token - if we had consecutive metadata, format it now
          if (consecutiveMetadataCount > 0) {
            consecutiveMetadataCount = 0;
          }
          tempBlocks.push({ token, isMetadata: false });
        }
      }
      
      // Second pass: convert tokens to blocks, combining metadata headings
      let metadataFields: string[] = [];
      let metadataInserted = false;
      
      for (let i = 0; i < tempBlocks.length; i++) {
        const { token, isMetadata } = tempBlocks[i];
        
        if (isMetadata && token.type === "heading") {
          const headingToken = token as Tokens.Heading;
          const headingText = headingToken.text || "";
          metadataFields.push(headingText);
          
          // Check if next block is also metadata
          const nextIsMetadata = i + 1 < tempBlocks.length && tempBlocks[i + 1].isMetadata;
          if (!nextIsMetadata) {
            // Format all collected metadata as a single paragraph and insert at the beginning
            const metadataText = metadataFields.join(" • ");
            blocknoteContent.unshift({
              id: crypto.randomUUID(),
              type: "paragraph",
              props: {
                textColor: "default",
                backgroundColor: "default",
                textAlignment: "left",
              },
              content: [{ type: "text", text: metadataText, styles: {} }],
              children: [],
            } as Block);
            metadataFields = [];
            metadataInserted = true;
          }
        } else if (token.type === "heading") {
          // Non-metadata heading
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
            content: inlineContent.length > 0 ? inlineContent : [{ type: "text", text: "", styles: {} }],
            children: [],
          } as Block);
        } else if (token.type === "paragraph") {
          const paraToken = token as Tokens.Paragraph;
          const textContent = paraToken.text || "";
          
          // Skip paragraphs that contain unwanted intro/explanation text
          const lowerText = textContent.toLowerCase();
          if (
            (lowerText.includes("international best practices") && 
             lowerText.includes("culturally relevant context") &&
             lowerText.includes("global perspective")) ||
            lowerText.includes("below is a fully curriculum-aligned") ||
            lowerText.includes("this lesson plan is designed for immediate classroom use") ||
            lowerText.includes("where real, publicly accessible resources were found") ||
            lowerText.includes("no invented links are used") ||
            (lowerText.includes("curriculum-aligned") && lowerText.includes("grade") && lowerText.includes("lesson plan"))
          ) {
            continue; // Skip this paragraph
          }
          
          // Check if paragraph contains metadata (Subject:, Topic:, etc.) - sometimes AI puts it in paragraphs
          const metadataPattern = /^(subject|topic|grade level|academic year|language|duration):\s*/i;
          if (metadataPattern.test(textContent.trim()) && !metadataInserted) {
            // Extract metadata from paragraph and add to metadataFields
            const lines = textContent.split(/\n/).filter(line => line.trim().length > 0);
            for (const line of lines) {
              if (metadataPattern.test(line.trim())) {
                metadataFields.push(line.trim());
              }
            }
            // If we collected metadata, skip this paragraph and will add it later
            if (metadataFields.length > 0) {
              continue;
            }
          }
          
          // Check if paragraph starts with a section title (like "Learning Objectives", "Required Materials", etc.)
          // These should be converted to headings
          const sectionTitlePattern = /^(Learning Objectives|Required Materials and Resources|Instructional Methods|Assessment Activities|Assessment Criteria|References and Resources|References and Sources)/i;
          const trimmedText = textContent.trim();
          if (sectionTitlePattern.test(trimmedText)) {
            // Extract the title and remaining content
            const match = trimmedText.match(sectionTitlePattern);
            if (match) {
              const title = match[1];
              const remainingContent = trimmedText.substring(match[0].length).trim();
              
              // Add as heading
              blocknoteContent.push({
                id: crypto.randomUUID(),
                type: "heading",
                props: {
                  level: 2,
                  textColor: "default",
                  backgroundColor: "default",
                  textAlignment: "left",
                },
                content: [{ type: "text", text: title, styles: {} }],
                children: [],
              } as Block);
              
              // If there's remaining content, add it as a paragraph
              if (remainingContent.length > 0) {
                const remainingInlineContent = tokensToInlineContent(paraToken.tokens || []);
                // Remove the title part from inline content
                const filteredContent = remainingInlineContent.filter(item => {
                  const itemText = item.text || "";
                  return !sectionTitlePattern.test(itemText);
                });
                
                if (filteredContent.length > 0) {
                  blocknoteContent.push({
                    id: crypto.randomUUID(),
                    type: "paragraph",
                    props: {
                      textColor: "default",
                      backgroundColor: "default",
                      textAlignment: "left",
                    },
                    content: filteredContent,
                    children: [],
                  } as Block);
                }
              }
              continue;
            }
          }
          
          // If tokens exist, use them; otherwise parse the text as markdown
          let inlineContent: Array<{ type: string; text?: string; href?: string; content?: string; styles?: Record<string, boolean> }> = [];
          
          if (paraToken.tokens && paraToken.tokens.length > 0) {
            inlineContent = tokensToInlineContent(paraToken.tokens);
          } else if (textContent.trim().length > 0) {
            // Parse text that might contain markdown syntax
            try {
              const textTokens = marked.lexer(textContent);
              if (textTokens.length > 0 && textTokens[0].type === "paragraph") {
                const textParaToken = textTokens[0] as Tokens.Paragraph;
                inlineContent = tokensToInlineContent(textParaToken.tokens || []);
              } else {
                // Fallback: just use the text
                inlineContent = [{ type: "text", text: textContent, styles: {} }];
              }
            } catch {
              // If parsing fails, use raw text
              inlineContent = [{ type: "text", text: textContent, styles: {} }];
            }
          }
          
          // Clean URLs in inline content to remove utm_source parameters and ensure correct format
          inlineContent = inlineContent.map(item => {
            if (item.type === "link" && item.href) {
              let cleanHref = item.href;
              if (cleanHref.includes("?")) {
                const [baseUrl, params] = cleanHref.split("?");
                if (params) {
                  const cleanParams = params.split("&").filter((param) => !param.startsWith("utm_")).join("&");
                  cleanHref = baseUrl + (cleanParams ? "?" + cleanParams : "");
                }
              }
              // Ensure BlockNote link format: { type: "link", content: "text", href: "url" }
              return { 
                type: "link", 
                content: item.content || item.text || cleanHref, 
                href: cleanHref 
              };
            }
            // Ensure text items have correct format
            if (item.type === "text") {
              return { type: "text", text: item.text || item.content || "", styles: item.styles || {} };
            }
            return item;
          });
          
          // Check if paragraph contains only a YouTube URL
          const youtubeUrlMatch = textContent.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s\)]+)/);
          
          if (youtubeUrlMatch && extractYouTubeId(youtubeUrlMatch[0])) {
            // Create video block instead of paragraph
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
            let inlineContent: Array<{ type: string; text?: string; href?: string; content?: string; styles?: Record<string, boolean> }> = [];
            
            // If tokens exist, use them; otherwise parse the text
            if (itemToken.tokens && itemToken.tokens.length > 0) {
              inlineContent = tokensToInlineContent(itemToken.tokens);
            } else if (itemToken.text && itemToken.text.trim().length > 0) {
              // Parse text that might contain markdown syntax
              try {
                const textTokens = marked.lexer(itemToken.text);
                if (textTokens.length > 0 && textTokens[0].type === "paragraph") {
                  const textParaToken = textTokens[0] as Tokens.Paragraph;
                  inlineContent = tokensToInlineContent(textParaToken.tokens || []);
                } else {
                  inlineContent = [{ type: "text", text: itemToken.text, styles: {} }];
                }
              } catch {
                inlineContent = [{ type: "text", text: itemToken.text, styles: {} }];
              }
            }
            
            // Skip list items that just say "List" or are empty
            const itemText = itemToken.text || "";
            if (itemText.toLowerCase().trim() === "list" || itemText.trim().length === 0) {
              continue; // Skip empty or placeholder list items
            }
            
            // Clean URLs in inline content to remove utm_source parameters and ensure correct format
            const cleanedInlineContent = inlineContent.map(item => {
              if (item.type === "link" && item.href) {
                let cleanHref = item.href;
                if (cleanHref.includes("?")) {
                  const [baseUrl, params] = cleanHref.split("?");
                  if (params) {
                    const cleanParams = params.split("&").filter((param) => !param.startsWith("utm_")).join("&");
                    cleanHref = baseUrl + (cleanParams ? "?" + cleanParams : "");
                  }
                }
                // Ensure BlockNote link format: { type: "link", content: "text", href: "url" }
                return { 
                  type: "link", 
                  content: item.content || item.text || cleanHref, 
                  href: cleanHref 
                };
              }
              // Ensure text items have correct format
              if (item.type === "text") {
                return { type: "text", text: item.text || item.content || "", styles: item.styles || {} };
              }
              return item;
            });
            
            blocknoteContent.push({
              id: crypto.randomUUID(),
              type: isOrdered ? "numberedListItem" : "bulletListItem",
              props: {
                textColor: "default",
                backgroundColor: "default",
                textAlignment: "left",
              },
              content: cleanedInlineContent.length > 0 ? cleanedInlineContent : [{ type: "text", text: itemText || "", styles: {} }],
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
        } else if (token.type === "hr") {
          // Horizontal rule - skip or convert to paragraph with separator
          blocknoteContent.push({
            id: crypto.randomUUID(),
            type: "paragraph",
            props: {
              textColor: "default",
              backgroundColor: "default",
              textAlignment: "left",
            },
            content: [{ type: "text", text: "---", styles: {} }],
            children: [],
          } as Block);
        }
      }
      
      // If metadata fields were collected but not yet added, add them now at the beginning
      if (metadataFields.length > 0 && !metadataInserted) {
        const metadataText = metadataFields.join(" • ");
        blocknoteContent.unshift({
          id: crypto.randomUUID(),
          type: "paragraph",
          props: {
            textColor: "default",
            backgroundColor: "default",
            textAlignment: "left",
          },
          content: [{ type: "text", text: metadataText, styles: {} }],
          children: [],
        } as Block);
      }

      // Filter and add resources (YouTube videos and websites) to the content
      // Only use resources that came from web search (have valid URLs)
      const verifiedResources = (metadata.resources || []).filter((resource) => {
        // Only include resources with valid URLs from web search
        if (!resource.url || !resource.url.startsWith("http")) {
          return false;
        }
        
        // Filter out AI-generated URLs (those with utm_source=openai or similar patterns)
        if (resource.url.includes("utm_source=openai") || 
            resource.url.includes("?utm_source=") ||
            resource.url.includes("&utm_source=")) {
          return false;
        }
        
        // For YouTube, verify it's a real YouTube URL
        if (resource.type === "youtube") {
          const youtubeId = extractYouTubeId(resource.url);
          return youtubeId !== null && youtubeId.length > 0;
        }
        
        // For links, verify it's a valid URL
        return resource.type === "link" && resource.url.length > 0;
      });
      
      if (verifiedResources.length > 0) {
        // Find the "References and Sources" section or create it
        let referencesIndex = -1;
        for (let i = blocknoteContent.length - 1; i >= 0; i--) {
          const block = blocknoteContent[i];
          if (block.type === "heading" && 
              block.content && 
              Array.isArray(block.content) &&
              block.content.length > 0 &&
              typeof block.content[0] === "object" &&
              "text" in block.content[0] &&
              typeof block.content[0].text === "string" &&
              block.content[0].text.toLowerCase().includes("references")) {
            referencesIndex = i;
            break;
          }
        }

        // Add resources after references section or at the end
        const insertIndex = referencesIndex >= 0 ? referencesIndex + 1 : blocknoteContent.length;

        for (const resource of verifiedResources) {
          if (resource.type === "youtube" && resource.url) {
            // Add YouTube video block
            blocknoteContent.splice(insertIndex, 0, {
              id: crypto.randomUUID(),
              type: "video",
              props: {
                url: resource.url,
                name: resource.title || "",
                caption: resource.description || "",
                showPreview: true,
                previewWidth: 512,
                textAlignment: "left",
                backgroundColor: "default",
              },
              content: undefined,
              children: [],
            } as Block);
          } else if (resource.type === "link" && resource.url) {
            // Add link as a paragraph with URL in text (can be converted to link in editor)
            const linkText = resource.title ? `${resource.title}: ${resource.url}` : resource.url;
            blocknoteContent.splice(insertIndex, 0, {
              id: crypto.randomUUID(),
              type: "paragraph",
              props: {
                textColor: "default",
                backgroundColor: "default",
                textAlignment: "left",
              },
              content: [{
                type: "text",
                text: linkText,
                styles: {},
              }],
              children: [],
            } as Block);
          }
        }
      }

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

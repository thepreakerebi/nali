/**
 * Tool for extracting structured content from educational resources using Firecrawl Extract API
 */

"use node";

import { tool } from "ai";
import { z } from "zod";

const extractResourceContentSchema = z.object({
  urls: z
    .array(z.string())
    .describe("Array of URLs to extract content from (max 5 URLs)"),
  topic: z.string().describe("The lesson topic for context"),
  subject: z.string().describe("The subject area"),
});

type ExtractResourceContentParams = z.infer<
  typeof extractResourceContentSchema
>;

// Type definition for extracted resource content
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

const RESOURCE_EXTRACTION_PROMPT = `Extract key educational content from this resource that is relevant to the lesson topic and subject. Focus on:
- Main concepts and key information
- Educational value and relevance
- How it relates to curriculum standards
- Any specific examples or case studies
- Important details that would be useful for teaching

Provide a clear summary of the educational content and its relevance to the lesson.`;

export function createExtractResourceContentTool() {
  return tool({
    description:
      "Extract structured educational content from URLs (curriculum documents, YouTube videos, educational websites). Use this to get detailed information from resources found during search. Process up to 5 URLs at a time.",
    inputSchema: extractResourceContentSchema,
    execute: async ({
      urls,
      topic,
      subject,
    }: ExtractResourceContentParams) => {
      const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
      if (!firecrawlApiKey) {
        throw new Error("FIRECRAWL_API_KEY environment variable is not set");
      }

      // Limit to 5 URLs for cost control
      const urlsToProcess = urls.slice(0, 5);

      try {
        // Call Firecrawl Extract API
        const extractResponse = await fetch(
          "https://api.firecrawl.dev/v2/extract",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${firecrawlApiKey}`,
            },
            body: JSON.stringify({
              urls: urlsToProcess,
              prompt: `${RESOURCE_EXTRACTION_PROMPT}\n\nTopic: ${topic}\nSubject: ${subject}`,
              schema: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Title of the resource",
                  },
                  url: {
                    type: "string",
                    description: "URL of the resource",
                  },
                  type: {
                    type: "string",
                    enum: ["youtube", "document", "link"],
                    description: "Type of resource",
                  },
                  summary: {
                    type: "string",
                    description:
                      "Summary of the educational content and its relevance",
                  },
                  keyConcepts: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key concepts covered in this resource",
                  },
                  educationalValue: {
                    type: "string",
                    description:
                      "How this resource adds value to the lesson plan",
                  },
                  videoId: {
                    type: "string",
                    optional: true,
                    description:
                      "YouTube video ID if this is a YouTube resource",
                  },
                  duration: {
                    type: "string",
                    optional: true,
                    description: "Duration of video if applicable",
                  },
                },
                required: ["title", "url", "type", "summary"],
              },
              enableWebSearch: true,
              includeSubdomains: true,
              scrapeOptions: {
                onlyMainContent: true,
                formats: ["markdown"],
                waitFor: 1000,
              },
            }),
          }
        );

        if (!extractResponse.ok) {
          const errorText = await extractResponse.text();
          throw new Error(
            `Firecrawl Extract API error: ${extractResponse.statusText} - ${errorText}`
          );
        }

        const extractData = (await extractResponse.json()) as
          | { data: ExtractedResource | ExtractedResource[] }
          | { id: string; status?: string };

        // Handle both immediate results and job-based results
        let extractedResources: ExtractedResource[] = [];

        if ("data" in extractData) {
          // Immediate results
          extractedResources = Array.isArray(extractData.data)
            ? extractData.data
            : [extractData.data];
        } else if ("id" in extractData) {
          // Job-based extraction - poll for results
          let jobStatus = "processing";
          let attempts = 0;
          const maxAttempts = 30; // 30 seconds max wait

          while (jobStatus === "processing" && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

            const statusResponse = await fetch(
              `https://api.firecrawl.dev/v2/extract/${extractData.id}`,
              {
                headers: {
                  Authorization: `Bearer ${firecrawlApiKey}`,
                },
              }
            );

            if (statusResponse.ok) {
              const statusData = (await statusResponse.json()) as {
                status?: string;
                data?: ExtractedResource | ExtractedResource[];
              };
              jobStatus = statusData.status || "completed";

              if (jobStatus === "completed" && statusData.data) {
                extractedResources = Array.isArray(statusData.data)
                  ? statusData.data
                  : [statusData.data];
              }
            }

            attempts++;
          }
        }

        console.log(
          `Extracted content from ${extractedResources.length} resources`
        );

        return {
          resources: extractedResources,
          totalExtracted: extractedResources.length,
        };
      } catch (error) {
        console.error("Error extracting resource content:", error);
        throw new Error(
          `Failed to extract resource content: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },
  });
}


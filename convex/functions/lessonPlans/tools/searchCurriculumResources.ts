/**
 * Tool for searching curriculum resources using Firecrawl Search API
 */

"use node";

import { tool } from "ai";
import { z } from "zod";

const searchCurriculumResourcesSchema = z.object({
  topic: z.string().describe("The lesson topic to search for"),
  subject: z.string().describe("The subject area"),
  gradeLevel: z.string().describe("The grade level"),
  country: z.string().optional().describe("Country for curriculum alignment (e.g., Rwanda)"),
  region: z.string().optional().describe("Region within the country"),
  limit: z.number().optional().default(10).describe("Maximum number of results to return"),
});

type SearchCurriculumResourcesParams = z.infer<
  typeof searchCurriculumResourcesSchema
>;

// Type definition for Firecrawl search result
interface FirecrawlSearchResult {
  url: string;
  title?: string;
  description?: string;
  snippet?: string;
  metadata?: {
    title?: string;
    description?: string;
  };
}

export function createSearchCurriculumResourcesTool() {
  return tool({
    description:
      "Search for curriculum-aligned educational resources including curriculum documents, YouTube videos, and educational websites relevant to a specific topic, subject, and grade level. Use this to find resources that align with national curriculum standards.",
    inputSchema: searchCurriculumResourcesSchema,
    execute: async ({
      topic,
      subject,
      gradeLevel,
      country = "Rwanda",
      region,
      limit = 10,
    }: SearchCurriculumResourcesParams) => {
      const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
      if (!firecrawlApiKey) {
        throw new Error("FIRECRAWL_API_KEY environment variable is not set");
      }

      // Build search query
      const location = region ? `${country}, ${region}` : country;
      const searchQuery = `${topic} ${subject} ${gradeLevel} curriculum ${location} lesson plan educational resources`;

      try {
        // Call Firecrawl Search API
        const searchResponse = await fetch(
          "https://api.firecrawl.dev/v2/search",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${firecrawlApiKey}`,
            },
            body: JSON.stringify({
              query: searchQuery,
              limit: Math.min(limit, 20), // Cap at 20 for cost control
              location: location,
              sources: ["web"],
            }),
          }
        );

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          throw new Error(
            `Firecrawl Search API error: ${searchResponse.statusText} - ${errorText}`
          );
        }

        const searchData = (await searchResponse.json()) as {
          data?: { web?: FirecrawlSearchResult[] };
          web?: FirecrawlSearchResult[];
        };

        // Extract results from response
        const webResults: FirecrawlSearchResult[] =
          searchData.data?.web || searchData.web || [];

        console.log(
          `Found ${webResults.length} curriculum resource results for "${topic}"`
        );

        // Format results
        const resources = webResults.map((result: FirecrawlSearchResult, index: number) => ({
          url: result.url,
          title: result.title || result.metadata?.title || "Untitled",
          description:
            result.description ||
            result.metadata?.description ||
            result.snippet ||
            "",
          position: index + 1,
          type: determineResourceType(result.url, result.title),
        }));

        return {
          resources,
          query: searchQuery,
          totalFound: webResults.length,
        };
      } catch (error) {
        console.error("Error searching curriculum resources:", error);
        throw new Error(
          `Failed to search curriculum resources: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },
  });
}

/**
 * Determine resource type based on URL and title
 */
function determineResourceType(
  url: string,
  title?: string
): "youtube" | "document" | "link" {
  const urlLower = url.toLowerCase();
  const titleLower = (title || "").toLowerCase();

  if (
    urlLower.includes("youtube.com") ||
    urlLower.includes("youtu.be") ||
    titleLower.includes("youtube")
  ) {
    return "youtube";
  }

  if (
    urlLower.endsWith(".pdf") ||
    urlLower.endsWith(".doc") ||
    urlLower.endsWith(".docx") ||
    titleLower.includes("pdf") ||
    titleLower.includes("document")
  ) {
    return "document";
  }

  return "link";
}


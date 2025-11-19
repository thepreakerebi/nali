/**
 * Embedding generation utilities using Mistral AI
 */

"use node";

import { mistral } from "@ai-sdk/mistral";
import { embed } from "ai";

/**
 * Generate embedding for text content using Mistral Embed
 * Returns a 1024-dimensional vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const mistralApiKey = process.env.MISTRAL_API_KEY;
  if (!mistralApiKey) {
    throw new Error("MISTRAL_API_KEY environment variable is not set");
  }

  try {
    const { embedding } = await embed({
      model: mistral.textEmbedding("mistral-embed"),
      value: text,
    });

    if (!embedding || embedding.length !== 1024) {
      throw new Error(
        `Invalid embedding dimension: expected 1024, got ${embedding.length}`
      );
    }

    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const embeddings: number[][] = [];

  // Process in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(
      batch.map((text) => generateEmbedding(text))
    );
    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

/**
 * Embedding generation utilities using OpenAI
 */

"use node";

import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

/**
 * Generate embedding for text content using OpenAI text-embedding-3-small
 * Returns a 1536-dimensional vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  try {
    const { embedding } = await embed({
      model: openai.textEmbedding("text-embedding-3-small"),
      value: text,
    });

    if (!embedding || embedding.length === 0) {
      throw new Error(
        `Invalid embedding: got empty or invalid embedding`
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

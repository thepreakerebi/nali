/**
 * Convex action for BlockNote AI
 * Handles AI requests from BlockNote editor and streams responses using Vercel AI SDK
 */

"use node";

import { action } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { toolDefinitionsToToolSet } from "@blocknote/xl-ai";
import type { UIMessageChunk, CoreMessage } from "ai";

/**
 * BlockNote AI action
 * Handles AI requests and returns streaming response as async generator
 */
export const blocknoteAI = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
        content: v.optional(v.string()),
      })
    ),
    toolDefinitions: v.any(), // Record<string, ToolDefinition> or array
  },
  handler: async function* (ctx, args): AsyncGenerator<string, void, unknown> {
    // Authenticate user
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Validate messages
    if (!args.messages || !Array.isArray(args.messages)) {
      throw new Error("Messages are required");
    }

    // Convert messages to CoreMessage format for AI SDK
    // Handle empty/undefined content by defaulting to empty string
    const coreMessages: CoreMessage[] = args.messages
      .filter((msg) => msg.content !== undefined && msg.content !== null && msg.content.trim().length > 0) // Filter out messages with no content
      .map((msg) => ({
        role: msg.role,
        content: msg.content || "",
      }));

    // Ensure we have at least one message
    if (coreMessages.length === 0) {
      throw new Error("At least one message with content is required");
    }

    // Handle toolDefinitions - it can be null/undefined or a complex object
    // Convert BlockNote tool definitions to AI SDK tools
    // CRITICAL: Only process tools if we have valid, non-empty tool definitions
    // This prevents Convex from trying to serialize empty objects {}
    let tools: ReturnType<typeof toolDefinitionsToToolSet> | undefined = undefined;
    
    if (args.toolDefinitions) {
      let toolDefinitionsObj: Record<string, any> | null = null;
      
      if (Array.isArray(args.toolDefinitions) && args.toolDefinitions.length > 0) {
        // Only process if array is not empty
        const validDefs = args.toolDefinitions.filter((def: any) => def && typeof def === "object" && def !== null);
        if (validDefs.length > 0) {
          toolDefinitionsObj = Object.fromEntries(
            validDefs.map((def: any) => {
              const key = def.name || def.key || def.id || String(def);
              return [key, def];
            })
          );
        }
      } else if (typeof args.toolDefinitions === "object" && args.toolDefinitions !== null) {
        // Check if object has any keys (not empty {})
        const keys = Object.keys(args.toolDefinitions);
        if (keys.length > 0) {
          // Deep clone to avoid any reference issues
          try {
            const cloned = JSON.parse(JSON.stringify(args.toolDefinitions));
            // Verify cloned object is not empty
            if (cloned && typeof cloned === "object" && Object.keys(cloned).length > 0) {
              toolDefinitionsObj = cloned;
            }
          } catch {
            // If JSON serialization fails, check if original has keys
            if (keys.length > 0) {
              toolDefinitionsObj = args.toolDefinitions as Record<string, any>;
            }
          }
        }
      }

      // Only call toolDefinitionsToToolSet if we have a non-empty object
      // This prevents creating an empty {} that Convex can't serialize
      if (toolDefinitionsObj && Object.keys(toolDefinitionsObj).length > 0) {
        try {
          const toolSet = toolDefinitionsToToolSet(toolDefinitionsObj);
          // Double-check the result is not empty before using it
          if (toolSet && typeof toolSet === "object" && Object.keys(toolSet).length > 0) {
            tools = toolSet;
          }
        } catch (error) {
          // If tool conversion fails, log but don't throw - we can proceed without tools
          console.error("Failed to convert tool definitions:", error);
        }
      }
    }

    // Build streamText options - only include tools if we have valid, non-empty tools
    const streamOptions: {
      model: ReturnType<typeof openai>;
      messages: CoreMessage[];
      tools?: ReturnType<typeof toolDefinitionsToToolSet>;
      toolChoice?: "required" | "auto" | "none";
    } = {
      model: openai("gpt-4o"),
      messages: coreMessages,
    };

    // Only add tools and toolChoice if we have valid, non-empty tools
    // This prevents Convex from trying to serialize {} 
    if (tools && typeof tools === "object" && Object.keys(tools).length > 0) {
      streamOptions.tools = tools;
      streamOptions.toolChoice = "required";
    }

    // Stream text using OpenAI
    const result = streamText(streamOptions);

    // Convert ReadableStream to async generator
    // Serialize each chunk to JSON string so Convex can handle it
    const stream = result.toUIMessageStream();
    const reader = stream.getReader();
    
    // Helper function to safely serialize chunks
    const serializeChunk = (chunk: UIMessageChunk): string => {
      try {
        // Use a replacer function to handle non-serializable values
        const serialized = JSON.stringify(chunk, (key, value) => {
          // Skip functions, undefined, and symbols
          if (typeof value === "function" || typeof value === "symbol" || value === undefined) {
            return null;
          }
          // Handle circular references and complex objects
          if (typeof value === "object" && value !== null) {
            // If it's an array, return as-is
            if (Array.isArray(value)) {
              return value;
            }
            // For objects, try to serialize only serializable properties
            const serializable: Record<string, any> = {};
            for (const [k, v] of Object.entries(value)) {
              if (typeof v !== "function" && typeof v !== "symbol" && v !== undefined) {
                try {
                  JSON.stringify(v); // Test if serializable
                  serializable[k] = v;
                } catch {
                  // Skip non-serializable properties
                }
              }
            }
            return serializable;
          }
          return value;
        });
        
        // Ensure we never yield an empty object string
        if (!serialized || serialized === "{}" || serialized === "null") {
          return JSON.stringify({ type: "error", message: "Failed to serialize chunk" });
        }
        
        return serialized;
      } catch (error) {
        // If serialization fails completely, return an error chunk
        console.error("Failed to serialize UIMessageChunk:", error);
        return JSON.stringify({ 
          type: "error", 
          message: error instanceof Error ? error.message : "Serialization failed" 
        });
      }
    };
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Skip null or undefined values
        if (value === null || value === undefined) {
          continue;
        }
        
        // Serialize chunk to JSON string for Convex compatibility
        const serialized = serializeChunk(value);
        yield serialized;
      }
    } finally {
      reader.releaseLock();
    }
  },
});

import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, toolDefinitions } = await req.json();

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get OpenAI API key from environment variables
    // Check both OPENAI_API_KEY and NEXT_OPENAI_API_KEY for compatibility
    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_OPENAI_API_KEY;
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: "OpenAI API key is missing. Please set OPENAI_API_KEY or NEXT_OPENAI_API_KEY in your environment variables." 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Convert BlockNote tool definitions to AI SDK tools
    // Use dynamic import at runtime to avoid Turbopack static analysis issues
    // The package is marked as serverExternalPackages so it will be available at runtime
    let tools: any;
    
    if (toolDefinitions) {
      // Dynamic import using string literal - Turbopack can't analyze this statically
      // The package is marked as serverExternalPackages in next.config.ts
      // so it will be available at runtime in serverless environments
      const blocknoteModule = "@blocknote/xl-ai";
      const blocknoteAI = await import(blocknoteModule);
      tools = blocknoteAI.toolDefinitionsToToolSet(toolDefinitions);
    } else {
      tools = undefined;
    }

    // Create OpenAI instance with explicit API key, then get the model
    const openai = createOpenAI({ apiKey });
    const model = openai("gpt-4o");

    // Stream text using OpenAI
    const result = streamText({
      model,
      messages: convertToModelMessages(messages),
      tools,
      toolChoice: tools ? "required" : "auto",
    });

    // Return the streaming response
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in chat API route:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

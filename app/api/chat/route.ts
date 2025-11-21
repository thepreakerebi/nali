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
    // Use Function constructor to create a truly dynamic import that Turbopack can't analyze
    let tools: any;
    
    if (toolDefinitions) {
      // Use Function constructor to create dynamic import that bypasses static analysis
      const importBlocknote = new Function('return import("@blocknote/xl-ai")');
      const blocknoteAI = await importBlocknote();
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

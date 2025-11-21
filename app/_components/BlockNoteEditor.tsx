"use client";

import { useEffect, useRef, useState } from "react";
import { 
  useCreateBlockNote,
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import type { BlockNoteEditor as BlockNoteEditorType, Block } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core";
import {
  AIMenuController,
  AIToolbarButton,
  createAIExtension,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import { en } from "@blocknote/core/locales";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import "@blocknote/xl-ai/style.css";

interface BlockNoteEditorProps {
  initialContent?: unknown;
  onContentChange?: (blocks: unknown) => void;
}

/**
 * Extract plain text from block content to check for markdown patterns
 */
function extractTextFromContent(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  if (Array.isArray(content)) {
    return content
      .map((item: any) => {
        if (item.type === "text" && item.text) return item.text;
        if (item.type === "link" && item.content) return `[${item.content}](${item.href || ""})`;
        return "";
      })
      .join("");
  }
  return "";
}

/**
 * Check if a block contains markdown patterns that need conversion
 */
function hasMarkdownPatterns(block: any): boolean {
  if (!block || typeof block !== "object" || block.type !== "paragraph") return false;
  
  // Check content for markdown patterns
  if (block.content && Array.isArray(block.content)) {
    const text = extractTextFromContent(block.content);
    // Check for markdown links [text](url) - most common issue
    if (/\[([^\]]+)\]\(([^)]+)\)/.test(text)) {
      // Verify that links aren't already properly formatted
      const hasProperLinks = block.content.some((item: any) => item.type === "link");
      return !hasProperLinks; // Only return true if markdown links exist but aren't converted
    }
    // Check for markdown bold **text** or __text__ that isn't formatted
    if (/\*\*([^*]+)\*\*|__([^_]+)__/.test(text)) {
      const hasBold = block.content.some((item: any) => item.styles?.bold);
      return !hasBold;
    }
    // Check for markdown italic *text* or _text_ that isn't formatted
    if (/(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_)/.test(text)) {
      const hasItalic = block.content.some((item: any) => item.styles?.italic);
      return !hasItalic;
    }
  }
  
  return false;
}

/**
 * Convert markdown text to BlockNote blocks using editor's markdown parser
 */
async function convertMarkdownToBlocks(
  editor: BlockNoteEditorType,
  markdownText: string
): Promise<Block[]> {
  try {
    const blocks = await editor.tryParseMarkdownToBlocks(markdownText);
    return blocks;
  } catch (error) {
    console.error("Error parsing markdown:", error);
    return [];
  }
}

// Formatting toolbar with the AI button added
function FormattingToolbarWithAI() {
  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar>
          {...getFormattingToolbarItems()}
          {/* Add the AI button */}
          <AIToolbarButton />
        </FormattingToolbar>
      )}
    />
  );
}

// Slash menu with the AI option added
function SuggestionMenuWithAI({ editor }: { editor: BlockNoteEditorType }) {
  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query) =>
        filterSuggestionItems(
          [
            ...getDefaultReactSlashMenuItems(editor),
            // add the default AI slash menu items
            ...getAISlashMenuItems(editor),
          ],
          query,
        )
      }
    />
  );
}

export function BlockNoteEditor({ initialContent, onContentChange }: BlockNoteEditorProps) {
  const [editor, setEditor] = useState<BlockNoteEditorType | null>(null);
  const hasLoadedContentRef = useRef(false);
  const isProcessingRef = useRef(false);
  const processedBlocksRef = useRef<Set<string>>(new Set());

  // Initialize BlockNote editor with AI extension
  // Using default HTTP transport which will call /api/chat
  const editorInstance = useCreateBlockNote({
    dictionary: {
      ...en,
      ai: aiEn, // add default translations for the AI extension
    },
    // Register the AI extension with default HTTP transport
    extensions: [
      createAIExtension({
        // No transport specified - uses default HTTP transport
        // Will POST to /api/chat by default (standard Vercel AI SDK endpoint)
      }),
    ],
  });

  useEffect(() => {
    if (editorInstance) {
      setEditor(editorInstance);
    }
  }, [editorInstance]);

  // Load initial content and update when content changes
  useEffect(() => {
    if (!editor || initialContent === undefined || isProcessingRef.current) return;

    try {
      // BlockNote stores content as an array of blocks
      let blocks: unknown[] = [];
      
      if (Array.isArray(initialContent)) {
        // Content is already an array of blocks
        blocks = initialContent;
      } else if (
        initialContent &&
        typeof initialContent === "object" &&
        "content" in initialContent &&
        Array.isArray(initialContent.content)
      ) {
        // Content is wrapped in a doc object: { type: "doc", content: [...] }
        blocks = initialContent.content;
      } else if (initialContent === null) {
        // No content yet, use empty array
        blocks = [];
      }
      
      // Check if content has actually changed by comparing block IDs or content length
      const currentBlocks = editor.document;
      const hasChanged = 
        currentBlocks.length !== blocks.length ||
        JSON.stringify(currentBlocks.map(b => b.id)) !== JSON.stringify(blocks.map((b: any) => b?.id));
      
      // Only update if content has changed or hasn't been loaded yet
      if (!hasLoadedContentRef.current || hasChanged) {
        // Always replace blocks to ensure content is loaded/updated
        // BlockNote will handle empty arrays by showing a default paragraph
        editor.replaceBlocks(editor.document, blocks as Parameters<typeof editor.replaceBlocks>[1]);
        hasLoadedContentRef.current = true;
        // Reset processed blocks when content changes
        processedBlocksRef.current.clear();
        
        // Post-process: Convert any remaining markdown patterns to proper formatting
        setTimeout(async () => {
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;
          
          try {
            const allBlocks = editor.document;
            const blocksToUpdate: Array<{ block: Block; markdown: string }> = [];
            
            // Find blocks with markdown patterns that haven't been processed yet
            for (const block of allBlocks) {
              // Skip if already processed
              if (processedBlocksRef.current.has(block.id)) continue;
              
              if (hasMarkdownPatterns(block)) {
                const text = extractTextFromContent(block.content);
                if (text.trim()) {
                  blocksToUpdate.push({ block, markdown: text });
                }
              }
            }
            
            // Convert markdown blocks (process in reverse to avoid index issues)
            if (blocksToUpdate.length > 0) {
              // Process blocks in reverse order to avoid index shifting issues
              for (let i = blocksToUpdate.length - 1; i >= 0; i--) {
                const { block, markdown } = blocksToUpdate[i];
                try {
                  const convertedBlocks = await convertMarkdownToBlocks(editor, markdown);
                  if (convertedBlocks.length > 0) {
                    // Replace the block with converted blocks
                    // Use the block's current position to ensure correct replacement
                    const blockIndex = editor.document.findIndex((b) => b.id === block.id);
                    if (blockIndex !== -1) {
                      const currentBlock = editor.document[blockIndex];
                      if (currentBlock && currentBlock.id === block.id) {
                        editor.replaceBlocks([currentBlock], convertedBlocks);
                        // Mark as processed
                        processedBlocksRef.current.add(block.id);
                      }
                    }
                  }
                } catch (error) {
                  console.error("Error converting markdown block:", error);
                  // Mark as processed even on error to avoid infinite retries
                  processedBlocksRef.current.add(block.id);
                }
              }
            }
          } catch (error) {
            console.error("Error in markdown post-processing:", error);
          } finally {
            isProcessingRef.current = false;
          }
        }, 1000); // Delay to ensure editor is fully ready
      }
    } catch (error) {
      console.error("Error loading content into editor:", error);
      hasLoadedContentRef.current = true;
    }
  }, [editor, initialContent]);

  // Handle content changes
  useEffect(() => {
    if (!editor || !onContentChange) return;

    const unsubscribe = editor.onChange(() => {
      onContentChange(editor.document);
    });

    return () => {
      unsubscribe();
    };
  }, [editor, onContentChange]);

  if (!editor) {
    return null;
  }

  return (
    <div className="min-h-full bg-background">
      <BlockNoteView
        editor={editor}
        className="min-h-full"
        theme="light"
        // Disable default UI elements to add custom ones with AI
        formattingToolbar={false}
        slashMenu={false}
      >
        {/* Add the AI Command menu to the editor */}
        <AIMenuController />

        {/* Custom Formatting Toolbar with AI button */}
        <FormattingToolbarWithAI />

        {/* Custom Slash Menu with AI option */}
        {editor && <SuggestionMenuWithAI editor={editor} />}
      </BlockNoteView>
    </div>
  );
}


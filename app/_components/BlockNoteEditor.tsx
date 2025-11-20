"use client";

import { useEffect, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import type { BlockNoteEditor } from "@blocknote/core";

interface BlockNoteEditorProps {
  initialContent?: unknown;
  onContentChange?: (blocks: unknown) => void;
}

export function BlockNoteEditor({ initialContent, onContentChange }: BlockNoteEditorProps) {
  const [editor, setEditor] = useState<BlockNoteEditor | null>(null);
  const hasLoadedContentRef = useRef(false);

  // Initialize BlockNote editor
  const editorInstance = useCreateBlockNote();

  useEffect(() => {
    if (editorInstance) {
      setEditor(editorInstance);
    }
  }, [editorInstance]);

  // Load initial content
  useEffect(() => {
    if (!editor || initialContent === undefined || hasLoadedContentRef.current) return;

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
      
      // Always replace blocks to ensure content is loaded
      // BlockNote will handle empty arrays by showing a default paragraph
      editor.replaceBlocks(editor.document, blocks as Parameters<typeof editor.replaceBlocks>[1]);
      hasLoadedContentRef.current = true;
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
      />
    </div>
  );
}


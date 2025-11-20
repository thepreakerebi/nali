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
    if (!editor || !initialContent || hasLoadedContentRef.current) return;

    try {
      const content = initialContent as { type?: string; content?: unknown[] } | unknown[];
      let blocks: unknown[] = [];
      
      if (Array.isArray(content)) {
        blocks = content;
      } else if (content && typeof content === "object" && "content" in content && Array.isArray(content.content)) {
        blocks = content.content;
      }
      
      if (blocks.length > 0) {
        editor.replaceBlocks(editor.document, blocks as Parameters<typeof editor.replaceBlocks>[1]);
      }
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


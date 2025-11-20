"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import type { BlockNoteEditor } from "@blocknote/core";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function LessonPlanEditorPage() {
  const params = useParams();
  const router = useRouter();
  const lessonPlanId = params.id as Id<"lessonPlans">;
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [editor, setEditor] = useState<BlockNoteEditor | null>(null);
  const isInitialLoadRef = useRef(true);

  // Fetch lesson plan
  const lessonPlan = useQuery(
    api.functions.lessonPlans.queries.getLessonPlan,
    lessonPlanId ? { lessonPlanId } : "skip"
  );
  const updateLessonPlan = useMutation(api.functions.lessonPlans.mutations.updateLessonPlan);

  // Initialize BlockNote editor - only create once
  const editorInstance = useCreateBlockNote();

  // Set editor instance when ready
  useEffect(() => {
    if (editorInstance && !editor) {
      setEditor(editorInstance);
    }
  }, [editorInstance, editor]);

  // Load content into editor when lesson plan loads for the first time
  useEffect(() => {
    if (!editor || !lessonPlan?.content || !isInitialLoadRef.current) return;

    try {
      editor.replaceBlocks(editor.document, lessonPlan.content as any);
      isInitialLoadRef.current = false;
    } catch (error) {
      console.error("Error loading content into editor:", error);
      isInitialLoadRef.current = false;
    }
  }, [editor, lessonPlan?.content]);

  // Auto-save on content change
  useEffect(() => {
    if (!lessonPlan || !editor || isInitialLoadRef.current) return;

    const handleChange = () => {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout for debounced save
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const blocks = editor.document;
          await updateLessonPlan({
            lessonPlanId,
            content: blocks,
          });
        } catch (error) {
          console.error("Error saving lesson plan:", error);
          toast.error("Failed to save changes. Please try again.");
        }
      }, 1000); // 1 second debounce
    };

    editor.onChange(handleChange);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      editor.removeListener("change", handleChange);
    };
  }, [editor, lessonPlan, lessonPlanId, updateLessonPlan]);

  // Loading state
  if (lessonPlan === undefined) {
    return (
      <main className="flex flex-col h-full w-full p-6 gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </main>
    );
  }

  // Not found state
  if (lessonPlan === null) {
    return (
      <main className="flex flex-col h-full w-full p-6 gap-4 items-center justify-center">
        <h1 className="text-2xl font-bold">Lesson Plan Not Found</h1>
        <p className="text-muted-foreground">
          The lesson plan you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button onClick={() => router.push("/")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex items-center gap-4 p-6 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/")}
          aria-label="Back to home"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{lessonPlan.title}</h1>
      </header>

      {/* Editor */}
      <section className="flex-1 overflow-auto p-6">
        {editor && (
          <BlockNoteView
            editor={editor}
            className="min-h-full"
          />
        )}
      </section>
    </main>
  );
}


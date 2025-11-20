"use client";

import { useEffect, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { BlockNoteEditor } from "@/app/_components/BlockNoteEditor";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSaveStatus } from "@/app/_components/saveStatusContext";

export default function LessonPlanEditorPage() {
  const params = useParams();
  const router = useRouter();
  const lessonPlanId = params.id as Id<"lessonPlans">;
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const isSavingRef = useRef(false);
  const { setSaveStatus } = useSaveStatus();

  // Fetch lesson plan
  const lessonPlan = useQuery(
    api.functions.lessonPlans.queries.getLessonPlan,
    lessonPlanId ? { lessonPlanId } : "skip"
  );
  const updateLessonPlan = useMutation(api.functions.lessonPlans.mutations.updateLessonPlan);

  // Track when content is loaded from server
  useEffect(() => {
    if (lessonPlan && lessonPlan.content) {
      // Mark initial load as complete after a short delay to allow editor to initialize
      const timer = setTimeout(() => {
        isInitialLoadRef.current = false;
        // Store the initial content hash to compare against
        lastSavedContentRef.current = JSON.stringify(lessonPlan.content);
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonPlan?.content]);

  // Check if lesson plan is being generated (content is empty/default)
  const isGenerating = useMemo(() => {
    if (!lessonPlan || lessonPlan === null) return false;
    
    // Check if content is empty or just the default empty paragraph
    const content = lessonPlan.content;
    if (!content || !Array.isArray(content)) return false;
    
    // If content has only one empty paragraph, it's likely still generating
    if (content.length <= 1) {
      const firstBlock = content[0];
      if (
        firstBlock &&
        typeof firstBlock === "object" &&
        "type" in firstBlock &&
        firstBlock.type === "paragraph" &&
        "content" in firstBlock &&
        Array.isArray(firstBlock.content) &&
        (firstBlock.content.length === 0 || 
         (firstBlock.content.length === 1 && 
          typeof firstBlock.content[0] === "object" &&
          "text" in firstBlock.content[0] &&
          (!firstBlock.content[0].text || firstBlock.content[0].text.trim().length === 0)))
      ) {
        return true;
      }
    }
    
    // If content has more than one block or non-empty content, generation is complete
    return false;
  }, [lessonPlan]);

  // Handle content changes with debouncing
  const handleContentChange = (blocks: unknown) => {
    // Don't save during initial load or if already saving
    if (isInitialLoadRef.current || isSavingRef.current) {
      return;
    }

    // Serialize blocks to compare with last saved content
    const currentContentString = JSON.stringify(blocks);
    
    // Skip if content hasn't actually changed
    if (currentContentString === lastSavedContentRef.current) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      // Double-check we're not in initial load
      if (isInitialLoadRef.current) {
        return;
      }

      // Check again if content has changed (might have been updated from server)
      const contentString = JSON.stringify(blocks);
      if (contentString === lastSavedContentRef.current) {
        return;
      }

      isSavingRef.current = true;
      setSaveStatus("saving");
      try {
        await updateLessonPlan({
          lessonPlanId,
          content: blocks,
        });
        
        // Update last saved content reference
        lastSavedContentRef.current = contentString;
        setSaveStatus("saved");
        
        // Reset to idle after 2 seconds
        setTimeout(() => {
          setSaveStatus("idle");
        }, 2000);
      } catch (error) {
        console.error("Error saving lesson plan:", error);
        toast.error("Failed to save changes. Please try again.");
        setSaveStatus("error");
        
        // Reset to idle after 3 seconds on error
        setTimeout(() => {
          setSaveStatus("idle");
        }, 3000);
        // Don't update lastSavedContentRef on error so we can retry
      } finally {
        isSavingRef.current = false;
      }
    }, 1000); // 1 second debounce
  };

  // Cleanup timeout on unmount and save any pending changes
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Save any pending changes before unmounting
      // Note: This is a best-effort save, might not complete if component unmounts quickly
      if (!isInitialLoadRef.current && !isSavingRef.current) {
        // Get current editor content if available
        // This is handled by the BlockNoteEditor's cleanup
      }
    };
  }, []);

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
          The lesson plan you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Button
          variant="outline"
          onClick={() => router.push("/")}
        >
          Back to Home
          </Button>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-full w-full">
      {/* Editor */}
      <section
        className={cn(
          "flex-1 overflow-auto px-6 md:px-32 py-6 bg-background transition-all duration-300",
          isGenerating && "generating-glow"
        )}
      >
        <BlockNoteEditor
          initialContent={lessonPlan.content}
          onContentChange={handleContentChange}
        />
      </section>
    </main>
  );
}


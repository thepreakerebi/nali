"use client";

import { useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { BlockNoteEditor } from "@/app/_components/BlockNoteEditor";

export default function LessonPlanEditorPage() {
  const params = useParams();
  const router = useRouter();
  const lessonPlanId = params.id as Id<"lessonPlans">;
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch lesson plan
  const lessonPlan = useQuery(
    api.functions.lessonPlans.queries.getLessonPlan,
    lessonPlanId ? { lessonPlanId } : "skip"
  );
  const updateLessonPlan = useMutation(api.functions.lessonPlans.mutations.updateLessonPlan);

  // Handle content changes with debouncing
  const handleContentChange = (blocks: unknown) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
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
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 border rounded-md hover:bg-accent"
        >
          Back to Home
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-full w-full">
      {/* Editor */}
      <section className="flex-1 overflow-auto p-6 bg-background">
        <BlockNoteEditor
          initialContent={lessonPlan.content}
          onContentChange={handleContentChange}
        />
      </section>
    </main>
  );
}


"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";
import { GraduationCap, BookOpen, FileText, StickyNote, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  count: number | undefined;
  onAdd: () => void;
}

function StatCard({ title, icon, count, onAdd }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-0 p-2">
      <header className="flex items-center justify-between gap-2 p-2">
        <section className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-medium">{title}</h2>
        </section>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={onAdd}
          aria-label={`Add ${title.toLowerCase()}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </header>
      <section className="px-2 py-2 bg-white rounded-2xl">
        {count === undefined ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-bold">{count}</p>
        )}
      </section>
    </Card>
  );
}

export default function Home() {
  const router = useRouter();
  const userProfile = useQuery(api.functions.userProfile.queries.getCurrentUserProfile);
  
  // Fetch counts
  const classesCount = useQuery(api.functions.classes.queries.getClassesCount, {});
  const subjectsCount = useQuery(api.functions.subjects.queries.getSubjectsCount, {});
  const lessonPlansCount = useQuery(api.functions.lessonPlans.queries.getLessonPlansCount, {});
  const lessonNotesCount = useQuery(api.functions.lessonNotes.queries.getLessonNotesCount, {});

  // Redirect immediately without rendering anything if onboarding not completed
  useEffect(() => {
    if (userProfile !== undefined) {
      if (userProfile === null) {
        // Not authenticated, redirect to signin (middleware should handle this, but safety check)
        router.replace("/signin");
        return;
      }
      if (!userProfile.onboardingCompleted) {
        // Authenticated but onboarding not completed - redirect immediately
        router.replace("/onboarding");
        return;
      }
    }
  }, [userProfile, router]);

  const handleCreateClass = () => {
    // TODO: Navigate to create class page when implemented
    router.push("/classes/new");
  };

  const handleCreateSubject = () => {
    // TODO: Navigate to create subject page when implemented
    router.push("/subjects/new");
  };

  const handleCreateLessonPlan = () => {
    router.push("/lesson-plans/new");
  };

  const handleCreateLessonNote = () => {
    router.push("/lesson-notes/new");
  };

  // Don't render anything until we know onboarding is completed
  // This prevents the flash of home page content
  if (userProfile === undefined) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center">
        <Spinner className="size-8" />
      </main>
    );
  }

  // Don't render home if not authenticated or onboarding not completed
  // Return null immediately to prevent any flash
  if (userProfile === null || !userProfile.onboardingCompleted) {
    return null;
  }

  return (
    <main className="h-full w-full overflow-auto">
      <section className="flex flex-col w-full gap-4">
        {/* Stats Cards Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Classes"
            icon={<GraduationCap className="h-4 w-4" />}
            count={classesCount}
            onAdd={handleCreateClass}
          />
          <StatCard
            title="Subjects"
            icon={<BookOpen className="h-4 w-4" />}
            count={subjectsCount}
            onAdd={handleCreateSubject}
          />
          <StatCard
            title="Lesson Plans"
            icon={<FileText className="h-4 w-4" />}
            count={lessonPlansCount}
            onAdd={handleCreateLessonPlan}
          />
          <StatCard
            title="Lesson Notes"
            icon={<StickyNote className="h-4 w-4" />}
            count={lessonNotesCount}
            onAdd={handleCreateLessonNote}
          />
        </section>

        {/* Second Section - Placeholder for future content */}
        <section className="flex flex-col w-full gap-4">
          {/* Future content will go here */}
        </section>
      </section>
    </main>
  );
}



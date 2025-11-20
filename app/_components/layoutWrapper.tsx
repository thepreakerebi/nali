"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppSidebar } from "./sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSaveStatus } from "./saveStatusContext";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

const NO_SIDEBAR_PATHS = ["/signin", "/onboarding"];

function PageTitle() {
  const pathname = usePathname();
  
  // Extract ID from pathname if it's a lesson plan or note page
  const lessonPlanId = useMemo(() => {
    if (!pathname) return null;
    const match = pathname.match(/^\/lesson-plans\/([^\/]+)/);
    return match ? (match[1] as Id<"lessonPlans">) : null;
  }, [pathname]);
  
  const lessonNoteId = useMemo(() => {
    if (!pathname) return null;
    const match = pathname.match(/^\/lesson-notes\/([^\/]+)/);
    return match ? (match[1] as Id<"lessonNotes">) : null;
  }, [pathname]);
  
  const lessonPlan = useQuery(
    api.functions.lessonPlans.queries.getLessonPlan,
    lessonPlanId ? { lessonPlanId } : "skip"
  );
  
  const lessonNote = useQuery(
    api.functions.lessonNotes.queries.getLessonNote,
    lessonNoteId ? { lessonNoteId } : "skip"
  );
  
  // Determine page title based on pathname
  const pageTitle = useMemo(() => {
    // Check for home page first
    if (!pathname || pathname === "/" || pathname === "") {
      return "Home";
    }
    
    // Check for lesson plan
    if (lessonPlanId) {
      if (lessonPlan === undefined) {
        return "Lesson Plan"; // Still loading
      }
      if (lessonPlan === null) {
        return null; // Not found
      }
      return lessonPlan.title;
    }
    
    // Check for lesson note
    if (lessonNoteId) {
      if (lessonNote === undefined) {
        return "Lesson Note"; // Still loading
      }
      if (lessonNote === null) {
        return null; // Not found
      }
      return lessonNote.title;
    }
    
    return null;
  }, [pathname, lessonPlanId, lessonPlan, lessonNoteId, lessonNote]);
  
  // Always render something - show "Home" as fallback if no title determined
  return <h1 className="text-lg font-semibold">{pageTitle || "Home"}</h1>;
}

function SaveStatusAlert() {
  const { saveStatus } = useSaveStatus();
  const pathname = usePathname();
  
  // Show on lesson plan and lesson note pages
  const isLessonPlanPage = pathname?.startsWith("/lesson-plans/");
  const isLessonNotePage = pathname?.startsWith("/lesson-notes/");
  
  if ((!isLessonPlanPage && !isLessonNotePage) || saveStatus === "idle") {
    return null;
  }
  
  if (saveStatus === "saving") {
    return (
      <Alert variant="default" className="ml-auto max-w-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>Saving...</AlertDescription>
      </Alert>
    );
  }
  
  if (saveStatus === "saved") {
    return (
      <Alert variant="default" className="ml-auto max-w-sm">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-600">Saved</AlertDescription>
      </Alert>
    );
  }
  
  if (saveStatus === "error") {
    return (
      <Alert variant="destructive" className="ml-auto max-w-sm">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to save</AlertDescription>
      </Alert>
    );
  }
  
  return null;
}

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldShowSidebar = !NO_SIDEBAR_PATHS.includes(pathname);

  if (!shouldShowSidebar) {
    return <>{children}</>;
  }

  return (
    <section className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger />
          <PageTitle />
          <SaveStatusAlert />
        </header>
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </SidebarInset>
    </section>
  );
}


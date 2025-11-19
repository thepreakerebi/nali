"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { GraduationCap, BookOpen, FileText, StickyNote, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { ClassListItem } from "@/app/_components/classListItem";
import { SubjectListItem } from "@/app/_components/subjectListItem";
import { AddClassModal } from "@/app/_components/addClassModal";
import { EditClassModal } from "@/app/_components/editClassModal";
import { DeleteClassModal } from "@/app/_components/deleteClassModal";
import { AddSubjectModal } from "@/app/_components/addSubjectModal";
import { EditSubjectModal } from "@/app/_components/editSubjectModal";
import { DeleteSubjectModal } from "@/app/_components/deleteSubjectModal";

interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  count: number | undefined;
  onAdd: () => void;
}

function StatCard({ title, icon, count, onAdd }: StatCardProps) {
  return (
    <Card 
      className="flex flex-col gap-0 p-2 cursor-pointer transition-colors hover:bg-accent"
      onClick={onAdd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAdd();
        }
      }}
      aria-label={`Add ${title.toLowerCase()}`}
    >
      <header className="flex items-center justify-between gap-2 p-2">
        <section className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-medium">{title}</h2>
        </section>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
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
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isDeleteClassModalOpen, setIsDeleteClassModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<{
    _id: Id<"classes">;
    name: string;
    gradeLevel: string;
    academicYear: string;
  } | null>(null);
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [isEditSubjectModalOpen, setIsEditSubjectModalOpen] = useState(false);
  const [isDeleteSubjectModalOpen, setIsDeleteSubjectModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<{
    _id: Id<"subjects">;
    classId: Id<"classes">;
    name: string;
    description?: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"classes" | "subjects">("classes");
  const userProfile = useQuery(api.functions.userProfile.queries.getCurrentUserProfile);
  
  // Fetch counts
  const classesCount = useQuery(api.functions.classes.queries.getClassesCount, {});
  const subjectsCount = useQuery(api.functions.subjects.queries.getSubjectsCount, {});
  const lessonPlansCount = useQuery(api.functions.lessonPlans.queries.getLessonPlansCount, {});
  const lessonNotesCount = useQuery(api.functions.lessonNotes.queries.getLessonNotesCount, {});
  
  // Fetch lists
  const classes = useQuery(api.functions.classes.queries.listClasses, {});
  const subjects = useQuery(api.functions.subjects.queries.listSubjects, {});

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
    setIsAddClassModalOpen(true);
  };

  const handleCreateSubject = () => {
    setIsAddSubjectModalOpen(true);
  };

  const handleCreateLessonPlan = () => {
    router.push("/lesson-plans/new");
  };

  const handleCreateLessonNote = () => {
    router.push("/lesson-notes/new");
  };

  const handleEditClass = (id: Id<"classes">) => {
    const classItem = classes?.find((c) => c._id === id);
    if (classItem) {
      setSelectedClass(classItem);
      setIsEditClassModalOpen(true);
    }
  };

  const handleDeleteClass = (id: Id<"classes">) => {
    const classItem = classes?.find((c) => c._id === id);
    if (classItem) {
      setSelectedClass(classItem);
      setIsDeleteClassModalOpen(true);
    }
  };

  const handleEditSubject = (id: Id<"subjects">) => {
    const subjectItem = subjects?.find((s) => s._id === id);
    if (subjectItem) {
      setSelectedSubject(subjectItem);
      setIsEditSubjectModalOpen(true);
    }
  };

  const handleDeleteSubject = (id: Id<"subjects">) => {
    const subjectItem = subjects?.find((s) => s._id === id);
    if (subjectItem) {
      setSelectedSubject(subjectItem);
      setIsDeleteSubjectModalOpen(true);
    }
  };

  // Don't render anything until we know onboarding is completed
  // This prevents the flash of home page content
  if (userProfile === undefined) {
    return (
      <section className="flex flex-col w-full gap-4">
          {/* Stats Cards Section Skeleton */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="flex flex-col gap-0 p-2">
                <header className="flex items-center justify-between gap-2 p-2">
                  <section className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-16" />
                  </section>
                  <Skeleton className="h-6 w-6 rounded-md" />
                </header>
                <section className="px-2 py-2 bg-white rounded-2xl">
                  <Skeleton className="h-8 w-16" />
                </section>
              </Card>
            ))}
          </section>

          {/* Tabs Section Skeleton */}
          <section className="flex flex-col w-full gap-4">
            <Skeleton className="h-10 w-full" />
            <section className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <article key={i} className="rounded-lg border p-4">
                  <section className="space-y-3">
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <section key={j} className="space-y-1">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-4 w-32" />
                        </section>
                      ))}
                    </section>
                  </section>
                </article>
              ))}
            </section>
          </section>
        </section>
    );
  }

  // Don't render home if not authenticated or onboarding not completed
  // Return null immediately to prevent any flash
  if (userProfile === null || !userProfile.onboardingCompleted) {
    return null;
  }

  return (
    <section className="h-full w-full">
      <AddClassModal
        open={isAddClassModalOpen}
        onOpenChange={setIsAddClassModalOpen}
        onSuccess={() => setActiveTab("classes")}
      />
      <EditClassModal
        open={isEditClassModalOpen}
        onOpenChange={setIsEditClassModalOpen}
        classId={selectedClass?._id || null}
        initialData={selectedClass ? {
          name: selectedClass.name,
          gradeLevel: selectedClass.gradeLevel,
          academicYear: selectedClass.academicYear,
        } : null}
      />
      <DeleteClassModal
        open={isDeleteClassModalOpen}
        onOpenChange={setIsDeleteClassModalOpen}
        classId={selectedClass?._id || null}
        className={selectedClass?.name || null}
      />
      <AddSubjectModal
        open={isAddSubjectModalOpen}
        onOpenChange={setIsAddSubjectModalOpen}
        onSuccess={() => setActiveTab("subjects")}
      />
      <EditSubjectModal
        open={isEditSubjectModalOpen}
        onOpenChange={setIsEditSubjectModalOpen}
        subjectId={selectedSubject?._id || null}
        initialData={selectedSubject ? {
          classId: selectedSubject.classId,
          name: selectedSubject.name,
          description: selectedSubject.description,
        } : null}
      />
      <DeleteSubjectModal
        open={isDeleteSubjectModalOpen}
        onOpenChange={setIsDeleteSubjectModalOpen}
        subjectId={selectedSubject?._id || null}
        subjectName={selectedSubject?.name || null}
      />
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

        {/* Second Section - Classes and Subjects Tabs */}
        <section className="flex flex-col w-full gap-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "classes" | "subjects")} className="w-full">
            <TabsList className="sticky top-0 z-10 bg-background border-b -mx-4">
              <TabsTrigger value="classes">Classes</TabsTrigger>
              <TabsTrigger value="subjects">Subjects</TabsTrigger>
            </TabsList>
            <TabsContent value="classes" className="mt-4">
              {classes === undefined ? (
                <nav className="space-y-2" aria-label="Classes list loading">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <article key={i} className="rounded-lg border p-4">
                      <section className="space-y-3">
                        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <section className="space-y-1">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-4 w-32" />
                          </section>
                          <section className="space-y-1">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-4 w-28" />
                          </section>
                          <section className="space-y-1">
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="h-4 w-24" />
                          </section>
                        </section>
                      </section>
                    </article>
                  ))}
                </nav>
              ) : classes.length === 0 ? (
                <Empty>
                  <EmptyMedia variant="icon">
                    <GraduationCap className="size-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No classes found</EmptyTitle>
                    <EmptyDescription>
                      Get started by adding your first class.
                    </EmptyDescription>
                  </EmptyHeader>
                  <Button variant="default-glass" onClick={handleCreateClass}>
                    Add Class
                  </Button>
                </Empty>
              ) : (
                <nav className="space-y-2" aria-label="Classes list">
                  {classes.map((classItem) => (
                    <ClassListItem
                      key={classItem._id}
                      classItem={classItem}
                      onEdit={handleEditClass}
                      onDelete={handleDeleteClass}
                    />
                  ))}
                </nav>
              )}
            </TabsContent>
            <TabsContent value="subjects" className="mt-4">
              {subjects === undefined ? (
                <nav className="space-y-2" aria-label="Subjects list loading">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <article key={i} className="rounded-lg border p-4">
                      <section className="space-y-3">
                        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <section className="space-y-1">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-4 w-32" />
                          </section>
                          <section className="space-y-1">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-4 w-36" />
                          </section>
                          <section className="space-y-1">
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="h-4 w-full" />
                          </section>
                        </section>
                      </section>
                    </article>
                  ))}
                </nav>
              ) : subjects.length === 0 ? (
                <Empty>
                  <EmptyMedia variant="icon">
                    <BookOpen className="size-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No subjects found</EmptyTitle>
                    <EmptyDescription>
                      Get started by adding your first subject.
                    </EmptyDescription>
                  </EmptyHeader>
                  <Button variant="default-glass" onClick={handleCreateSubject}>
                    Add Subject
                  </Button>
                </Empty>
              ) : (
                <nav className="space-y-2" aria-label="Subjects list">
                  {subjects.map((subject) => (
                    <SubjectListItem
                      key={subject._id}
                      subject={subject}
                      onEdit={handleEditSubject}
                      onDelete={handleDeleteSubject}
                    />
                  ))}
                </nav>
              )}
            </TabsContent>
          </Tabs>
        </section>
      </section>
    </section>
  );
}



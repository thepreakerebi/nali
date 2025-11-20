"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import * as React from "react";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  HomeIcon,
  FilterIcon,
  SearchIcon,
  Plus,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LessonPlanItem } from "./lessonPlanItem";
import { LessonNoteItem } from "./lessonNoteItem";
import { UserDropdown } from "./userDropdown";
import { CreateLessonPlanModal } from "./createLessonPlanModal";
import { DeleteLessonPlanModal } from "./deleteLessonPlanModal";
import { EditLessonPlanTitleModal } from "./editLessonPlanTitleModal";


function AppSidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const [lessonPlanSearch, setLessonPlanSearch] = useState("");
  const [lessonNoteSearch, setLessonNoteSearch] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<Id<"classes"> | undefined>();
  const [selectedSubjectId, setSelectedSubjectId] = useState<Id<"subjects"> | undefined>();
  const [selectedLessonPlanId, setSelectedLessonPlanId] = useState<Id<"lessonPlans"> | undefined>();
  const [isMounted, setIsMounted] = useState(false);
  const [isCreateLessonPlanModalOpen, setIsCreateLessonPlanModalOpen] = useState(false);
  const [isDeleteLessonPlanModalOpen, setIsDeleteLessonPlanModalOpen] = useState(false);
  const [isEditLessonPlanTitleModalOpen, setIsEditLessonPlanTitleModalOpen] = useState(false);
  const [selectedLessonPlanForDelete, setSelectedLessonPlanForDelete] = useState<{
    id: Id<"lessonPlans">;
    title: string;
  } | null>(null);
  const [selectedLessonPlanForEdit, setSelectedLessonPlanForEdit] = useState<{
    id: Id<"lessonPlans">;
    title: string;
  } | null>(null);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch data
  const lessonPlans = useQuery(
    api.functions.lessonPlans.queries.listLessonPlans,
    selectedClassId || selectedSubjectId
      ? {
          classId: selectedClassId,
          subjectId: selectedSubjectId,
        }
      : {}
  );
  const lessonNotes = useQuery(
    api.functions.lessonNotes.queries.listLessonNotes,
    selectedLessonPlanId ? { lessonPlanId: selectedLessonPlanId } : {}
  );
  const classes = useQuery(api.functions.classes.queries.listClasses, {});
  const subjects = useQuery(api.functions.subjects.queries.listSubjects, {});
  const deleteLessonNote = useMutation(api.functions.lessonNotes.mutations.deleteLessonNote);

  // Filter lesson plans by search
  const filteredLessonPlans = useMemo(() => {
    if (!lessonPlans) return [];
    if (!lessonPlanSearch) return lessonPlans;
    return lessonPlans.filter((plan) =>
      plan.title.toLowerCase().includes(lessonPlanSearch.toLowerCase())
    );
  }, [lessonPlans, lessonPlanSearch]);

  // Filter lesson notes by search
  const filteredLessonNotes = useMemo(() => {
    if (!lessonNotes) return [];
    if (!lessonNoteSearch) return lessonNotes;
    return lessonNotes.filter((note) =>
      note.title.toLowerCase().includes(lessonNoteSearch.toLowerCase())
    );
  }, [lessonNotes, lessonNoteSearch]);

  const handleDeleteLessonPlan = (id: Id<"lessonPlans">) => {
    const plan = lessonPlans?.find((p) => p._id === id);
    if (plan) {
      setSelectedLessonPlanForDelete({ id, title: plan.title });
      setIsDeleteLessonPlanModalOpen(true);
    }
  };

  const handleDeleteLessonNote = async (id: Id<"lessonNotes">) => {
    if (!confirm("Are you sure you want to delete this lesson note?")) return;
    try {
      await deleteLessonNote({ lessonNoteId: id });
      toast.success("Lesson note deleted");
    } catch {
      toast.error("Failed to delete lesson note");
    }
  };

  const handleEditLessonPlan = (id: Id<"lessonPlans">) => {
    const plan = lessonPlans?.find((p) => p._id === id);
    if (plan) {
      setSelectedLessonPlanForEdit({ id, title: plan.title });
      setIsEditLessonPlanTitleModalOpen(true);
    }
  };

  const handleCreateLessonPlan = () => {
    setIsCreateLessonPlanModalOpen(true);
  };

  const handleCreateLessonNote = () => {
    // TODO: Navigate to create page when implemented
    router.push("/lesson-notes/new");
  };

  const isHomeActive = pathname === "/";

  return (
    <>
      <CreateLessonPlanModal
        open={isCreateLessonPlanModalOpen}
        onOpenChange={setIsCreateLessonPlanModalOpen}
      />
      <DeleteLessonPlanModal
        open={isDeleteLessonPlanModalOpen}
        onOpenChange={(open) => {
          setIsDeleteLessonPlanModalOpen(open);
          if (!open) {
            setSelectedLessonPlanForDelete(null);
          }
        }}
        lessonPlanId={selectedLessonPlanForDelete?.id ?? null}
        lessonPlanTitle={selectedLessonPlanForDelete?.title ?? null}
      />
      <EditLessonPlanTitleModal
        open={isEditLessonPlanTitleModalOpen}
        onOpenChange={(open) => {
          setIsEditLessonPlanTitleModalOpen(open);
          if (!open) {
            setSelectedLessonPlanForEdit(null);
          }
        }}
        lessonPlanId={selectedLessonPlanForEdit?.id ?? null}
        initialTitle={selectedLessonPlanForEdit?.title ?? null}
      />
      <SidebarHeader className="p-4">
        <header className="flex items-center gap-2">
          <Image
            src="/nali-logo.svg"
            alt="Nali Logo"
            width={115}
            height={33}
            className="h-6 w-auto"
          />
        </header>
      </SidebarHeader>

      <SidebarContent className="px-4 gap-4">
        {/* Menu Items */}
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isHomeActive}
                  tooltip={isMounted ? "Home" : undefined}
                  onClick={() => router.push("/")}
                  className={isHomeActive ? "font-bold" : ""}
                >
                  <HomeIcon className={cn("size-4", isHomeActive && "stroke-3")} />
                  Home
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Lesson Plans Section */}
        <SidebarGroup className="p-0 flex-1 flex flex-col min-h-0">
          <header className="relative flex items-center justify-between px-2">
            <SidebarGroupLabel className="px-0 flex-1 text-sm font-bold">
              Lesson Plans
            </SidebarGroupLabel>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={handleCreateLessonPlan}
              aria-label="Create lesson plan"
            >
              <Plus className="h-8 w-8" />
            </Button>
          </header>
          <SidebarGroupContent className="px-2 mt-3 flex-1 flex flex-col min-h-0">
            {/* Search and Filter */}
            <section className="flex items-center gap-2 mb-2 shrink-0">
              <section className="relative flex-1">
                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Search plans..."
                  value={lessonPlanSearch}
                  onChange={(e) => setLessonPlanSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  aria-label="Search lesson plans"
                />
              </section>
              {isMounted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <FilterIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedClassId(undefined);
                      setSelectedSubjectId(undefined);
                    }}
                  >
                    All Classes & Subjects
                  </DropdownMenuItem>
                  {classes && classes.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {classes.map((classItem) => (
                        <DropdownMenuItem
                          key={classItem._id}
                          onClick={() => {
                            setSelectedClassId(classItem._id);
                            setSelectedSubjectId(undefined);
                          }}
                        >
                          {classItem.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                  {subjects && subjects.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {subjects.map((subject) => (
                        <DropdownMenuItem
                          key={subject._id}
                          onClick={() => {
                            setSelectedSubjectId(subject._id);
                            setSelectedClassId(undefined);
                          }}
                        >
                          {subject.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              ) : (
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                  <FilterIcon className="size-4" />
                </Button>
              )}
            </section>

            {/* Lesson Plans List */}
            <nav className="flex-1 min-h-0 overflow-y-auto text-left" aria-label="Lesson plans list">
              {lessonPlans === undefined ? (
                <section className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </section>
              ) : filteredLessonPlans.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No lesson plans found
                </p>
              ) : (
                <ul className="space-y-1" role="list">
                  {filteredLessonPlans.map((plan) => {
                    const isActive = pathname === `/lesson-plans/${plan._id}`;
                    return (
                    <li key={plan._id}>
                      <LessonPlanItem
                        plan={plan}
                          isActive={isActive}
                        onEdit={handleEditLessonPlan}
                        onDelete={handleDeleteLessonPlan}
                      />
                    </li>
                    );
                  })}
                </ul>
              )}
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Lesson Notes Section */}
        <SidebarGroup className="p-0 flex-1 flex flex-col min-h-0">
          <header className="relative flex items-center justify-between px-2 h-8">
            <SidebarGroupLabel className="px-0 flex-1 text-sm font-bold">
              Lesson Notes
            </SidebarGroupLabel>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={handleCreateLessonNote}
              aria-label="Create lesson note"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </header>
          <SidebarGroupContent className="px-2 mt-3 flex-1 flex flex-col min-h-0">
            {/* Search and Filter */}
            <section className="flex items-center gap-2 mb-2 shrink-0">
              <section className="relative flex-1">
                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Search notes..."
                  value={lessonNoteSearch}
                  onChange={(e) => setLessonNoteSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  aria-label="Search lesson notes"
                />
              </section>
              {isMounted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <FilterIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedLessonPlanId(undefined);
                    }}
                  >
                    All Lesson Plans
                  </DropdownMenuItem>
                  {lessonPlans && lessonPlans.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {lessonPlans.map((plan) => (
                        <DropdownMenuItem
                          key={plan._id}
                          onClick={() => {
                            setSelectedLessonPlanId(plan._id);
                          }}
                        >
                          {plan.title}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              ) : (
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                  <FilterIcon className="size-4" />
                </Button>
              )}
            </section>

            {/* Lesson Notes List */}
            <nav className="flex-1 min-h-0 overflow-y-auto text-left" aria-label="Lesson notes list">
              {lessonNotes === undefined ? (
                <section className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </section>
              ) : filteredLessonNotes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No lesson notes found
                </p>
              ) : (
                <ul className="space-y-1" role="list">
                  {filteredLessonNotes.map((note) => {
                    const isActive = pathname === `/lesson-notes/${note._id}`;
                    return (
                    <li key={note._id}>
                      <LessonNoteItem
                        note={note}
                          isActive={isActive}
                        onDelete={handleDeleteLessonNote}
                      />
                    </li>
                    );
                  })}
                </ul>
              )}
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 pb-4">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <UserDropdown />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </>
  );
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="offcanvas">
      <AppSidebarContent />
    </Sidebar>
  );
}



"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import * as React from "react";
import Image from "next/image";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  HomeIcon,
  FilterIcon,
  SearchIcon,
  Plus,
  X,
  Check,
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
import { cn } from "@/lib/utils";
import { LessonPlanItem } from "./lessonPlanItem";
import { LessonNoteItem } from "./lessonNoteItem";
import { UserDropdown } from "./userDropdown";
import { CreateLessonPlanModal } from "./createLessonPlanModal";
import { DeleteLessonPlanModal } from "./deleteLessonPlanModal";
import { EditLessonPlanTitleModal } from "./editLessonPlanTitleModal";
import { CreateLessonNoteModal } from "./createLessonNoteModal";
import { DeleteLessonNoteModal } from "./deleteLessonNoteModal";
import { EditLessonNoteTitleModal } from "./editLessonNoteTitleModal";


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
  const [isCreateLessonNoteModalOpen, setIsCreateLessonNoteModalOpen] = useState(false);
  const [isDeleteLessonNoteModalOpen, setIsDeleteLessonNoteModalOpen] = useState(false);
  const [isEditLessonNoteTitleModalOpen, setIsEditLessonNoteTitleModalOpen] = useState(false);
  const [selectedLessonNoteForDelete, setSelectedLessonNoteForDelete] = useState<{
    id: Id<"lessonNotes">;
    title: string;
  } | null>(null);
  const [selectedLessonNoteForEdit, setSelectedLessonNoteForEdit] = useState<{
    id: Id<"lessonNotes">;
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

  // Semantic search action
  const semanticSearchAction = useAction(api.functions.actions.semanticSearch.semanticSearch);
  const [semanticSearchResults, setSemanticSearchResults] = useState<Array<{
    _id: Id<"lessonPlans">;
    _creationTime: number;
    userId: Id<"users">;
    classId: Id<"classes">;
    subjectId: Id<"subjects">;
    title: string;
    content: unknown;
    objectives?: string[];
    materials?: string[];
    methods?: string[];
    assessment?: string[];
    references?: string[];
    resources?: Array<{
      type: "youtube" | "document" | "link";
      title: string;
      url: string;
      description?: string;
    }>;
    similarityScore: number;
    contentType: "lessonPlans";
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [semanticSearchNoteResults, setSemanticSearchNoteResults] = useState<Array<{
    _id: Id<"lessonNotes">;
    _creationTime: number;
    userId: Id<"users">;
    lessonPlanId: Id<"lessonPlans">;
    title: string;
    content: unknown;
    similarityScore: number;
    contentType: "lessonNotes";
  }>>([]);
  const [isSearchingNotes, setIsSearchingNotes] = useState(false);

  // Perform semantic search when search query changes for lesson plans
  useEffect(() => {
    const searchQuery = lessonPlanSearch.trim();
    
    if (!searchQuery) {
      setSemanticSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Debounce search
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await semanticSearchAction({
          query: searchQuery,
          contentType: "lessonPlans",
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          limit: 20,
        });
        
        // Filter to only lesson plans and type assert
        const planResults = results.filter(
          (r): r is typeof results[0] & { contentType: "lessonPlans" } =>
            r.contentType === "lessonPlans"
        );
        setSemanticSearchResults(planResults);
      } catch (error) {
        console.error("Error performing semantic search:", error);
        setSemanticSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [lessonPlanSearch, selectedClassId, selectedSubjectId, semanticSearchAction]);

  // Perform semantic search when search query changes for lesson notes
  useEffect(() => {
    const searchQuery = lessonNoteSearch.trim();
    
    if (!searchQuery) {
      setSemanticSearchNoteResults([]);
      setIsSearchingNotes(false);
      return;
    }

    // Debounce search
    const timeoutId = setTimeout(async () => {
      setIsSearchingNotes(true);
      try {
        const results = await semanticSearchAction({
          query: searchQuery,
          contentType: "lessonNotes",
          lessonPlanId: selectedLessonPlanId,
          limit: 20,
        });
        
        // Filter to only lesson notes and type assert
        const noteResults = results.filter(
          (r): r is typeof results[0] & { contentType: "lessonNotes" } =>
            r.contentType === "lessonNotes"
        );
        setSemanticSearchNoteResults(noteResults);
      } catch (error) {
        console.error("Error performing semantic search for notes:", error);
        setSemanticSearchNoteResults([]);
      } finally {
        setIsSearchingNotes(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [lessonNoteSearch, selectedLessonPlanId, semanticSearchAction]);

  // Filter lesson plans by search
  const filteredLessonPlans = useMemo(() => {
    if (!lessonPlans) return [];
    
    const searchQuery = lessonPlanSearch.trim().toLowerCase();
    
    // If there's a search query, combine semantic search with title-based filtering
    if (searchQuery) {
      // First, get exact title matches (case-insensitive)
      const titleMatches = lessonPlans.filter((plan) =>
        plan.title.toLowerCase().includes(searchQuery)
      );
      
      // Combine semantic search results with title matches
      // Remove duplicates by _id
      const combinedResults = [...titleMatches];
      const titleMatchIds = new Set(titleMatches.map((p) => p._id));
      
      for (const semanticResult of semanticSearchResults) {
        if (!titleMatchIds.has(semanticResult._id)) {
          combinedResults.push(semanticResult);
        }
      }
      
      return combinedResults;
    }
    
    // Otherwise, return all lesson plans
    return lessonPlans;
  }, [lessonPlans, lessonPlanSearch, semanticSearchResults]);

  // Filter lesson notes by search
  const filteredLessonNotes = useMemo(() => {
    if (!lessonNotes) return [];
    
    const searchQuery = lessonNoteSearch.trim().toLowerCase();
    
    // If there's a search query, combine semantic search with title-based filtering
    if (searchQuery) {
      // First, get exact title matches (case-insensitive)
      const titleMatches = lessonNotes.filter((note) =>
        note.title.toLowerCase().includes(searchQuery)
      );
      
      // Combine semantic search results with title matches
      // Remove duplicates by _id
      const combinedResults = [...titleMatches];
      const titleMatchIds = new Set(titleMatches.map((n) => n._id));
      
      for (const semanticResult of semanticSearchNoteResults) {
        if (!titleMatchIds.has(semanticResult._id)) {
          combinedResults.push(semanticResult);
        }
      }
      
      return combinedResults;
    }
    
    // Otherwise, return all lesson notes
    return lessonNotes;
  }, [lessonNotes, lessonNoteSearch, semanticSearchNoteResults]);

  const handleDeleteLessonPlan = (id: Id<"lessonPlans">) => {
    const plan = lessonPlans?.find((p) => p._id === id);
    if (plan) {
      setSelectedLessonPlanForDelete({ id, title: plan.title });
      setIsDeleteLessonPlanModalOpen(true);
    }
  };

  const handleDeleteLessonNote = (id: Id<"lessonNotes">) => {
    const note = lessonNotes?.find((n) => n._id === id);
    if (note) {
      setSelectedLessonNoteForDelete({ id, title: note.title });
      setIsDeleteLessonNoteModalOpen(true);
    }
  };

  const handleEditLessonNote = (id: Id<"lessonNotes">) => {
    const note = lessonNotes?.find((n) => n._id === id);
    if (note) {
      setSelectedLessonNoteForEdit({ id, title: note.title });
      setIsEditLessonNoteTitleModalOpen(true);
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
    setIsCreateLessonNoteModalOpen(true);
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
      <CreateLessonNoteModal
        open={isCreateLessonNoteModalOpen}
        onOpenChange={setIsCreateLessonNoteModalOpen}
      />
      <DeleteLessonNoteModal
        open={isDeleteLessonNoteModalOpen}
        onOpenChange={(open) => {
          setIsDeleteLessonNoteModalOpen(open);
          if (!open) {
            setSelectedLessonNoteForDelete(null);
          }
        }}
        lessonNoteId={selectedLessonNoteForDelete?.id ?? null}
        lessonNoteTitle={selectedLessonNoteForDelete?.title ?? null}
      />
      <EditLessonNoteTitleModal
        open={isEditLessonNoteTitleModalOpen}
        onOpenChange={(open) => {
          setIsEditLessonNoteTitleModalOpen(open);
          if (!open) {
            setSelectedLessonNoteForEdit(null);
          }
        }}
        lessonNoteId={selectedLessonNoteForEdit?.id ?? null}
        initialTitle={selectedLessonNoteForEdit?.title ?? null}
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
                  className={cn("h-8 text-sm", lessonPlanSearch ? "pl-8 pr-8" : "pl-8")}
                  aria-label="Search lesson plans"
                />
                {lessonPlanSearch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-transparent"
                    onClick={() => {
                      setLessonPlanSearch("");
                      setSemanticSearchResults([]);
                    }}
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </Button>
                )}
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
                    className={cn(
                      !selectedClassId && !selectedSubjectId && "bg-accent"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>All Classes & Subjects</span>
                      {!selectedClassId && !selectedSubjectId && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                  </DropdownMenuItem>
                  {classes && classes.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Classes
                      </div>
                      {classes.map((classItem) => {
                        const isSelected = selectedClassId === classItem._id;
                        return (
                          <DropdownMenuItem
                            key={classItem._id}
                            onClick={() => {
                              setSelectedClassId(classItem._id);
                              setSelectedSubjectId(undefined);
                            }}
                            className={cn(isSelected && "bg-accent")}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{classItem.name}</span>
                              {isSelected && <Check className="h-4 w-4" />}
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </>
                  )}
                  {subjects && subjects.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Subjects
                      </div>
                      {subjects.map((subject) => {
                        const isSelected = selectedSubjectId === subject._id;
                        return (
                          <DropdownMenuItem
                            key={subject._id}
                            onClick={() => {
                              setSelectedSubjectId(subject._id);
                              setSelectedClassId(undefined);
                            }}
                            className={cn(isSelected && "bg-accent")}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{subject.name}</span>
                              {isSelected && <Check className="h-4 w-4" />}
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
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
              {isSearching ? (
                <section className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </section>
              ) : lessonPlans === undefined ? (
                <section className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </section>
              ) : filteredLessonPlans.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  {lessonPlanSearch.trim() ? "No lesson plans found matching your search" : "No lesson plans found"}
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
                  className={cn("h-8 text-sm", lessonNoteSearch ? "pl-8 pr-8" : "pl-8")}
                  aria-label="Search lesson notes"
                />
                {lessonNoteSearch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-transparent"
                    onClick={() => {
                      setLessonNoteSearch("");
                      setSemanticSearchNoteResults([]);
                    }}
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </Button>
                )}
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
                    className={cn(!selectedLessonPlanId && "bg-accent")}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>All Lesson Plans</span>
                      {!selectedLessonPlanId && <Check className="h-4 w-4" />}
                    </div>
                  </DropdownMenuItem>
                  {lessonPlans && lessonPlans.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Lesson Plans
                      </div>
                      {lessonPlans.map((plan) => {
                        const isSelected = selectedLessonPlanId === plan._id;
                        return (
                          <DropdownMenuItem
                            key={plan._id}
                            onClick={() => {
                              setSelectedLessonPlanId(plan._id);
                            }}
                            className={cn(isSelected && "bg-accent")}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="truncate">{plan.title}</span>
                              {isSelected && <Check className="h-4 w-4 shrink-0 ml-2" />}
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
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
              {isSearchingNotes ? (
                <section className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </section>
              ) : lessonNotes === undefined ? (
                <section className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </section>
              ) : filteredLessonNotes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  {lessonNoteSearch.trim() ? "No lesson notes found matching your search" : "No lesson notes found"}
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
                        onEdit={handleEditLessonNote}
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



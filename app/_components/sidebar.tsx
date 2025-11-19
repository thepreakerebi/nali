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
  Pencil,
  TrashIcon,
  FilterIcon,
  SearchIcon,
  ChevronRightIcon,
  SettingsIcon,
  HelpCircleIcon,
  LogOutIcon,
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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function LessonPlanItem({
  plan,
  onEdit,
  onDelete,
}: {
  plan: {
    _id: Id<"lessonPlans">;
    title: string;
  };
  onEdit: (id: Id<"lessonPlans">) => void;
  onDelete: (id: Id<"lessonPlans">) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <article
      className="group relative flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent transition-colors"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <p className="flex-1 truncate text-sm text-sidebar-foreground">
        {plan.title}
      </p>
      {isHovered && (
        <nav className="flex items-center gap-1" aria-label="Lesson plan actions">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onEdit(plan._id)}
            aria-label="Edit lesson plan"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => onDelete(plan._id)}
            aria-label="Delete lesson plan"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
        </nav>
      )}
    </article>
  );
}

function LessonNoteItem({
  note,
  onDelete,
}: {
  note: {
    _id: Id<"lessonNotes">;
    title: string;
  };
  onDelete: (id: Id<"lessonNotes">) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <article
      className="group relative flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent transition-colors"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <p className="flex-1 truncate text-sm text-sidebar-foreground">
        {note.title}
      </p>
      {isHovered && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={() => onDelete(note._id)}
          aria-label="Delete lesson note"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </Button>
      )}
    </article>
  );
}

function UserDropdown() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const userProfile = useQuery(api.functions.userProfile.queries.getCurrentUserProfile);
  const { state } = useSidebar();

  // Get profile photo URL, ensuring it's a valid string or undefined
  const profilePhotoUrl = userProfile?.profilePhoto?.trim() || undefined;

  // Debug: Log profilePhoto value when it changes
  React.useEffect(() => {
    if (userProfile && typeof window !== "undefined") {
      console.log("UserProfile data:", {
        hasProfilePhoto: !!userProfile.profilePhoto,
        profilePhoto: userProfile.profilePhoto,
        profilePhotoType: typeof userProfile.profilePhoto,
        profilePhotoLength: userProfile.profilePhoto?.length,
        profilePhotoUrl,
      });
    }
  }, [userProfile, profilePhotoUrl]);


  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/signin");
      toast.success("Signed out successfully");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  if (userProfile === undefined) {
    return (
      <SidebarMenuButton
        className={cn(
          "w-full justify-start gap-2 !p-2 h-auto",
          state === "collapsed" && "!size-8 !p-2 justify-center"
        )}
        disabled
      >
        <Skeleton className="size-8 shrink-0 rounded-full" />
        {state === "expanded" && (
          <>
            <section className="flex flex-col gap-1 items-start flex-1 min-w-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </section>
            <Skeleton className="size-4 shrink-0 rounded" />
          </>
        )}
      </SidebarMenuButton>
    );
  }

  if (userProfile === null) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          className={cn(
            "w-full justify-start gap-2 !p-2 h-auto",
            state === "collapsed" && "!size-8 !p-2 justify-center"
          )}
          tooltip={
            state === "collapsed" && userProfile
              ? `${userProfile.name}${userProfile.schoolName ? ` - ${userProfile.schoolName}` : ""}`
              : undefined
          }
        >
          <Avatar className="size-8 shrink-0">
            <AvatarImage 
              src={profilePhotoUrl} 
              alt={`${userProfile.name}'s profile photo`}
              referrerPolicy="no-referrer"
              onError={(e) => {
                console.error("Failed to load profile photo:", {
                  url: profilePhotoUrl,
                  error: e,
                  target: e.currentTarget,
                  src: e.currentTarget.src,
                  naturalWidth: e.currentTarget.naturalWidth,
                  naturalHeight: e.currentTarget.naturalHeight,
                  complete: e.currentTarget.complete,
                });
              }}
              onLoad={(e) => {
                console.log("Profile photo loaded successfully:", {
                  url: profilePhotoUrl,
                  naturalWidth: e.currentTarget.naturalWidth,
                  naturalHeight: e.currentTarget.naturalHeight,
                  src: e.currentTarget.src,
                  complete: e.currentTarget.complete,
                });
              }}
            />
            <AvatarFallback className="text-xs">
              {getInitials(userProfile.name)}
            </AvatarFallback>
          </Avatar>
          {state === "expanded" && (
            <>
              <section className="flex flex-col gap-1 items-start flex-1 min-w-0">
                <p className="text-sm font-medium truncate w-full">
                  {userProfile.name}
                </p>
                {userProfile.schoolName && (
                  <p className="text-xs text-muted-foreground truncate w-full">
                    {userProfile.schoolName}
                  </p>
                )}
              </section>
              <ChevronRightIcon className="size-4 shrink-0" />
            </>
          )}
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-48">
        <DropdownMenuItem>
          <SettingsIcon className="size-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <HelpCircleIcon className="size-4" />
          Help
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOutIcon className="size-4" />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppSidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const [lessonPlanSearch, setLessonPlanSearch] = useState("");
  const [lessonNoteSearch, setLessonNoteSearch] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<Id<"classes"> | undefined>();
  const [selectedSubjectId, setSelectedSubjectId] = useState<Id<"subjects"> | undefined>();

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
  const lessonNotes = useQuery(api.functions.lessonNotes.queries.listLessonNotes, {});
  const classes = useQuery(api.functions.classes.queries.listClasses, {});
  const subjects = useQuery(api.functions.subjects.queries.listSubjects, {});
  const deleteLessonPlan = useMutation(api.functions.lessonPlans.mutations.deleteLessonPlan);
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

  const handleDeleteLessonPlan = async (id: Id<"lessonPlans">) => {
    if (!confirm("Are you sure you want to delete this lesson plan?")) return;
    try {
      await deleteLessonPlan({ lessonPlanId: id });
      toast.success("Lesson plan deleted");
    } catch {
      toast.error("Failed to delete lesson plan");
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
    // TODO: Navigate to edit page when implemented
    router.push(`/lesson-plans/${id}`);
  };

  const isHomeActive = pathname === "/";

  return (
    <>
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
                  tooltip="Home"
                  onClick={() => router.push("/")}
                >
                  <HomeIcon className="size-4" />
                  Home
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Lesson Plans Section */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-2">Lesson Plans</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            {/* Search and Filter */}
            <section className="flex items-center gap-2 mb-2">
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
            </section>

            {/* Lesson Plans List */}
            <nav className="max-h-[200px] overflow-y-auto" aria-label="Lesson plans list">
              {lessonPlans === undefined ? (
                <section className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </section>
              ) : filteredLessonPlans.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  No lesson plans found
                </p>
              ) : (
                <ul className="space-y-1" role="list">
                  {filteredLessonPlans.map((plan) => (
                    <li key={plan._id}>
                      <LessonPlanItem
                        plan={plan}
                        onEdit={handleEditLessonPlan}
                        onDelete={handleDeleteLessonPlan}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Lesson Notes Section */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-2">Lesson Notes</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            {/* Search */}
            <section className="mb-2">
              <section className="relative">
                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Search notes..."
                  value={lessonNoteSearch}
                  onChange={(e) => setLessonNoteSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  aria-label="Search lesson notes"
                />
              </section>
            </section>

            {/* Lesson Notes List */}
            <nav className="max-h-[200px] overflow-y-auto" aria-label="Lesson notes list">
              {lessonNotes === undefined ? (
                <section className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </section>
              ) : filteredLessonNotes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  No lesson notes found
                </p>
              ) : (
                <ul className="space-y-1" role="list">
                  {filteredLessonNotes.map((note) => (
                    <li key={note._id}>
                      <LessonNoteItem
                        note={note}
                        onDelete={handleDeleteLessonNote}
                      />
                    </li>
                  ))}
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
    <Sidebar collapsible="icon">
      <AppSidebarContent />
    </Sidebar>
  );
}



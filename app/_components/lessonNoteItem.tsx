"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { TrashIcon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LessonNoteItemProps {
  note: {
    _id: Id<"lessonNotes">;
    title: string;
  };
  isActive?: boolean;
  onDelete: (id: Id<"lessonNotes">) => void;
  onEdit: (id: Id<"lessonNotes">) => void;
}

export function LessonNoteItem({ note, isActive = false, onDelete, onEdit }: LessonNoteItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();

  const handleItemClick = () => {
    router.push(`/lesson-notes/${note._id}`);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(note._id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(note._id);
  };

  return (
    <article
      className={cn(
        "group relative flex items-center gap-2 rounded-md px-2 py-2 transition-colors cursor-pointer",
        isActive
          ? "bg-sidebar-accent font-bold text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent text-sidebar-foreground"
      )}
      onClick={handleItemClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <p className={cn("flex-1 truncate text-sm", isActive && "font-bold")}>
        {note.title}
      </p>
      {isHovered && (
        <nav className="flex items-center gap-1" aria-label="Lesson note actions">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleEditClick}
            aria-label="Edit lesson note title"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={handleDeleteClick}
            aria-label="Delete lesson note"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
        </nav>
      )}
    </article>
  );
}


"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LessonNoteItemProps {
  note: {
    _id: Id<"lessonNotes">;
    title: string;
  };
  isActive?: boolean;
  onDelete: (id: Id<"lessonNotes">) => void;
}

export function LessonNoteItem({ note, isActive = false, onDelete }: LessonNoteItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <article
      className={cn(
        "group relative flex items-center gap-2 rounded-md px-2 py-2 transition-colors",
        isActive
          ? "bg-sidebar-accent font-bold text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent text-sidebar-foreground"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <p className={cn("flex-1 truncate text-sm", isActive && "font-bold")}>
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


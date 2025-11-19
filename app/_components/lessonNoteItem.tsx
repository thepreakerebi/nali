"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LessonNoteItemProps {
  note: {
    _id: Id<"lessonNotes">;
    title: string;
  };
  onDelete: (id: Id<"lessonNotes">) => void;
}

export function LessonNoteItem({ note, onDelete }: LessonNoteItemProps) {
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


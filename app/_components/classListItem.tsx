"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Pencil, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ClassListItemProps {
  classItem: {
    _id: Id<"classes">;
    name: string;
    gradeLevel: string;
    academicYear: string;
  };
  onEdit: (id: Id<"classes">) => void;
  onDelete: (id: Id<"classes">) => void;
}

export function ClassListItem({ classItem, onEdit, onDelete }: ClassListItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <article
      className="group relative flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <section className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
        <p className="font-medium truncate">{classItem.name}</p>
        <p className="text-sm text-muted-foreground truncate">{classItem.gradeLevel}</p>
        <p className="text-sm text-muted-foreground truncate">{classItem.academicYear}</p>
      </section>
      {isHovered && (
        <nav className="flex items-center gap-1 shrink-0" aria-label="Class actions">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(classItem._id)}
            aria-label="Edit class"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(classItem._id)}
            aria-label="Delete class"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </article>
  );
}


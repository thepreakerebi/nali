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
      className="group relative rounded-lg border p-4 transition-colors hover:bg-slate-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <section className="space-y-3">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <section className="space-y-1">
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Class Name</dt>
            <dd className="text-sm font-medium text-foreground">{classItem.name}</dd>
          </section>
          <section className="space-y-1">
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Grade Level</dt>
            <dd className="text-sm text-foreground">{classItem.gradeLevel}</dd>
          </section>
          <section className="space-y-1">
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Academic Year</dt>
            <dd className="text-sm text-foreground">{classItem.academicYear}</dd>
          </section>
        </section>
      </section>
      {isHovered && (
        <nav 
          className="absolute top-2 right-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md p-1 shadow-sm border" 
          aria-label="Class actions"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(classItem._id)}
            aria-label="Edit class"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(classItem._id)}
            aria-label="Delete class"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
        </nav>
      )}
    </article>
  );
}


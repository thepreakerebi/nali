"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Pencil, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubjectListItemProps {
  subject: {
    _id: Id<"subjects">;
    classId: Id<"classes">;
    className: string;
    name: string;
    description?: string;
  };
  onEdit: (id: Id<"subjects">) => void;
  onDelete: (id: Id<"subjects">) => void;
}

export function SubjectListItem({ subject, onEdit, onDelete }: SubjectListItemProps) {
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
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subject Name</dt>
            <dd className="text-sm font-medium text-foreground">{subject.name}</dd>
          </section>
          <section className="space-y-1">
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Class</dt>
            <dd className="text-sm font-medium text-foreground">
              {subject.className && subject.className.trim() 
                ? subject.className 
                : (
                  <span className="text-muted-foreground italic">No class assigned</span>
                )}
            </dd>
          </section>
          <section className="space-y-1">
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</dt>
            <dd className="text-sm text-foreground line-clamp-2">
              {subject.description || (
                <span className="text-muted-foreground italic">No description yet, add one</span>
              )}
            </dd>
          </section>
        </section>
      </section>
      {isHovered && (
        <nav 
          className="absolute top-2 right-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md p-1 shadow-sm border" 
          aria-label="Subject actions"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(subject._id)}
            aria-label="Edit subject"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(subject._id)}
            aria-label="Delete subject"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
        </nav>
      )}
    </article>
  );
}


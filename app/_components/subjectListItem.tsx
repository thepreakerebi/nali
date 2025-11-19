"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Pencil, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubjectListItemProps {
  subject: {
    _id: Id<"subjects">;
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
      className="group relative flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <section className="flex-1 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subject Name</dt>
            <dd className="text-sm font-medium text-foreground">{subject.name}</dd>
          </div>
          {subject.description && (
            <div className="space-y-1 sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</dt>
              <dd className="text-sm text-foreground line-clamp-2">{subject.description}</dd>
            </div>
          )}
        </div>
      </section>
      {isHovered && (
        <nav className="flex items-center gap-1 shrink-0 mt-1" aria-label="Subject actions">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(subject._id)}
            aria-label="Edit subject"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(subject._id)}
            aria-label="Delete subject"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </article>
  );
}


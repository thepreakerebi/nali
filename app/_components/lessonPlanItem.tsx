"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Pencil, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LessonPlanItemProps {
  plan: {
    _id: Id<"lessonPlans">;
    title: string;
  };
  onEdit: (id: Id<"lessonPlans">) => void;
  onDelete: (id: Id<"lessonPlans">) => void;
}

export function LessonPlanItem({ plan, onEdit, onDelete }: LessonPlanItemProps) {
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


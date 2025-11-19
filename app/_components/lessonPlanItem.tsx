"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Pencil, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LessonPlanItemProps {
  plan: {
    _id: Id<"lessonPlans">;
    title: string;
  };
  isActive?: boolean;
  onEdit: (id: Id<"lessonPlans">) => void;
  onDelete: (id: Id<"lessonPlans">) => void;
}

export function LessonPlanItem({ plan, isActive = false, onEdit, onDelete }: LessonPlanItemProps) {
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


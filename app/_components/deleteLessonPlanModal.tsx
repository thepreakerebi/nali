"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DeleteLessonPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonPlanId: Id<"lessonPlans"> | null;
  lessonPlanTitle: string | null;
}

export function DeleteLessonPlanModal({
  open,
  onOpenChange,
  lessonPlanId,
  lessonPlanTitle,
}: DeleteLessonPlanModalProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteLessonPlan = useMutation(api.functions.lessonPlans.mutations.deleteLessonPlan);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setIsDeleting(false);
    }
  }, [open]);

  const handleDelete = async () => {
    if (!lessonPlanId) return;

    setIsDeleting(true);
    try {
      await deleteLessonPlan({ lessonPlanId });
      toast.success("Lesson plan deleted successfully");
      onOpenChange(false);
      router.push("/");
    } catch {
      toast.error("Failed to delete lesson plan. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete lesson plan</DialogTitle>
          <DialogDescription>
            If you delete this lesson plan ({lessonPlanTitle}), it will no longer be available for you and all lesson notes for that lesson plan would be deleted. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Lesson Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


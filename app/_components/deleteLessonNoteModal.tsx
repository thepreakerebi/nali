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

interface DeleteLessonNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonNoteId: Id<"lessonNotes"> | null;
  lessonNoteTitle: string | null;
}

export function DeleteLessonNoteModal({
  open,
  onOpenChange,
  lessonNoteId,
  lessonNoteTitle,
}: DeleteLessonNoteModalProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteLessonNote = useMutation(api.functions.lessonNotes.mutations.deleteLessonNote);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setIsDeleting(false);
    }
  }, [open]);

  const handleDelete = async () => {
    if (!lessonNoteId) return;

    setIsDeleting(true);
    try {
      await deleteLessonNote({ lessonNoteId });
      toast.success("Lesson note deleted successfully");
      onOpenChange(false);
      router.push("/");
    } catch {
      toast.error("Failed to delete lesson note. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete lesson note</DialogTitle>
          <DialogDescription>
            If you delete this lesson note ({lessonNoteTitle}), it will no longer be available for you. This action cannot be undone.
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
            {isDeleting ? "Deleting..." : "Delete Lesson Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


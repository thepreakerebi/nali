"use client";

import { useState } from "react";
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

interface DeleteClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: Id<"classes"> | null;
  className: string | null;
}

export function DeleteClassModal({ open, onOpenChange, classId, className }: DeleteClassModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteClass = useMutation(api.functions.classes.mutations.deleteClass);

  const handleDelete = async () => {
    if (!classId) return;

    setIsDeleting(true);
    try {
      await deleteClass({ classId });
      toast.success("Class deleted successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to delete class. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete class</DialogTitle>
          <DialogDescription>
            If you delete this class ({className}), it will no longer be available for you and all subjects, lesson plans, and notes for that class would be deleted. This action cannot be undone.
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
            {isDeleting ? "Deleting..." : "Delete Class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DeleteClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: Id<"classes"> | null;
  className: string | null;
}

export function DeleteClassModal({ open, onOpenChange, classId, className }: DeleteClassModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [copied, setCopied] = useState(false);
  const deleteClass = useMutation(api.functions.classes.mutations.deleteClass);

  // Reset confirmation text when modal opens/closes or className changes
  useEffect(() => {
    if (!open) {
      setConfirmationText("");
      setCopied(false);
    }
  }, [open, className]);

  const handleCopy = async () => {
    if (!className) return;
    try {
      await navigator.clipboard.writeText(className);
      setCopied(true);
      toast.success("Class name copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy class name");
    }
  };

  const isConfirmationValid = confirmationText.trim() === className;

  const handleDelete = async () => {
    if (!classId || !isConfirmationValid) return;

    setIsDeleting(true);
    try {
      await deleteClass({ classId });
      toast.success("Class deleted successfully");
      onOpenChange(false);
    } catch {
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
        <section className="space-y-2">
          <section className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Type</span>
            <code className="relative rounded bg-muted px-2 py-1 font-mono text-sm font-semibold">
              {className}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={handleCopy}
              aria-label="Copy class name"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
            <span>to delete class</span>
          </section>
          <Input
            type="text"
            placeholder="Enter class name to confirm"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            aria-label="Confirm class name"
            aria-invalid={confirmationText.length > 0 && !isConfirmationValid}
            className={confirmationText.length > 0 && !isConfirmationValid ? "border-destructive" : ""}
          />
          {confirmationText.length > 0 && !isConfirmationValid && (
            <p className="text-sm text-destructive">
              The entered name does not match the class name
            </p>
          )}
        </section>
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
            disabled={isDeleting || !isConfirmationValid}
          >
            {isDeleting ? "Deleting..." : "Delete Class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


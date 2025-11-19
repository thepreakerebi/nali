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

interface DeleteSubjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: Id<"subjects"> | null;
  subjectName: string | null;
}

export function DeleteSubjectModal({ open, onOpenChange, subjectId, subjectName }: DeleteSubjectModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [copied, setCopied] = useState(false);
  const deleteSubject = useMutation(api.functions.subjects.mutations.deleteSubject);

  // Reset confirmation text when modal opens/closes or subjectName changes
  useEffect(() => {
    if (!open) {
      setConfirmationText("");
      setCopied(false);
    }
  }, [open, subjectName]);

  const handleCopy = async () => {
    if (!subjectName) return;
    try {
      await navigator.clipboard.writeText(subjectName);
      setCopied(true);
      toast.success("Subject name copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy subject name");
    }
  };

  const isConfirmationValid = confirmationText.trim() === subjectName;

  const handleDelete = async () => {
    if (!subjectId || !isConfirmationValid) return;

    setIsDeleting(true);
    try {
      await deleteSubject({ subjectId });
      toast.success("Subject deleted successfully");
      onOpenChange(false);
    } catch {
      toast.error("Failed to delete subject. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete subject</DialogTitle>
          <DialogDescription>
            If you delete this subject ({subjectName}), it will no longer be available for you and all lesson plans and notes for that subject would be deleted. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <section className="space-y-2">
          <section className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Type</span>
            <code className="relative rounded bg-muted px-2 py-1 font-mono text-sm font-semibold">
              {subjectName}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={handleCopy}
              aria-label="Copy subject name"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
            <span>to delete subject</span>
          </section>
          <Input
            type="text"
            placeholder="Enter subject name to confirm"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            aria-label="Confirm subject name"
            aria-invalid={confirmationText.length > 0 && !isConfirmationValid}
            className={confirmationText.length > 0 && !isConfirmationValid ? "border-destructive" : ""}
          />
          {confirmationText.length > 0 && !isConfirmationValid && (
            <p className="text-sm text-destructive">
              The entered name does not match the subject name
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
            {isDeleting ? "Deleting..." : "Delete Subject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


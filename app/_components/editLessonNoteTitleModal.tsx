"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const lessonNoteTitleSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .min(2, "Title must be at least 2 characters"),
});

type LessonNoteTitleFormValues = z.infer<typeof lessonNoteTitleSchema>;

interface EditLessonNoteTitleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonNoteId: Id<"lessonNotes"> | null;
  initialTitle: string | null;
}

export function EditLessonNoteTitleModal({
  open,
  onOpenChange,
  lessonNoteId,
  initialTitle,
}: EditLessonNoteTitleModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateLessonNote = useMutation(api.functions.lessonNotes.mutations.updateLessonNote);

  const form = useForm<LessonNoteTitleFormValues>({
    resolver: zodResolver(lessonNoteTitleSchema),
    defaultValues: {
      title: "",
    },
  });

  // Pre-fill form when initialTitle changes
  useEffect(() => {
    if (initialTitle) {
      form.reset({
        title: initialTitle,
      });
    }
  }, [initialTitle, form]);

  const onSubmit = async (values: LessonNoteTitleFormValues) => {
    if (!lessonNoteId) return;

    setIsSubmitting(true);
    try {
      await updateLessonNote({
        lessonNoteId,
        title: values.title,
      });
      toast.success("Lesson note title updated successfully");
      form.reset();
      onOpenChange(false);
    } catch {
      toast.error("Failed to update lesson note title. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Lesson Note Title</DialogTitle>
          <DialogDescription>
            Update the lesson note title below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormDescription>
                    Enter a descriptive title for your lesson note
                  </FormDescription>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button variant="default-glass" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


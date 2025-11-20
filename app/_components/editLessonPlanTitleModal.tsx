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

const lessonPlanTitleSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .min(2, "Title must be at least 2 characters"),
});

type LessonPlanTitleFormValues = z.infer<typeof lessonPlanTitleSchema>;

interface EditLessonPlanTitleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonPlanId: Id<"lessonPlans"> | null;
  initialTitle: string | null;
}

export function EditLessonPlanTitleModal({
  open,
  onOpenChange,
  lessonPlanId,
  initialTitle,
}: EditLessonPlanTitleModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateLessonPlan = useMutation(api.functions.lessonPlans.mutations.updateLessonPlan);

  const form = useForm<LessonPlanTitleFormValues>({
    resolver: zodResolver(lessonPlanTitleSchema),
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

  const onSubmit = async (values: LessonPlanTitleFormValues) => {
    if (!lessonPlanId) return;

    setIsSubmitting(true);
    try {
      await updateLessonPlan({
        lessonPlanId,
        title: values.title,
      });
      toast.success("Lesson plan title updated successfully");
      form.reset();
      onOpenChange(false);
    } catch {
      toast.error("Failed to update lesson plan title. Please try again.");
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
          <DialogTitle>Edit Lesson Plan Title</DialogTitle>
          <DialogDescription>
            Update the lesson plan title below.
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
                    Enter a descriptive title for your lesson plan
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


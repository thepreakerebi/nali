"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
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
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { toast } from "sonner";

const lessonNoteSchema = z.object({
  lessonPlanId: z.string().min(1, "Lesson plan is required"),
  title: z
    .string()
    .min(1, "Title is required")
    .min(2, "Title must be at least 2 characters"),
});

type LessonNoteFormValues = z.infer<typeof lessonNoteSchema>;

interface CreateLessonNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLessonNoteModal({ open, onOpenChange }: CreateLessonNoteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const createLessonNote = useMutation(api.functions.lessonNotes.mutations.createLessonNote);
  const lessonPlans = useQuery(api.functions.lessonPlans.queries.listLessonPlans, {});

  const form = useForm<LessonNoteFormValues>({
    resolver: zodResolver(lessonNoteSchema),
    defaultValues: {
      lessonPlanId: "",
      title: "",
    },
  });

  const onSubmit = async (values: LessonNoteFormValues) => {
    setIsSubmitting(true);
    try {
      const lessonNoteId = await createLessonNote({
        lessonPlanId: values.lessonPlanId as Id<"lessonPlans">,
        title: values.title,
      });
      toast.success("Lesson note created successfully");
      form.reset();
      onOpenChange(false);
      // Navigate to the editor page
      router.push(`/lesson-notes/${lessonNoteId}`);
    } catch (error) {
      console.error("Error creating lesson note:", error);
      toast.error("Failed to create lesson note. Please try again.");
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
          <DialogTitle>Create Lesson Note</DialogTitle>
          <DialogDescription>
            Create a new lesson note by selecting a lesson plan and providing a title.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="lessonPlanId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lesson Plan</FormLabel>
                  <FormDescription>
                    Select the lesson plan for this note
                  </FormDescription>
                  <FormControl>
                    {lessonPlans === undefined ? (
                      <div className="text-sm text-muted-foreground">Loading lesson plans...</div>
                    ) : lessonPlans.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No lesson plans available. Please create a lesson plan first.</div>
                    ) : (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="space-y-2"
                      >
                        {lessonPlans.map((plan) => (
                          <div key={plan._id} className="flex items-center space-x-2">
                            <RadioGroupItem value={plan._id} id={`plan-${plan._id}`} />
                            <label
                              htmlFor={`plan-${plan._id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {plan.title}
                            </label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormDescription>
                    Enter a title for your lesson note (e.g., &quot;Class Notes - Introduction to Algebra&quot;)
                  </FormDescription>
                  <FormControl>
                    <Input {...field} placeholder="Lesson note title" />
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
                {isSubmitting ? "Creating..." : "Create Lesson Note"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


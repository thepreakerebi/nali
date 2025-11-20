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

const lessonPlanSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  subjectId: z.string().min(1, "Subject is required"),
  title: z
    .string()
    .min(1, "Title is required")
    .min(2, "Title must be at least 2 characters"),
});

type LessonPlanFormValues = z.infer<typeof lessonPlanSchema>;

interface CreateLessonPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLessonPlanModal({ open, onOpenChange }: CreateLessonPlanModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const createLessonPlan = useMutation(api.functions.lessonPlans.mutations.createLessonPlan);
  const classes = useQuery(api.functions.classes.queries.listClasses, {});
  const subjects = useQuery(api.functions.subjects.queries.listSubjects, {});

  const form = useForm<LessonPlanFormValues>({
    resolver: zodResolver(lessonPlanSchema),
    defaultValues: {
      classId: "",
      subjectId: "",
      title: "",
    },
  });

  // Filter subjects based on selected class
  const selectedClassId = form.watch("classId");
  const filteredSubjects = useMemo(() => {
    if (!subjects || !selectedClassId) return [];
    // Compare as strings since RadioGroup returns string values and classId is Id<"classes">
    const filtered = subjects.filter((subject) => {
      const subjectClassId = String(subject.classId);
      const selectedId = String(selectedClassId);
      return subjectClassId === selectedId;
    });
    return filtered;
  }, [subjects, selectedClassId]);

  // Reset subject when class changes
  const handleClassChange = (classId: string) => {
    form.setValue("classId", classId);
    form.setValue("subjectId", ""); // Reset subject when class changes
  };

  const onSubmit = async (values: LessonPlanFormValues) => {
    setIsSubmitting(true);
    try {
      const lessonPlanId = await createLessonPlan({
        classId: values.classId as Id<"classes">,
        subjectId: values.subjectId as Id<"subjects">,
        title: values.title,
      });
      toast.success("Lesson plan created successfully");
      form.reset();
      onOpenChange(false);
      // Navigate to the editor page
      router.push(`/lesson-plans/${lessonPlanId}`);
    } catch (error) {
      console.error("Error creating lesson plan:", error);
      toast.error("Failed to create lesson plan. Please try again.");
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
          <DialogTitle>Create Lesson Plan</DialogTitle>
          <DialogDescription>
            Create a new lesson plan by selecting a class and subject, then providing a title.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <FormDescription>
                    Select the class for this lesson plan
                  </FormDescription>
                  <FormControl>
                    {classes === undefined ? (
                      <div className="text-sm text-muted-foreground">Loading classes...</div>
                    ) : classes.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No classes available. Please create a class first.</div>
                    ) : (
                      <RadioGroup
                        value={field.value}
                        onValueChange={handleClassChange}
                        className="space-y-2"
                      >
                        {classes.map((classItem) => (
                          <div key={classItem._id} className="flex items-center space-x-2">
                            <RadioGroupItem value={classItem._id} id={`class-${classItem._id}`} />
                            <label
                              htmlFor={`class-${classItem._id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {classItem.name}
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
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormDescription>
                    Select the subject for this lesson plan
                  </FormDescription>
                  <FormControl>
                    {subjects === undefined ? (
                      <div className="text-sm text-muted-foreground">Loading subjects...</div>
                    ) : !selectedClassId ? (
                      <div className="text-sm text-muted-foreground">Please select a class first</div>
                    ) : filteredSubjects.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No subjects available for this class. Please create a subject first.</div>
                    ) : (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="space-y-2"
                      >
                        {filteredSubjects.map((subject) => (
                          <div key={subject._id} className="flex items-center space-x-2">
                            <RadioGroupItem value={subject._id} id={`subject-${subject._id}`} />
                            <label
                              htmlFor={`subject-${subject._id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {subject.name}
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
                    Enter a title for your lesson plan (e.g., &quot;Introduction to Algebra&quot;)
                  </FormDescription>
                  <FormControl>
                    <Input {...field} placeholder="Lesson plan title" />
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
                {isSubmitting ? "Creating..." : "Create Lesson Plan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


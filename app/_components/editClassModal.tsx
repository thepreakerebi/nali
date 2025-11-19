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

const classSchema = z.object({
  name: z
    .string()
    .min(1, "Class name is required")
    .min(2, "Class name must be at least 2 characters"),
  gradeLevel: z
    .string()
    .min(1, "Grade level is required")
    .min(2, "Grade level must be at least 2 characters"),
  academicYear: z
    .string()
    .min(1, "Academic year is required")
    .min(2, "Academic year must be at least 2 characters"),
});

type ClassFormValues = z.infer<typeof classSchema>;

interface EditClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: Id<"classes"> | null;
  initialData: {
    name: string;
    gradeLevel: string;
    academicYear: string;
  } | null;
}

export function EditClassModal({ open, onOpenChange, classId, initialData }: EditClassModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateClass = useMutation(api.functions.classes.mutations.updateClass);

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
      gradeLevel: "",
      academicYear: "",
    },
  });

  // Pre-fill form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        gradeLevel: initialData.gradeLevel,
        academicYear: initialData.academicYear,
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: ClassFormValues) => {
    if (!classId) return;

    setIsSubmitting(true);
    try {
      await updateClass({
        classId,
        name: values.name,
        gradeLevel: values.gradeLevel,
        academicYear: values.academicYear,
      });
      toast.success("Class updated successfully");
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update class. Please try again.");
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
          <DialogTitle>Edit Class</DialogTitle>
          <DialogDescription>
            Update the class details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Name</FormLabel>
                  <FormDescription>
                    Enter a descriptive name for your class (e.g., Grade 5A or Mathematics Class)
                  </FormDescription>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gradeLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade Level</FormLabel>
                  <FormDescription>
                    Specify the grade or level of the class (e.g., Grade 5 or Primary 3)
                  </FormDescription>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="academicYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Academic Year</FormLabel>
                  <FormDescription>
                    Enter the academic year for this class (e.g., 2024-2025 or 2024)
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


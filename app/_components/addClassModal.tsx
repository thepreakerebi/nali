"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
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

interface AddClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddClassModal({ open, onOpenChange, onSuccess }: AddClassModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createClass = useMutation(api.functions.classes.mutations.createClass);

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
      gradeLevel: "",
      academicYear: "",
    },
  });

  const onSubmit = async (values: ClassFormValues) => {
    setIsSubmitting(true);
    try {
      await createClass({
        name: values.name,
        gradeLevel: values.gradeLevel,
        academicYear: values.academicYear,
      });
      toast.success("Class created successfully");
      form.reset();
      onOpenChange(false);
      // Switch to classes tab after successful creation
      onSuccess?.();
    } catch {
      toast.error("Failed to create class. Please try again.");
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
          <DialogTitle>Add Class</DialogTitle>
          <DialogDescription>
            Add a class by filling in the details below.
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
                {isSubmitting ? "Adding..." : "Add Class"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


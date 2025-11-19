"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery } from "convex/react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const subjectSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  name: z
    .string()
    .min(1, "Subject name is required")
    .min(2, "Subject name must be at least 2 characters"),
  description: z.string().optional(),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

interface EditSubjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: Id<"subjects"> | null;
  initialData: {
    classId: Id<"classes">;
    name: string;
    description?: string;
  } | null;
}

export function EditSubjectModal({ open, onOpenChange, subjectId, initialData }: EditSubjectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateSubject = useMutation(api.functions.subjects.mutations.updateSubject);
  const classes = useQuery(api.functions.classes.queries.listClasses, {});

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      classId: "",
      name: "",
      description: "",
    },
  });

  // Pre-fill form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        classId: initialData.classId,
        name: initialData.name,
        description: initialData.description || "",
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: SubjectFormValues) => {
    if (!subjectId) return;

    setIsSubmitting(true);
    try {
      await updateSubject({
        subjectId,
        classId: values.classId as Id<"classes">,
        name: values.name,
        description: values.description || undefined,
      });
      toast.success("Subject updated successfully");
      form.reset();
      onOpenChange(false);
    } catch {
      toast.error("Failed to update subject. Please try again.");
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
          <DialogTitle>Edit Subject</DialogTitle>
          <DialogDescription>
            Update the subject details below.
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
                    Select the class this subject belongs to
                  </FormDescription>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a class..." />
                      </SelectTrigger>
                      <SelectContent>
                        {classes === undefined ? (
                          <SelectItem value="loading" disabled>Loading classes...</SelectItem>
                        ) : classes.length === 0 ? (
                          <SelectItem value="empty" disabled>No classes available</SelectItem>
                        ) : (
                          classes.map((classItem) => (
                            <SelectItem key={classItem._id} value={classItem._id}>
                              {classItem.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Name</FormLabel>
                  <FormDescription>
                    Enter the name of the subject (e.g., Mathematics, Science, English)
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormDescription>
                    Optionally provide a description for this subject
                  </FormDescription>
                  <FormControl>
                    <Textarea
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
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


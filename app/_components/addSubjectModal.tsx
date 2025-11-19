"use client";

import { useState } from "react";
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
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
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

interface AddSubjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddSubjectModal({ open, onOpenChange, onSuccess }: AddSubjectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createSubject = useMutation(api.functions.subjects.mutations.createSubject);
  const classes = useQuery(api.functions.classes.queries.listClasses, {});

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      classId: "",
      name: "",
      description: "",
    },
  });

  const onSubmit = async (values: SubjectFormValues) => {
    setIsSubmitting(true);
    try {
      await createSubject({
        classId: values.classId as Id<"classes">,
        name: values.name,
        description: values.description || undefined,
      });
      toast.success("Subject created successfully");
      form.reset();
      onOpenChange(false);
      // Switch to subjects tab after successful creation
      onSuccess?.();
    } catch {
      toast.error("Failed to create subject. Please try again.");
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
          <DialogTitle>Add Subject</DialogTitle>
          <DialogDescription>
            Add a subject by filling in the details below.
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
                    {classes === undefined ? (
                      <div className="text-sm text-muted-foreground">Loading classes...</div>
                    ) : classes.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No classes available. Please create a class first.</div>
                    ) : (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
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
                {isSubmitting ? "Adding..." : "Add Subject"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/context/auth-context";

const schema = z.object({
  task_type: z.enum(["call", "email", "meeting", "whatsapp"]),
  due_date: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
  assigned_to: z.string().min(1, "Assigned to is required"),
  assigned_to_name: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface FollowUpTaskFormProps {
  renewalId: string;
  onCreated?: () => void;
}

export function FollowUpTaskForm({ renewalId, onCreated }: FollowUpTaskFormProps) {
  const { session, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      task_type: "call",
      assigned_to: user?.uid ?? "",
      assigned_to_name: user?.name ?? "",
    },
  });

  const taskType = watch("task_type");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`/api/renewals/${renewalId}/follow-up`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to create task");

      toast.success("Follow-up task created");
      reset();
      setOpen(false);
      onCreated?.();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="w-3.5 h-3.5" /> Add Follow-up
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wider">
            Create Follow-up Task
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Task Type *</Label>
            <Select
              value={taskType}
              onValueChange={(v) => setValue("task_type", v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="due_date">Due Date *</Label>
            <Input
              id="due_date"
              type="datetime-local"
              {...register("due_date")}
            />
            {errors.due_date && (
              <p className="text-xs text-red-400">{errors.due_date.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Task notes..."
              rows={2}
              {...register("notes")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assigned_to_name">Assigned To</Label>
            <Input
              id="assigned_to_name"
              placeholder="Assignee name"
              {...register("assigned_to_name")}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

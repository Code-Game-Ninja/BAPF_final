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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/context/auth-context";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum([
    "license_renewal", "regulatory_filing", "audit_submission",
    "training_certification", "policy_review", "other",
  ]),
  description: z.string().optional(),
  due_date: z.string().min(1, "Due date is required"),
  assigned_to_name: z.string().optional(),
  recurrence: z.enum(["one_time", "monthly", "quarterly", "half_yearly", "annual"]),
});

type FormData = z.infer<typeof schema>;

interface ComplianceItemFormProps {
  onCreated?: () => void;
  editData?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ComplianceItemForm({
  onCreated,
  editData,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ComplianceItemFormProps) {
  const { session } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

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
      category: editData?.category ?? "regulatory_filing",
      recurrence: editData?.recurrence ?? "one_time",
      title: editData?.title ?? "",
      description: editData?.description ?? "",
      due_date: editData?.due_date ?? "",
      assigned_to_name: editData?.assigned_to_name ?? "",
    },
  });

  const category = watch("category");
  const recurrence = watch("recurrence");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const url = editData ? `/api/compliance/${editData.id}` : "/api/compliance";
      const method = editData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to save");

      toast.success(editData ? "Compliance item updated" : "Compliance item created");
      reset();
      setOpen(false);
      onCreated?.();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const trigger = !isControlled ? (
    <DialogTrigger asChild>
      <Button size="sm" className="gap-2">
        <Plus className="w-3.5 h-3.5" /> Add Item
      </Button>
    </DialogTrigger>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wider">
            {editData ? "Edit Compliance Item" : "New Compliance Item"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" placeholder="e.g., IRDA License Renewal" {...register("title")} />
            {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={category} onValueChange={(v) => setValue("category", v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="license_renewal">License Renewal</SelectItem>
                  <SelectItem value="regulatory_filing">Regulatory Filing</SelectItem>
                  <SelectItem value="audit_submission">Audit Submission</SelectItem>
                  <SelectItem value="training_certification">Training/Certification</SelectItem>
                  <SelectItem value="policy_review">Policy Review</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Recurrence</Label>
              <Select value={recurrence} onValueChange={(v) => setValue("recurrence", v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One Time</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="half_yearly">Half Yearly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="due_date">Due Date *</Label>
            <Input id="due_date" type="date" {...register("due_date")} />
            {errors.due_date && <p className="text-xs text-red-400">{errors.due_date.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assigned_to_name">Assigned To</Label>
            <Input
              id="assigned_to_name"
              placeholder="Assignee name"
              {...register("assigned_to_name")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the compliance requirement..."
              rows={3}
              {...register("description")}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editData ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

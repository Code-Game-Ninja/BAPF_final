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
import { useAuth } from "@/lib/context/auth-context";

const schema = z.object({
  insurer_name: z.string().min(1, "Insurer name is required"),
  premium_amount: z.string().min(1, "Premium is required"),
  sum_insured: z.string().min(1, "Sum insured is required"),
  coverage_details: z.string().optional(),
  terms: z.string().optional(),
  validity_date: z.string().min(1, "Validity date is required"),
  is_recommended: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface QuoteEntryFormProps {
  quoteRequestId: string;
  onCreated?: () => void;
}

export function QuoteEntryForm({ quoteRequestId, onCreated }: QuoteEntryFormProps) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`/api/quotes/${quoteRequestId}/quotes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          premium_amount: parseFloat(data.premium_amount),
          sum_insured: parseFloat(data.sum_insured),
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to add quote");

      toast.success(`Quote from ${data.insurer_name} added`);
      reset();
      setOpen(false);
      onCreated?.();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add quote");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-3.5 h-3.5" /> Add Quote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wider">
            Add Quote
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="insurer_name">Insurer Name *</Label>
              <Input id="insurer_name" placeholder="e.g., HDFC Ergo" {...register("insurer_name")} />
              {errors.insurer_name && (
                <p className="text-xs text-red-400">{errors.insurer_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="premium_amount">Premium Amount (₹) *</Label>
              <Input
                id="premium_amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("premium_amount")}
              />
              {errors.premium_amount && (
                <p className="text-xs text-red-400">{errors.premium_amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sum_insured">Sum Insured (₹) *</Label>
              <Input
                id="sum_insured"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("sum_insured")}
              />
              {errors.sum_insured && (
                <p className="text-xs text-red-400">{errors.sum_insured.message}</p>
              )}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="validity_date">Valid Until *</Label>
              <Input id="validity_date" type="date" {...register("validity_date")} />
              {errors.validity_date && (
                <p className="text-xs text-red-400">{errors.validity_date.message}</p>
              )}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="coverage_details">Coverage Details</Label>
              <Textarea
                id="coverage_details"
                placeholder="Key coverage highlights..."
                rows={2}
                {...register("coverage_details")}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                placeholder="Special terms, exclusions..."
                rows={2}
                {...register("terms")}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Add Quote
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

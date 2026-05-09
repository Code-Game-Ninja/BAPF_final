"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { pageTransition } from "@/lib/helpers/animations";
import { useAuth } from "@/lib/context/auth-context";

const POLICY_TYPES = [
  "motor", "health", "life", "fire", "marine", "burglary",
  "liability", "workmen_compensation", "travel", "other",
];

const INSURERS = [
  "HDFC Ergo", "ICICI Lombard", "Bajaj Allianz", "New India Assurance",
  "Oriental Insurance", "United India Insurance", "National Insurance",
  "Star Health", "Niva Bupa", "Care Health", "Tata AIG", "Reliance General",
  "SBI General", "Kotak Mahindra General", "Future Generali",
];

const schema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  policy_type: z.string().min(1, "Policy type is required"),
  coverage_requirements: z.string().optional(),
  notes: z.string().optional(),
  assigned_to: z.string().min(1, "Assigned to is required"),
});

type FormData = z.infer<typeof schema>;

export default function NewQuoteRequestPage() {
  const router = useRouter();
  const { session, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [targetInsurers, setTargetInsurers] = useState<string[]>([]);
  const [customInsurer, setCustomInsurer] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      assigned_to: user?.uid ?? "",
    },
  });

  const policyType = watch("policy_type");

  const addInsurer = (insurer: string) => {
    if (insurer && !targetInsurers.includes(insurer)) {
      setTargetInsurers((prev) => [...prev, insurer]);
    }
  };

  const removeInsurer = (insurer: string) => {
    setTargetInsurers((prev) => prev.filter((i) => i !== insurer));
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, target_insurers: targetInsurers }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to create quote request");

      toast.success(`Quote request ${result.quote_request_number} created`);
      router.push(`/dashboard/quotes/${result.id}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create quote request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...pageTransition} className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <h1 className="text-xl font-heading font-bold uppercase tracking-wider">
          New Quote Request
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-heading font-bold uppercase tracking-wider">
            Request Details
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="customer_id">Customer ID *</Label>
            <Input
              id="customer_id"
              placeholder="Enter customer UUID"
              {...register("customer_id")}
            />
            {errors.customer_id && (
              <p className="text-xs text-red-400">{errors.customer_id.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Paste the customer UUID from the customer list.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Policy Type *</Label>
            <Select value={policyType} onValueChange={(v) => setValue("policy_type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select policy type" />
              </SelectTrigger>
              <SelectContent>
                {POLICY_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.policy_type && (
              <p className="text-xs text-red-400">{errors.policy_type.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coverage_requirements">Coverage Requirements</Label>
            <Textarea
              id="coverage_requirements"
              placeholder="Describe coverage requirements, sum insured range, special needs..."
              rows={3}
              {...register("coverage_requirements")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              rows={2}
              {...register("notes")}
            />
          </div>
        </div>

        {/* Target Insurers */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-heading font-bold uppercase tracking-wider">
            Target Insurers
          </h2>

          <div className="flex flex-wrap gap-2">
            {INSURERS.map((ins) => (
              <button
                key={ins}
                type="button"
                onClick={() =>
                  targetInsurers.includes(ins) ? removeInsurer(ins) : addInsurer(ins)
                }
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  targetInsurers.includes(ins)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {ins}
              </button>
            ))}
          </div>

          {/* Custom insurer */}
          <div className="flex gap-2">
            <Input
              placeholder="Add custom insurer..."
              value={customInsurer}
              onChange={(e) => setCustomInsurer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addInsurer(customInsurer);
                  setCustomInsurer("");
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                addInsurer(customInsurer);
                setCustomInsurer("");
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {targetInsurers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {targetInsurers.map((ins) => (
                <Badge key={ins} variant="outline" className="gap-1 text-xs">
                  {ins}
                  <button onClick={() => removeInsurer(ins)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Create Quote Request
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

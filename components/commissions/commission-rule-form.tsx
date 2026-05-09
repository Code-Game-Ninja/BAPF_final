"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { commissionRuleService } from "@/lib/services/commission.service";
import { auditLogService } from "@/lib/services/audit-log.service";

import { useAuth } from "@/lib/context/auth-context";
import { useAppSettings } from "@/lib/context/app-settings-context";
import { invalidateCommissions } from "@/lib/hooks/use-commissions";
import {
  commissionRuleSchema,
  CommissionRuleFormData,
  COMMISSION_TYPES,
} from "@/lib/validations/commission";
import { parsePolicyTypes } from "@/lib/validations/policy";
import type { CommissionRule, PolicyType } from "@/lib/types";

interface RuleFormDialogProps {
  rule?: CommissionRule; // Edit mode if provided
  onSaved?: () => void;
}

export function CommissionRuleFormDialog({
  rule,
  onSaved,
}: RuleFormDialogProps) {
  const { user } = useAuth();
  const { settings } = useAppSettings();
  const policyTypes = parsePolicyTypes(settings.policy_types);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const isEdit = !!rule;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CommissionRuleFormData>({
    resolver: zodResolver(commissionRuleSchema),
    defaultValues: rule
      ? {
          policy_type: rule.policy_type,
          commission_type: rule.commission_type,
          value: rule.value,
          min_premium: rule.min_premium,
          max_premium: rule.max_premium,
          insurer_name: rule.insurer_name || "",
        }
      : {
          commission_type: "percentage",
        },
  });

  const commissionType = watch("commission_type");

  const onSubmit = async (data: CommissionRuleFormData) => {
    setSaving(true);
    try {
      if (isEdit) {
        await commissionRuleService.update(rule.id, {
          ...data,
          isActive: true,
        } as Partial<CommissionRule>);

        // Recalculate all pending commissions linked to this rule
        const recalcResult = await commissionRuleService.recalculatePendingByRule(rule.id);
        if (recalcResult.updated > 0) {
          toast.success(`Rule updated — ${recalcResult.updated} pending commission(s) recalculated`);
        } else {
          toast.success("Rule updated");
        }
      } else {
        await commissionRuleService.createRule({
          policy_type: data.policy_type as PolicyType,
          commission_type: data.commission_type as "percentage" | "flat",
          value: data.value,
          min_premium: data.min_premium,
          max_premium: data.max_premium,
          insurer_name: data.insurer_name || undefined,
        });
        toast.success("Rule created");
      }
      invalidateCommissions();
      if (user) {
        auditLogService.logAction(
          user.uid, user.name || "", isEdit ? "update" : "create", "commissions",
          `${isEdit ? "Updated" : "Created"} commission rule (${data.policy_type}, ${data.commission_type}: ${data.value})`
        ).catch(() => {});
      }
      setOpen(false);
      reset();
      onSaved?.();
    } catch {
      toast.error(isEdit ? "Failed to update rule" : "Failed to create rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs border-secondary text-foreground"
          >
            Edit
          </Button>
        ) : (
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-secondary max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEdit ? "Edit Commission Rule" : "New Commission Rule"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Policy Type */}
          <div className="space-y-2">
            <Label className="text-foreground">Policy Type</Label>
            <Select
              defaultValue={rule?.policy_type}
              onValueChange={(v) =>
                setValue("policy_type", v as PolicyType, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className="bg-background border-secondary text-foreground">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-secondary">
                {policyTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.policy_type && (
              <p className="text-xs text-red-400">
                {errors.policy_type.message}
              </p>
            )}
          </div>

          {/* Commission Type */}
          <div className="space-y-2">
            <Label className="text-foreground">Commission Type</Label>
            <Select
              defaultValue={rule?.commission_type || "percentage"}
              onValueChange={(v) =>
                setValue("commission_type", v as "percentage" | "flat", {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className="bg-background border-secondary text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-secondary">
                {COMMISSION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label className="text-foreground">
              {commissionType === "percentage" ? "Percentage (%)" : "Amount (₹)"}
            </Label>
            <Input
              type="number"
              step="0.01"
              {...register("value", { valueAsNumber: true })}
              placeholder={
                commissionType === "percentage" ? "e.g., 10" : "e.g., 5000"
              }
              className="bg-background border-secondary text-foreground"
            />
            {errors.value && (
              <p className="text-xs text-red-400">{errors.value.message}</p>
            )}
          </div>

          {/* Premium Tier */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-foreground">Min Premium (₹)</Label>
              <Input
                type="number"
                {...register("min_premium", { valueAsNumber: true })}
                placeholder="Optional"
                className="bg-background border-secondary text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Max Premium (₹)</Label>
              <Input
                type="number"
                {...register("max_premium", { valueAsNumber: true })}
                placeholder="Optional"
                className="bg-background border-secondary text-foreground"
              />
            </div>
          </div>

          {/* Insurer */}
          <div className="space-y-2">
            <Label className="text-foreground">Insurer (optional)</Label>
            <Input
              {...register("insurer_name")}
              placeholder="e.g., Bajaj Allianz"
              className="bg-background border-secondary text-foreground"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-secondary text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { updateLead, checkDuplicateLead } from "@/lib/services/lead.service";
import { auditLogService } from "@/lib/services/audit-log.service";
import { useAuth } from "@/lib/context/auth-context";
import { getAccessToken } from "@/lib/services/auth.service";
import { invalidateLeads } from "@/lib/hooks/use-leads";
import { useActiveUsers } from "@/lib/hooks/use-settings";
import { friendlyError } from "@/lib/helpers/friendly-error";
import {
  leadSchema,
  LeadFormData,
  LEAD_SOURCE_OPTIONS,
  LEAD_PRIORITY_OPTIONS,
  LEAD_STATUS_OPTIONS,
  CLIENT_TYPE_OPTIONS,
} from "@/lib/validations/lead";
import { SalesLead } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface LeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: SalesLead | null;
  onSuccess?: (lead: SalesLead) => void;
}

export function LeadForm({ open, onOpenChange, editData, onSuccess }: LeadFormProps) {
  const { user } = useAuth();
  const { data: users } = useActiveUsers();
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const isEdit = !!editData;

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      customer_name: "",
      mobile: "",
      alt_mobile: "",
      email: "",
      source: "other",
      assigned_to: "",
      priority: "medium",
      status: "new",
      notes: "",
      follow_up_date: "",
      meeting_date: "",
      poc_name: "",
      location: "",
      client_type: "individual",
      estimated_value: 0,
    },
  });

  // Re-initialize form when editData changes
  useEffect(() => {
    if (open) {
      form.reset({
        customer_name: editData?.customer_name || "",
        mobile: editData?.mobile || "",
        alt_mobile: editData?.alt_mobile || "",
        email: editData?.email || "",
        source: editData?.source || "other",
        assigned_to: editData?.assigned_to || "",
        priority: editData?.priority || "medium",
        status: editData?.status || "new",
        notes: editData?.notes || "",
        follow_up_date: editData?.follow_up_date || "",
        meeting_date: editData?.meeting_date || "",
        poc_name: editData?.poc_name || "",
        location: editData?.location || "",
        client_type: editData?.client_type || "individual",
        estimated_value: editData?.estimated_value || 0,
      });
      setDuplicateWarning(null);
    }
  }, [editData, open, form]);

  // Duplicate check on mobile blur
  const handleMobileBlur = async () => {
    const mobile = form.getValues("mobile");
    if (!mobile || mobile.length !== 10 || isEdit) return;
    try {
      const duplicates = await checkDuplicateLead(mobile);
      if (duplicates.length > 0) {
        setDuplicateWarning(
          `Possible duplicate: ${duplicates.map((d) => `${d.lead_number} (${d.customer_name})`).join(", ")}`
        );
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // non-critical
    }
  };

  const onSubmit = async (data: LeadFormData) => {
    if (!user) return;
    setSaving(true);

    try {
      const assignedUser = users?.find((u) => u.id === data.assigned_to);

      if (isEdit && editData) {
        await updateLead(editData.id, {
          customer_name: data.customer_name,
          mobile: data.mobile,
          alt_mobile: data.alt_mobile || null,
          email: data.email || null,
          source: data.source,
          assigned_to: data.assigned_to,
          assigned_to_name: assignedUser?.name || editData.assigned_to_name,
          priority: data.priority,
          status: data.status || editData.status,
          notes: data.notes || null,
          follow_up_date: data.follow_up_date || null,
          meeting_date: data.meeting_date || null,
          poc_name: data.poc_name || null,
          location: data.location || null,
          client_type: data.client_type || editData.client_type,
          estimated_value: data.estimated_value || 0,
        });
        await auditLogService.logAction(
          user.id,
          user.name,
          "update",
          "sales-leads",
          `Updated lead: ${editData.lead_number} — ${data.customer_name}`
        );
        toast.success("Lead updated successfully");
        invalidateLeads();
        onOpenChange(false);
        onSuccess?.(editData);
      } else {
        // Create via API route (handles notifications, audit, RLS bypass)
        const token = await getAccessToken();
        if (!token) throw new Error("Not authenticated");

        const apiRes = await fetch("/api/leads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            customer_name: data.customer_name,
            mobile: data.mobile,
            alt_mobile: data.alt_mobile || undefined,
            email: data.email || undefined,
            source: data.source,
            assigned_to: data.assigned_to,
            assigned_to_name: assignedUser?.name,
            priority: data.priority,
            status: data.status,
            notes: data.notes || undefined,
            follow_up_date: data.follow_up_date || undefined,
            meeting_date: data.meeting_date || undefined,
            poc_name: data.poc_name || undefined,
            location: data.location || undefined,
            client_type: data.client_type || undefined,
            estimated_value: data.estimated_value || undefined,
            branch_id: user.branch_id,
          }),
        });

        if (!apiRes.ok) {
          const errBody = await apiRes.json().catch(() => null);
          throw new Error(errBody?.error || "Failed to create lead");
        }

        const result = await apiRes.json();
        toast.success(`Lead created — ${result.lead_number}`);
        invalidateLeads();
        onOpenChange(false);
        onSuccess?.(result);
      }
    } catch (error: unknown) {
      toast.error(friendlyError(error, "Failed to save lead"));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setDuplicateWarning(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-cabin uppercase tracking-wider">
            {isEdit ? "Edit Lead" : "Add New Lead"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit
              ? `Editing ${editData?.lead_number} — ${editData?.customer_name}`
              : "Fill in the lead details. Lead number will be auto-generated."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Customer Name */}
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mobile + Alt Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="10-digit number"
                        {...field}
                        onBlur={() => {
                          field.onBlur();
                          handleMobileBlur();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="alt_mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alt Mobile</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Duplicate Warning */}
            {duplicateWarning && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-500">
                {duplicateWarning}
              </div>
            )}

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="email@example.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* POC Name + Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="poc_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>POC Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Point of contact" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="City / Area" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Client Type + Estimated Value */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="client_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CLIENT_TYPE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimated_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Value</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Source + Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LEAD_SOURCE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LEAD_PRIORITY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Assigned To */}
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(users ?? []).map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status (edit mode only) + Follow-Up Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isEdit && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LEAD_STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="follow_up_date"
                render={({ field }) => (
                  <FormItem className={isEdit ? "" : "col-span-2"}>
                    <FormLabel>Follow-Up Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Meeting Date */}
            <FormField
              control={form.control}
              name="meeting_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Meeting</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any initial observations..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isEdit ? (
                  <Save className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {saving ? "Saving..." : isEdit ? "Update Lead" : "Create Lead"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

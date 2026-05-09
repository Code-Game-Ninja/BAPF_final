"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Ticket, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/context/auth-context";
import { useCustomerSearch } from "@/lib/hooks/use-customers";
import { usePoliciesByCustomer } from "@/lib/hooks/use-policies";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { value: "ecard_request",      label: "E-Card Request" },
  { value: "member_endorsement", label: "Member Endorsement" },
  { value: "name_correction",    label: "Name Correction" },
  { value: "address_correction", label: "Address Correction" },
  { value: "invoice_dispute",    label: "Invoice Dispute" },
  { value: "claim_assistance",   label: "Claim Assistance" },
  { value: "general_query",      label: "General Query" },
];

const PRIORITIES = [
  { value: "low",    label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High" },
  { value: "urgent", label: "Urgent" },
];

const schema = z.object({
  category:       z.string().min(1, "Category is required"),
  priority:       z.string().min(1, "Priority is required"),
  description:    z.string().min(5, "Description must be at least 5 characters"),
  internal_notes: z.string().optional(),
});

type FormData = {
  category: string;
  priority: string;
  description: string;
  internal_notes?: string;
};

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillCustomerId?: string;
  prefillCustomerName?: string;
  prefillPolicyId?: string;
  prefillPolicyNumber?: string;
}

export function CreateTicketDialog({
  open,
  onOpenChange,
  prefillCustomerId,
  prefillCustomerName,
  prefillPolicyId,
  prefillPolicyNumber,
}: CreateTicketDialogProps) {
  const router = useRouter();
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ ticket_number: string; id: string; sla_hours: number } | null>(null);

  // Customer search (only needed when no prefill)
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(prefillCustomerId || "");
  const [selectedPolicyId, setSelectedPolicyId] = useState(prefillPolicyId || "");

  const { data: searchResults } = useCustomerSearch(
    !prefillCustomerId && customerSearch.length >= 2 ? customerSearch : ""
  );
  const { data: policies } = usePoliciesByCustomer(
    !prefillPolicyId && selectedCustomerId ? selectedCustomerId : null
  );

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: "", priority: "medium", description: "", internal_notes: "" },
  });

  const onSubmit = async (data: FormData) => {
    const custId = prefillCustomerId || selectedCustomerId;
    if (!custId) {
      toast.error("Please select a customer");
      return;
    }

    setSaving(true);
    try {
      const token = session?.access_token;
      const res = await fetch("/api/service-desk/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customer_id: custId,
          policy_id: prefillPolicyId || selectedPolicyId || null,
          category: data.category,
          priority: data.priority,
          description: data.description,
          internal_notes: data.internal_notes || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create ticket");
      }

      const ticket = await res.json();
      setCreated(ticket);
      toast.success(`Ticket ${ticket.ticket_number} created`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create ticket");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setCreated(null);
    setCustomerSearch("");
    setSelectedCustomerId(prefillCustomerId || "");
    setSelectedPolicyId(prefillPolicyId || "");
    onOpenChange(false);
  };

  const handleViewTicket = () => {
    if (created) {
      router.push(`/dashboard/service-desk/${created.id}`);
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wider flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            Create Service Ticket
          </DialogTitle>
          <DialogDescription>
            {prefillCustomerName
              ? `Creating ticket for ${prefillCustomerName}${prefillPolicyNumber ? ` · Policy ${prefillPolicyNumber}` : ""}`
              : "Log a new service request"}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          // Success state
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <p className="font-heading font-bold text-lg uppercase tracking-wider">Ticket Created</p>
              <Badge variant="secondary" className="font-mono text-primary bg-primary/10 mt-2 text-base px-4 py-1">
                {created.ticket_number}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                SLA: {created.sla_hours}h from creation
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={handleClose}>Close</Button>
              <Button onClick={handleViewTicket}>View Ticket</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            {/* Customer selection (only if no prefill) */}
            {!prefillCustomerId && (
              <div className="space-y-1.5">
                <Label>Customer <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Search customer by name or phone..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                />
                {searchResults && searchResults.length > 0 && !selectedCustomerId && (
                  <div className="border border-border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    {searchResults.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setCustomerSearch(c.name);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex items-center gap-2"
                      >
                        <Badge variant="secondary" className="font-mono text-xs">{c.uid}</Badge>
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Policy selection (only if no prefill and customer selected) */}
            {!prefillPolicyId && selectedCustomerId && (
              <div className="space-y-1.5">
                <Label>Policy (optional)</Label>
                <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select policy (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No policy</SelectItem>
                    {(policies ?? []).map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.policy_number} · {p.policy_type?.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category <span className="text-destructive">*</span></Label>
              <Select
                value={form.watch("category")}
                onValueChange={v => form.setValue("category", v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.category && (
                <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={v => form.setValue("priority", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Describe the issue or request..."
                rows={3}
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>

            {/* Internal notes */}
            <div className="space-y-1.5">
              <Label>Internal Notes <span className="text-xs text-muted-foreground">(staff only)</span></Label>
              <Textarea
                placeholder="Notes visible only to staff..."
                rows={2}
                {...form.register("internal_notes")}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Creating..." : "Create Ticket"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

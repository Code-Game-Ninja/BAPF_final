"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import { Loader2, Search, X, Paperclip } from "lucide-react";

import { useAuth } from "@/lib/context/auth-context";
import { supabase } from "@/lib/supabase/client";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { value: "ecard_request", label: "E-Card Request" },
  { value: "member_endorsement", label: "Member Endorsement" },
  { value: "name_correction", label: "Name Correction" },
  { value: "address_correction", label: "Address Correction" },
  { value: "invoice_dispute", label: "Invoice Dispute" },
  { value: "claim_assistance", label: "Claim Assistance" },
  { value: "general_query", label: "General Query" },
  { value: "validity_renewal", label: "Validity Renewal" },
  { value: "vehicle_endorsement", label: "Vehicle Endorsement" },
  { value: "policy_query", label: "Policy Query" },
  { value: "document_request", label: "Document Request" },
];

const PRIORITIES = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const schema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  policy_id: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  priority: z.string().min(1, "Priority is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  internal_notes: z.string().optional(),
  template_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateTicketFormProps {
  prefillCustomerId?: string;
  prefillCustomerName?: string;
  prefillPolicyId?: string;
  prefillPolicyNumber?: string;
  onSuccess?: (ticketId: string, ticketNumber: string, slaDeadline: string) => void;
  onCancel?: () => void;
}

export function CreateTicketForm({
  prefillCustomerId,
  prefillCustomerName,
  prefillPolicyId,
  prefillPolicyNumber,
  onSuccess,
  onCancel,
}: CreateTicketFormProps) {
  const { session } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerSearch, setCustomerSearch] = useState(prefillCustomerName ?? "");
  const [customerResults, setCustomerResults] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(
    prefillCustomerId ? { id: prefillCustomerId, name: prefillCustomerName ?? "" } : null
  );
  const [policies, setPolicies] = useState<Array<{ id: string; policy_number: string; policy_type: string }>>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; category: string; priority: string; description_template: string }>>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_id: prefillCustomerId ?? "",
      policy_id: prefillPolicyId ?? "",
      category: "",
      priority: "medium",
      description: "",
      internal_notes: "",
      template_id: "",
    },
  });

  // Search customers
  useEffect(() => {
    if (prefillCustomerId) return;
    if (!customerSearch.trim() || customerSearch.length < 2) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, name, phone")
        .ilike("name", `%${customerSearch}%`)
        .limit(10);
      setCustomerResults(data ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, prefillCustomerId]);

  // Fetch policies when customer selected
  useEffect(() => {
    if (!selectedCustomer) {
      setPolicies([]);
      return;
    }
    supabase
      .from("policies")
      .select("id, policy_number, policy_type")
      .eq("customer_id", selectedCustomer.id)
      .eq("status", "active")
      .then(({ data }) => setPolicies(data ?? []));
  }, [selectedCustomer]);

  // Fetch templates
  useEffect(() => {
    supabase
      .from("ticket_templates")
      .select("id, name, category, priority, description_template")
      .eq("is_active", true)
      .then(({ data }) => setTemplates(data ?? []));
  }, []);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    form.setValue("template_id", templateId);
    form.setValue("category", template.category);
    form.setValue("priority", template.priority);
    if (template.description_template) {
      form.setValue("description", template.description_template);
    }
  };

  const handleCustomerSelect = (customer: { id: string; name: string }) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setCustomerResults([]);
    form.setValue("customer_id", customer.id);
    form.setValue("policy_id", "");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: FormValues) => {
    if (!session?.access_token) {
      toast.error("Not authenticated");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/service-desk/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create ticket");

      // Upload attachments
      if (attachments.length > 0) {
        for (const file of attachments) {
          const formData = new FormData();
          formData.append("file", file);
          await fetch(`/api/service-desk/tickets/${data.id}/documents`, {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: formData,
          });
        }
      }

      toast.success(`Ticket ${data.ticket_number} created successfully`);
      onSuccess?.(data.id, data.ticket_number, data.sla_deadline);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Template selector */}
        {templates.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Template (optional)
            </Label>
            <Select onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Customer search */}
        {!prefillCustomerId ? (
          <FormField
            control={form.control}
            name="customer_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer *</FormLabel>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customer by name..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    className="pl-9"
                  />
                  {customerResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                      {customerResults.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleCustomerSelect(c)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/30 text-left text-sm"
                        >
                          <div>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.phone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border">
              <span className="text-sm font-medium">{prefillCustomerName}</span>
              <Badge variant="secondary" className="text-xs">Pre-filled</Badge>
            </div>
          </div>
        )}

        {/* Policy selector */}
        {!prefillPolicyId && selectedCustomer && policies.length > 0 && (
          <FormField
            control={form.control}
            name="policy_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Policy (optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a policy..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {policies.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.policy_number} ({p.policy_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {prefillPolicyId && (
          <div className="space-y-1.5">
            <Label>Policy</Label>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border">
              <span className="text-sm font-medium">{prefillPolicyNumber}</span>
              <Badge variant="secondary" className="text-xs">Pre-filled</Badge>
            </div>
          </div>
        )}

        {/* Category */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Priority */}
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the issue in detail..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Internal notes */}
        <FormField
          control={form.control}
          name="internal_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Internal Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notes visible only to staff..."
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Attachments */}
        <div className="space-y-2">
          <Label>Attachments (optional)</Label>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg hover:bg-muted/30 transition-colors text-sm text-muted-foreground">
                <Paperclip className="w-4 h-4" />
                Attach files
              </div>
            </label>
          </div>
          {attachments.length > 0 && (
            <div className="space-y-1">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-muted/30 rounded-lg text-sm">
                  <span className="truncate">{file.name}</span>
                  <button type="button" onClick={() => removeAttachment(i)}>
                    <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Create Ticket
          </Button>
        </div>
      </form>
    </Form>
  );
}

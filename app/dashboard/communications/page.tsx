"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Plus,
  Send,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  MessageCircle,
  ChevronsUpDown,
  Check,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/lib/context/auth-context";
import { useCommunicationTemplates, useCommunicationLogs, useCommunicationStats } from "@/lib/hooks/use-communications";
import { useCustomers } from "@/lib/hooks/use-customers";
import { communicationService } from "@/lib/services/communication.service";
import { MiniStat } from "@/components/dashboard/mini-stat";
import type { CommunicationTemplate, CommChannel } from "@/lib/types";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const EMPTY_TEMPLATE_FORM = {
  name: "",
  channel: "email",
  trigger_type: "manual",
  subject: "",
  body_template: "",
};

const EMPTY_SEND_FORM = {
  channel: "email" as CommChannel,
  recipient: "",
  subject: "",
  message: "",
};

export default function CommunicationsPage() {
  const { user, role } = useAuth();
  const { data: templates, isLoading: templatesLoading, mutate: mutateTemplates } = useCommunicationTemplates();
  const { data: logs, isLoading: logsLoading, mutate: mutateLogs } = useCommunicationLogs();
  const { data: customers } = useCustomers();
  const { data: stats } = useCommunicationStats();
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [formData, setFormData] = useState(EMPTY_TEMPLATE_FORM);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendingCustomerMessage, setSendingCustomerMessage] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [sendForm, setSendForm] = useState(EMPTY_SEND_FORM);
  const isAdmin = role === "admin" || role === "manager";

  const formatLogDate = (value?: string | Date | null) => {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : format(date, "dd MMM yyyy HH:mm");
  };

  const formatTriggerLabel = (trigger?: string | null) => {
    if (!trigger) return "Manual";
    return trigger.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const previewBody = (text?: string | null) => {
    if (!text) return "—";
    return text.replace(/\s+/g, " ").trim();
  };

  const selectedCustomer = useMemo(
    () => customers?.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const selectedTemplate = useMemo(
    () => templates?.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );

  const activeTemplates = useMemo(
    () => (templates ?? []).filter((t) => t.is_active),
    [templates]
  );

  const resetTemplateDialog = () => {
    setDialogMode("create");
    setEditingTemplateId(null);
    setFormData(EMPTY_TEMPLATE_FORM);
    setFormOpen(false);
  };

  const handleOpenCreate = () => {
    setDialogMode("create");
    setEditingTemplateId(null);
    setFormData(EMPTY_TEMPLATE_FORM);
    setFormOpen(true);
  };

  const handleOpenEdit = (template: CommunicationTemplate) => {
    setDialogMode("edit");
    setEditingTemplateId(template.id);
    setFormData({
      name: template.name ?? "",
      channel: template.channel ?? "email",
      trigger_type: template.trigger_type ?? "manual",
      subject: template.subject ?? "",
      body_template: template.body_template ?? "",
    });
    setFormOpen(true);
  };

  const handleDuplicateTemplate = (template: CommunicationTemplate) => {
    setDialogMode("create");
    setEditingTemplateId(null);
    setFormData({
      name: `${template.name} (Copy)`,
      channel: template.channel ?? "email",
      trigger_type: template.trigger_type ?? "manual",
      subject: template.subject ?? "",
      body_template: template.body_template ?? "",
    });
    setFormOpen(true);
  };

  const handleToggleTemplateStatus = async (template: CommunicationTemplate) => {
    if (!user) return;
    try {
      await communicationService.updateTemplate(template.id, {
        is_active: !template.is_active,
      });
      toast.success(`Template ${template.is_active ? "deactivated" : "activated"}`);
      mutateTemplates();
    } catch {
      toast.error("Failed to update template status");
    }
  };

  const handleSubmitTemplate = async () => {
    if (!user || !formData.name || !formData.body_template) return;
    setSaving(true);
    try {
      if (dialogMode === "edit" && editingTemplateId) {
        await communicationService.updateTemplate(editingTemplateId, {
          name: formData.name,
          channel: formData.channel as CommunicationTemplate["channel"],
          trigger_type: formData.trigger_type as CommunicationTemplate["trigger_type"],
          subject: formData.subject,
          body_template: formData.body_template,
        });
        toast.success("Template updated");
      } else {
        await communicationService.createTemplate({
          ...formData,
          created_by: user.id,
          is_active: true,
        } as Partial<CommunicationTemplate>);
        toast.success("Template created");
      }
      resetTemplateDialog();
      mutateTemplates();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  const handleSendRenewalReminders = async () => {
    if (!user) return;
    setSendingReminders(true);
    try {
      const result = await communicationService.sendRenewalReminders(user.id);
      toast.success(`Sent ${result.sent} renewal reminders`);
      mutateLogs();
    } catch { toast.error("Failed to send reminders"); }
    finally { setSendingReminders(false); }
  };

  const resetSendDialog = () => {
    setSendDialogOpen(false);
    setSelectedCustomerId("");
    setSelectedTemplateId("");
    setCustomerPickerOpen(false);
    setTemplatePickerOpen(false);
    setSendForm(EMPTY_SEND_FORM);
  };

  const handleOpenSendDialog = () => {
    setSendDialogOpen(true);
  };

  const handleTemplateSelection = (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId);
    if (!template) return;
    setSelectedTemplateId(templateId);
    setTemplatePickerOpen(false);
    setSendForm((prev) => ({
      ...prev,
      channel: template.channel,
      subject: template.subject ?? "",
      message: template.body_template ?? "",
      recipient: prev.recipient || selectedCustomer?.email || "",
    }));
  };

  const handleCustomerSelection = (customerId: string) => {
    const customer = customers?.find((c) => c.id === customerId);
    if (!customer) return;
    setSelectedCustomerId(customerId);
    setCustomerPickerOpen(false);
    setSendForm((prev) => ({
      ...prev,
      recipient: customer.email || prev.recipient,
      subject: prev.subject.replace(/\{\{customer_name\}\}/g, customer.name),
      message: prev.message.replace(/\{\{customer_name\}\}/g, customer.name),
    }));
  };

  const handleSendToCustomer = async () => {
    if (!user || !selectedCustomer || !sendForm.recipient || !sendForm.message) return;
    setSendingCustomerMessage(true);
    try {
      const variables = {
        customer_name: selectedCustomer.name,
        customer_email: selectedCustomer.email,
        customer_phone: selectedCustomer.phone,
      };

      if (selectedTemplateId) {
        await communicationService.sendTemplateToCustomer({
          templateId: selectedTemplateId,
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          recipient: sendForm.recipient,
          variables,
          userId: user.id,
        });
      } else {
        const response = await fetch("/api/communications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: sendForm.channel,
            recipient: sendForm.recipient,
            subject: sendForm.subject,
            body: sendForm.message,
            customerId: selectedCustomer.id,
            customerName: selectedCustomer.name,
            userId: user.id,
          }),
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Failed to send");
      }

      toast.success("Message sent to customer");
      resetSendDialog();
      mutateLogs();
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSendingCustomerMessage(false);
    }
  };

  return (
    <motion.div className="mx-auto max-w-7xl space-y-6" {...pageTransition}>
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Live communication desk
            </div>
            <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.16em] text-foreground sm:text-3xl">
              Communications Hub
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Manage outbound templates, dispatch reminders, and audit customer conversations from one queue.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleOpenSendDialog} className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Send to Customer
            </Button>
            <Button variant="outline" onClick={handleSendRenewalReminders} disabled={sendingReminders} className="gap-2">
              {sendingReminders ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Renewal Reminders
            </Button>
            <Button onClick={handleOpenCreate} className="gap-2"><Plus className="h-4 w-4" /> New Template</Button>
          </div>
        </div>
      </section>

      {stats && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { icon: MessageSquare, label: "Total Sent", value: stats.total, color: "text-blue-500" },
            { icon: CheckCircle2, label: "Delivered", value: stats.sent, color: "text-emerald-500" },
            { icon: XCircle, label: "Failed", value: stats.failed, color: "text-rose-500" },
            { icon: Mail, label: "Delivery Rate", value: `${stats.deliveryRate}%`, color: "text-indigo-500" },
          ].map((item) => (
            <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
              <MiniStat icon={item.icon} label={item.label} value={item.value} color={item.color} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="h-auto w-full max-w-md grid-cols-2 rounded-2xl border border-border bg-card/90 p-1">
          <TabsTrigger value="templates" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Templates</TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          {templatesLoading ? (
            <div className="space-y-3 rounded-2xl border border-border-strong/70 bg-card/90 p-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
          ) : !templates?.length ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong/70 bg-card/80 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/80 bg-muted/50"><MessageSquare className="h-8 w-8 text-muted-foreground" /></div>
              <p className="text-muted-foreground text-sm">No templates yet.</p>
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              {templates.map(t => (
                <motion.div
                  key={t.id}
                  variants={staggerItem}
                  {...hoverLift}
                  className="space-y-3 rounded-2xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_10px_24px_rgba(47,62,64,0.06)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-heading font-bold text-foreground text-lg leading-tight">{t.name}</h3>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <Badge variant="outline" className="capitalize text-xs">{t.channel}</Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          t.is_active
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        {t.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject</p>
                    <p className="text-sm text-foreground/90 wrap-break-word leading-relaxed">{t.subject?.trim() || "—"}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Message Preview</p>
                    <p className="text-sm text-muted-foreground leading-relaxed wrap-break-word line-clamp-3">{previewBody(t.body_template)}</p>
                  </div>

                  <div className="pt-1">
                    <Badge variant="secondary" className="text-xs">Trigger: {formatTriggerLabel(t.trigger_type)}</Badge>
                  </div>

                  {isAdmin && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" variant="outline" className="border-border/80 bg-background/80" onClick={() => handleOpenEdit(t)}>Edit</Button>
                      <Button size="sm" variant="outline" className="border-border/80 bg-background/80" onClick={() => handleDuplicateTemplate(t)}>Duplicate</Button>
                      <Button size="sm" variant="outline" className="border-border/80 bg-background/80" onClick={() => handleToggleTemplateStatus(t)}>
                        {t.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          {logsLoading ? (
            <div className="space-y-3 rounded-2xl border border-border-strong/70 bg-card/90 p-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : !logs?.length ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong/70 bg-card/80 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/80 bg-muted/50"><Clock className="h-8 w-8 text-muted-foreground" /></div>
              <p className="text-muted-foreground text-sm">No communication logs yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_12px_28px_rgba(47,62,64,0.06)]">
              <Table>
                <TableHeader><TableRow className="border-border/80 bg-muted/20">
                  <TableHead className="font-heading uppercase tracking-wider text-xs">Channel</TableHead>
                  <TableHead className="font-heading uppercase tracking-wider text-xs">Recipient</TableHead>
                  <TableHead className="font-heading uppercase tracking-wider text-xs">Subject</TableHead>
                  <TableHead className="font-heading uppercase tracking-wider text-xs">Status</TableHead>
                  <TableHead className="font-heading uppercase tracking-wider text-xs">Date</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {logs.slice(0, 50).map(log => (
                    <TableRow key={log.id} className="border-border/70 hover:bg-muted/35">
                      <TableCell className="capitalize"><Badge variant="outline" className="text-xs">{log.channel}</Badge></TableCell>
                      <TableCell className="font-medium">{log.customer_name || log.recipient}</TableCell>
                      <TableCell className="max-w-50 truncate text-sm text-muted-foreground">{log.subject || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            log.status === "sent" || log.status === "delivered"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                          )}
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatLogDate(log.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl border border-border-strong/70 bg-card/95">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wider">
              {dialogMode === "edit" ? "Edit Template" : "New Template"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "edit"
                ? "Update template fields and save your changes."
                : "Create a reusable communication template for reminders and updates."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Channel</Label>
              <Select value={formData.channel} onValueChange={v => setFormData(d => ({ ...d, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="sms">SMS</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Trigger</Label>
              <Select value={formData.trigger_type} onValueChange={v => setFormData(d => ({ ...d, trigger_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem><SelectItem value="renewal_reminder">Renewal Reminder</SelectItem>
                  <SelectItem value="policy_expiry">Policy Expiry</SelectItem><SelectItem value="claim_update">Claim Update</SelectItem>
                  <SelectItem value="payment_reminder">Payment Reminder</SelectItem><SelectItem value="birthday">Birthday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-full"><Label>Subject</Label><Input value={formData.subject} onChange={e => setFormData(d => ({ ...d, subject: e.target.value }))} placeholder="Use {{customer_name}} for variables" /></div>
            <div className="space-y-2 col-span-full"><Label>Body Template *</Label><Textarea rows={8} value={formData.body_template} onChange={e => setFormData(d => ({ ...d, body_template: e.target.value }))} placeholder="Dear {{customer_name}},&#10;&#10;Your policy {{policy_number}} is expiring..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetTemplateDialog}>Cancel</Button>
            <Button onClick={handleSubmitTemplate} disabled={saving || !formData.name || !formData.body_template}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {dialogMode === "edit" ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl border border-border-strong/70 bg-card/95">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wider">Send to Customer</DialogTitle>
            <DialogDescription>Select customer and optional template, then send a personal message.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 col-span-full">
              <Label>Customer *</Label>
              <Popover open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={customerPickerOpen} className="w-full justify-between border-border/80 bg-background/80">
                    {selectedCustomer ? `${selectedCustomer.name} - ${selectedCustomer.email}` : "Select customer"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-(--radix-popover-trigger-width) border-border bg-popover p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search customer..." />
                    <CommandList className="max-h-75">
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandGroup>
                        {(customers ?? []).map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={`${customer.name} ${customer.email} ${customer.phone}`}
                            onSelect={() => handleCustomerSelection(customer.id)}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedCustomerId === customer.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span className="font-medium">{customer.name}</span>
                              <span className="text-xs text-muted-foreground">{customer.email} • {customer.phone}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2 col-span-full">
              <Label>Template (Optional)</Label>
              <Popover open={templatePickerOpen} onOpenChange={setTemplatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={templatePickerOpen} className="w-full justify-between border-border/80 bg-background/80">
                    {selectedTemplate ? `${selectedTemplate.name} (${selectedTemplate.channel})` : "Select active template or write custom"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-(--radix-popover-trigger-width) border-border bg-popover p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search template..." />
                    <CommandList className="max-h-75">
                      <CommandEmpty>No active template found.</CommandEmpty>
                      <CommandGroup>
                        {activeTemplates.map((template) => (
                          <CommandItem
                            key={template.id}
                            value={`${template.name} ${template.channel} ${template.trigger_type}`}
                            onSelect={() => handleTemplateSelection(template.id)}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedTemplateId === template.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span className="font-medium">{template.name}</span>
                              <span className="text-xs text-muted-foreground capitalize">{template.channel} • {formatTriggerLabel(template.trigger_type)}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={sendForm.channel} onValueChange={(v) => setSendForm((prev) => ({ ...prev, channel: v as CommChannel }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Recipient *</Label>
              <Input
                value={sendForm.recipient}
                onChange={(e) => setSendForm((prev) => ({ ...prev, recipient: e.target.value }))}
                placeholder="Email / phone / destination"
              />
            </div>

            <div className="space-y-2 col-span-full">
              <Label>Subject</Label>
              <Input
                value={sendForm.subject}
                onChange={(e) => setSendForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Subject line"
              />
            </div>

            <div className="space-y-2 col-span-full">
              <Label>Message *</Label>
              <Textarea
                rows={8}
                value={sendForm.message}
                onChange={(e) => setSendForm((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="Write message or use template placeholders like {{customer_name}}"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetSendDialog}>Cancel</Button>
            <Button
              onClick={handleSendToCustomer}
              disabled={sendingCustomerMessage || !selectedCustomer || !sendForm.recipient || !sendForm.message}
            >
              {sendingCustomerMessage && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

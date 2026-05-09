"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, FileText } from "lucide-react";

import { useAuth } from "@/lib/context/auth-context";
import { pageTransition } from "@/lib/helpers/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface Template {
  id: string;
  name: string;
  category: string;
  priority: string;
  description_template?: string;
  internal_notes_template?: string;
}

interface TemplateFormData {
  name: string;
  category: string;
  priority: string;
  description_template: string;
  internal_notes_template: string;
}

const DEFAULT_FORM: TemplateFormData = {
  name: "",
  category: "",
  priority: "medium",
  description_template: "",
  internal_notes_template: "",
};

export default function TemplatesPage() {
  const { session, role } = useAuth();
  const token = session?.access_token ?? "";

  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTemplates = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/service-desk/templates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTemplates(Array.isArray(data) ? data : (data?.data || []));
      } else {
        setTemplates([]);
        toast.error(data?.error || "Failed to load templates");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, [token]);

  const handleOpenCreate = () => {
    setEditTemplate(null);
    setFormData(DEFAULT_FORM);
    setFormOpen(true);
  };

  const handleOpenEdit = (template: Template) => {
    setEditTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      priority: template.priority,
      description_template: template.description_template ?? "",
      internal_notes_template: template.internal_notes_template ?? "",
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.category || !token) return;
    setIsSubmitting(true);
    try {
      const url = editTemplate
        ? `/api/service-desk/templates/${editTemplate.id}`
        : "/api/service-desk/templates";
      const method = editTemplate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(editTemplate ? "Template updated" : "Template created");
      setFormOpen(false);
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplate || !token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/service-desk/templates/${deleteTemplate.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Template deleted");
      setDeleteTemplate(null);
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete template");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (role === "employee") {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Manager or Admin access required.</p>
      </div>
    );
  }

  return (
    <motion.div {...pageTransition} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-heading font-bold uppercase tracking-wider">
            Ticket Templates
          </h1>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No templates yet.</p>
            <Button onClick={handleOpenCreate} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Create First Template
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {templates.map(template => (
              <div key={template.id} className="flex items-center justify-between px-6 py-4">
                <div className="space-y-1">
                  <p className="font-medium">{template.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {template.category.replace(/_/g, " ")}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {template.priority}
                    </Badge>
                  </div>
                  {template.description_template && (
                    <p className="text-xs text-muted-foreground truncate max-w-md">
                      {template.description_template}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleOpenEdit(template)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-400"
                    onClick={() => setDeleteTemplate(template)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wider">
              {editTemplate ? "Edit Template" : "New Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Template Name *</Label>
              <Input
                placeholder="e.g., E-Card Request - Standard"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={v => setFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Default Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={v => setFormData(prev => ({ ...prev, priority: v }))}
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
            </div>

            <div className="space-y-1.5">
              <Label>Description Template</Label>
              <Textarea
                placeholder="Pre-filled description for this ticket type..."
                value={formData.description_template}
                onChange={e => setFormData(prev => ({ ...prev, description_template: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Internal Notes Template</Label>
              <Textarea
                placeholder="Pre-filled internal notes..."
                value={formData.internal_notes_template}
                onChange={e => setFormData(prev => ({ ...prev, internal_notes_template: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name.trim() || !formData.category}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={open => !open && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{deleteTemplate?.name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

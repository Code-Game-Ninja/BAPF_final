"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { reassignLead } from "@/lib/services/lead.service";
import { useAuth } from "@/lib/context/auth-context";
import { useActiveUsers } from "@/lib/hooks/use-settings";
import { invalidateLeads } from "@/lib/hooks/use-leads";
import { SalesLead } from "@/lib/types";

import { Button } from "@/components/ui/button";
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

interface LeadReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: SalesLead;
  onSuccess?: () => void;
}

export function LeadReassignDialog({ open, onOpenChange, lead, onSuccess }: LeadReassignDialogProps) {
  const { user } = useAuth();
  const { data: users } = useActiveUsers();
  const [assigneeId, setAssigneeId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!assigneeId || !user) return;
    const assignee = users?.find((u) => u.id === assigneeId);
    if (!assignee) return;

    setSaving(true);
    try {
      await reassignLead(
        lead.id,
        assigneeId,
        assignee.name,
        reason,
        user.id,
        user.name
      );
      toast.success(`Lead reassigned to ${assignee.name}`);
      invalidateLeads();
      onOpenChange(false);
      setAssigneeId("");
      setReason("");
      onSuccess?.();
    } catch {
      toast.error("Failed to reassign lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-cabin uppercase tracking-wider">
            Reassign Lead
          </DialogTitle>
          <DialogDescription>
            Reassign {lead.lead_number} — {lead.customer_name} to a different employee.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm mb-1.5 block">Currently Assigned To</Label>
            <p className="text-sm text-muted-foreground">{lead.assigned_to_name || "Unknown"}</p>
          </div>

          <div>
            <Label className="text-sm mb-1.5 block">New Assignee *</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {(users ?? [])
                  .filter((u) => u.id !== lead.assigned_to)
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm mb-1.5 block">Reason</Label>
            <Textarea
              placeholder="Why is this lead being reassigned?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !assigneeId} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Reassign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

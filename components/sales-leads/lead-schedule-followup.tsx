"use client";

import { useState } from "react";
import { Loader2, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { updateLead, addTimelineEntry } from "@/lib/services/lead.service";
import { useAuth } from "@/lib/context/auth-context";
import { invalidateLeads } from "@/lib/hooks/use-leads";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LeadScheduleFollowUpProps {
  leadId: string;
  currentDate?: string;
  onSuccess?: () => void;
}

export function LeadScheduleFollowUp({ leadId, currentDate, onSuccess }: LeadScheduleFollowUpProps) {
  const { user } = useAuth();
  const [date, setDate] = useState(currentDate || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!date || !user) return;
    setSaving(true);
    try {
      await updateLead(leadId, { follow_up_date: date });
      await addTimelineEntry(
        leadId,
        "follow_up_scheduled",
        `Follow-up scheduled for ${format(new Date(date), "dd MMM yyyy")}`,
        user.id,
        user.name
      );
      toast.success(`Follow-up scheduled for ${format(new Date(date), "dd MMM yyyy")}`);
      invalidateLeads();
      onSuccess?.();
    } catch {
      toast.error("Failed to schedule follow-up");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-cabin font-bold uppercase tracking-wider text-sm text-foreground mb-3 flex items-center gap-2">
        <CalendarCheck className="w-4 h-4 text-primary" />
        Schedule Follow-Up
      </h3>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="followup-date" className="text-xs text-muted-foreground mb-1.5 block">
            Follow-Up Date
          </Label>
          <Input
            id="followup-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={saving || !date}
          className="gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
          {currentDate ? "Reschedule" : "Schedule"}
        </Button>
      </div>
      {currentDate && (
        <p className="text-xs text-muted-foreground mt-2">
          Current: {format(new Date(currentDate), "dd MMM yyyy")}
        </p>
      )}
    </div>
  );
}

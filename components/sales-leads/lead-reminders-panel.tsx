"use client";

import { useState } from "react";
import { format, isPast, isToday } from "date-fns";
import { Bell, Check, Trash2, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/context/auth-context";
import { useLeadReminders } from "@/lib/hooks/use-leads";
import { LeadReminder } from "@/lib/types";

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
import { Skeleton } from "@/components/ui/skeleton";

const REMINDER_TYPE_OPTIONS = [
  { value: "call",     label: "Call" },
  { value: "meeting",  label: "Meeting" },
  { value: "document", label: "Document Collection" },
  { value: "proposal", label: "Proposal Follow-up" },
  { value: "other",    label: "Other" },
] as const;

const REMINDER_TYPE_COLORS: Record<string, string> = {
  call:     "text-blue-500 bg-blue-500/10",
  meeting:  "text-purple-500 bg-purple-500/10",
  document: "text-amber-500 bg-amber-500/10",
  proposal: "text-green-500 bg-green-500/10",
  other:    "text-gray-500 bg-gray-500/10",
};

interface LeadRemindersPanelProps {
  leadId: string;
}

export function LeadRemindersPanel({ leadId }: LeadRemindersPanelProps) {
  const { user } = useAuth();
  const { data: reminders, isLoading, mutate } = useLeadReminders(leadId);

  const [showForm, setShowForm] = useState(false);
  const [reminderType, setReminderType] = useState<LeadReminder["reminder_type"]>("call");
  const [reminderDate, setReminderDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const handleCreate = async () => {
    if (!reminderDate || !user) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminder_type: reminderType,
          reminder_date: reminderDate,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create reminder");
      }
      toast.success("Reminder set (email notification sent)");
      setShowForm(false);
      setReminderDate("");
      setNote("");
      setReminderType("call");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to set reminder");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkDone = async (id: string) => {
    // Optimistic update — move from pending to done instantly
    const optimistic = reminders?.map((r) =>
      r.id === id ? { ...r, status: "done" as const } : r
    );
    try {
      await mutate(
        async () => {
          const res = await fetch(`/api/leads/${leadId}/reminders?rid=${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "done" }),
          });
          if (!res.ok) throw new Error("Failed to update");
          // Re-fetch the full list after successful update
          const listRes = await fetch(`/api/leads/${leadId}/reminders`);
          return listRes.ok ? listRes.json() : optimistic;
        },
        { optimisticData: optimistic, revalidate: false }
      );
      toast.success("Reminder marked as done");
    } catch {
      toast.error("Failed to update reminder");
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic update — remove from list instantly
    const optimistic = reminders?.filter((r) => r.id !== id);
    try {
      await mutate(
        async () => {
          const res = await fetch(`/api/leads/${leadId}/reminders?rid=${id}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to delete");
          const listRes = await fetch(`/api/leads/${leadId}/reminders`);
          return listRes.ok ? listRes.json() : optimistic;
        },
        { optimisticData: optimistic, revalidate: false }
      );
    } catch {
      toast.error("Failed to delete reminder");
    }
  };

  const pending = reminders?.filter((r) => r.status === "pending") ?? [];
  const done    = reminders?.filter((r) => r.status === "done")    ?? [];

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-cabin font-bold uppercase tracking-wider text-sm text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Reminders
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs h-7"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? "Cancel" : "Add"}
        </Button>
      </div>

      {/* Add Reminder form */}
      {showForm && (
        <div className="mb-4 space-y-2 p-3 rounded-lg bg-muted/40 border border-border">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
              <Select
                value={reminderType}
                onValueChange={(v) => setReminderType(v as LeadReminder["reminder_type"])}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {REMINDER_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Date</Label>
              <Input
                type="date"
                value={reminderDate}
                min={todayStr}
                onChange={(e) => setReminderDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Brief note about this reminder..."
              rows={2}
              className="text-xs"
            />
          </div>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={saving || !reminderDate}
            className="w-full gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Set Reminder
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Pending reminders */}
          {pending.length === 0 && done.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">No reminders set.</p>
          )}
          {pending.map((r) => {
            const dateObj = new Date(r.reminder_date);
            const overdue = isPast(dateObj) && !isToday(dateObj);
            const isToday_ = isToday(dateObj);
            return (
              <div
                key={r.id}
                className={`flex items-start gap-2 px-3 py-2 rounded-lg ${
                  overdue
                    ? "bg-red-500/10"
                    : isToday_
                    ? "bg-amber-500/10"
                    : "bg-muted/40"
                }`}
              >
                <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0 ${REMINDER_TYPE_COLORS[r.reminder_type]}`}>
                  {r.reminder_type.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${overdue ? "text-red-500" : isToday_ ? "text-amber-500" : "text-foreground"}`}>
                    {format(new Date(r.reminder_date), "dd MMM yyyy")}
                    {overdue && " \u2022 Overdue"}
                    {isToday_ && " \u2022 Today"}
                  </p>
                  {r.note && <p className="text-xs text-muted-foreground truncate">{r.note}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleMarkDone(r.id)}
                    className="p-1 text-emerald-500 hover:text-emerald-400 rounded"
                    title="Mark done"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-1 text-muted-foreground hover:text-red-400 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Completed reminders (collapsed, max 3) */}
          {done.slice(0, 3).map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg opacity-50"
            >
              <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <p className="text-xs text-muted-foreground line-through flex-1 truncate">
                {r.reminder_type} · {format(new Date(r.reminder_date), "dd MMM")}
                {r.note ? ` \u2014 ${r.note}` : ""}
              </p>
              <button
                onClick={() => handleDelete(r.id)}
                className="p-0.5 text-muted-foreground hover:text-red-400 rounded flex-shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

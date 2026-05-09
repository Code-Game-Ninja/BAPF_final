"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { getAccessToken } from "@/lib/services/auth.service";
import { invalidateLeads } from "@/lib/hooks/use-leads";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LeadAddNoteProps {
  leadId: string;
  onSuccess?: () => void;
}

export function LeadAddNote({ leadId, onSuccess }: LeadAddNoteProps) {
  const [note, setNote] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`/api/leads/${leadId}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "note_added",
          description: note.trim(),
          next_action: nextAction.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to add note");

      toast.success("Note added");
      setNote("");
      setNextAction("");
      invalidateLeads();
      onSuccess?.();
    } catch {
      toast.error("Failed to add note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-cabin font-bold uppercase tracking-wider text-sm text-foreground mb-3">
        Add Note
      </h3>
      <Textarea
        placeholder="Write a note about this lead..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        className="mb-3"
      />
      <div className="mb-3">
        <Label className="text-xs text-muted-foreground mb-1.5 block">Next Action (optional)</Label>
        <Input
          placeholder="e.g. Call back on Friday, Send proposal..."
          value={nextAction}
          onChange={(e) => setNextAction(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={saving || !note.trim()}
          className="gap-2"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Add Note
        </Button>
      </div>
    </div>
  );
}

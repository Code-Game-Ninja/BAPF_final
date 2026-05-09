"use client";

import { useState } from "react";
import { Loader2, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/context/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface EscalationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  ticketNumber: string;
  currentLevel: number;
  onSuccess: () => void;
}

export function EscalationDialog({
  open,
  onOpenChange,
  ticketId,
  ticketNumber,
  currentLevel,
  onSuccess,
}: EscalationDialogProps) {
  const { session } = useAuth();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEscalate = async () => {
    if (!reason.trim() || !session?.access_token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/service-desk/tickets/${ticketId}/escalate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Ticket ${ticketNumber} escalated to Level ${currentLevel + 1}`);
      setReason("");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Escalation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wider flex items-center gap-2">
            <ChevronUp className="w-5 h-5 text-red-400" />
            Escalate Ticket
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Escalating <strong>{ticketNumber}</strong> to Level {currentLevel + 1}.
            This will notify {currentLevel + 1 === 1 ? "managers" : "admins"}.
          </p>

          <div className="space-y-1.5">
            <Label>Escalation Reason *</Label>
            <Textarea
              placeholder="Describe why this ticket needs escalation..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleEscalate}
            disabled={isSubmitting || !reason.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Escalate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

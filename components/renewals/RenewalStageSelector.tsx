"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/context/auth-context";
import { supabase } from "@/lib/supabase/client";

const STAGES = [
  { value: "due", label: "Due" },
  { value: "contacted", label: "Contacted" },
  { value: "negotiating", label: "Negotiating" },
  { value: "renewed", label: "Renewed" },
  { value: "lost", label: "Lost" },
] as const;

type Stage = (typeof STAGES)[number]["value"];

interface RenewalStageSelectorProps {
  renewalId: string;
  currentStage: Stage;
  onStageUpdated?: (newStage: Stage) => void;
}

export function RenewalStageSelector({
  renewalId,
  currentStage,
  onStageUpdated,
}: RenewalStageSelectorProps) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [pendingStage, setPendingStage] = useState<Stage | null>(null);
  const [lostReason, setLostReason] = useState("");

  const isTerminal = currentStage === "renewed" || currentStage === "lost";

  const handleStageChange = async (newStage: Stage) => {
    if (newStage === currentStage) return;

    if (newStage === "lost") {
      setPendingStage(newStage);
      setLostDialogOpen(true);
      return;
    }

    await updateStage(newStage);
  };

  const updateStage = async (stage: Stage, lost_reason?: string) => {
    setLoading(true);
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`/api/renewals/${renewalId}/stage`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stage, lost_reason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update stage");

      toast.success(`Stage updated to ${stage}`);
      onStageUpdated?.(stage);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update stage");
    } finally {
      setLoading(false);
    }
  };

  const handleLostConfirm = async () => {
    if (!lostReason.trim()) {
      toast.error("Please provide a reason for marking as lost");
      return;
    }
    setLostDialogOpen(false);
    await updateStage("lost", lostReason);
    setLostReason("");
    setPendingStage(null);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Select
          value={currentStage}
          onValueChange={(v) => handleStageChange(v as Stage)}
          disabled={loading || isTerminal}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <SelectValue />
            )}
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wider">
              Mark as Lost
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="lost-reason">Reason for Loss *</Label>
            <Textarea
              id="lost-reason"
              placeholder="e.g., Customer chose competitor, price too high, no response..."
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLostDialogOpen(false);
                setLostReason("");
                setPendingStage(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLostConfirm}
              disabled={!lostReason.trim()}
            >
              Confirm Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

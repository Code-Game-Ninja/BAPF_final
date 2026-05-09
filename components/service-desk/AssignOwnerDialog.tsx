"use client";

import { useState, useEffect } from "react";
import { Loader2, Search, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AssignOwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  ticketNumber: string;
  currentOwnerId?: string;
  onSuccess: () => void;
}

export function AssignOwnerDialog({
  open,
  onOpenChange,
  ticketId,
  ticketNumber,
  currentOwnerId,
  onSuccess,
}: AssignOwnerDialogProps) {
  const { session } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("users")
      .select("id, name, email, role")
      .in("role", ["employee", "manager"])
      .eq("status", "active")
      .then(({ data }) => setAgents(data ?? []));
  }, [open]);

  const filtered = agents.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAssign = async () => {
    if (!selectedAgent || !session?.access_token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/service-desk/tickets/${ticketId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ owner_id: selectedAgent.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Ticket ${ticketNumber} assigned to ${selectedAgent.name}`);
      setSelectedAgent(null);
      setSearch("");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            Assign Ticket
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Assign <strong>{ticketNumber}</strong> to an agent.
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {filtered.map(agent => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  selectedAgent?.id === agent.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/30 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {agent.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {agent.id === currentOwnerId && (
                    <Badge variant="secondary" className="text-xs">Current</Badge>
                  )}
                  <Badge variant="outline" className="text-xs capitalize">{agent.role}</Badge>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No agents found</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isSubmitting || !selectedAgent}>
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

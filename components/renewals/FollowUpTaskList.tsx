"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, Clock, Phone, Mail, Users, MessageCircle, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/auth-context";

interface FollowUpTask {
  id: string;
  renewal_id: string;
  task_type: "call" | "email" | "meeting" | "whatsapp";
  due_date: string;
  notes?: string;
  assigned_to_name?: string;
  status: "pending" | "completed" | "snoozed";
  completed_at?: string;
  completion_notes?: string;
}

interface FollowUpTaskListProps {
  renewalId: string;
  tasks: FollowUpTask[];
  onTaskUpdated?: () => void;
}

const TASK_ICONS = {
  call: Phone,
  email: Mail,
  meeting: Users,
  whatsapp: MessageCircle,
};

const STATUS_COLORS = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  snoozed: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

export function FollowUpTaskList({ renewalId, tasks, onTaskUpdated }: FollowUpTaskListProps) {
  const { session } = useAuth();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const updateTask = async (taskId: string, payload: any) => {
    setLoadingId(taskId);
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`/api/renewals/${renewalId}/follow-up/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update task");

      toast.success("Task updated");
      onTaskUpdated?.();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update task");
    } finally {
      setLoadingId(null);
    }
  };

  const handleComplete = (taskId: string) => {
    updateTask(taskId, { status: "completed" });
  };

  const handleSnooze = (taskId: string) => {
    // Snooze by 1 day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    updateTask(taskId, { status: "snoozed", due_date: tomorrow.toISOString() });
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No follow-up tasks yet.
      </div>
    );
  }

  const sorted = [...tasks].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  return (
    <div className="space-y-2">
      {sorted.map((task) => {
        const Icon = TASK_ICONS[task.task_type] ?? Clock;
        const isOverdue =
          task.status === "pending" && new Date(task.due_date) < new Date();

        return (
          <div
            key={task.id}
            className={`flex items-start gap-3 p-3 rounded-xl border ${
              isOverdue ? "border-red-500/30 bg-red-500/5" : "border-border bg-card"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium capitalize">{task.task_type}</span>
                <Badge
                  variant="outline"
                  className={`text-xs ${STATUS_COLORS[task.status]}`}
                >
                  {task.status}
                </Badge>
                {isOverdue && (
                  <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/20">
                    Overdue
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Due: {format(new Date(task.due_date), "dd MMM yyyy, HH:mm")}
                {task.assigned_to_name && ` · ${task.assigned_to_name}`}
              </p>
              {task.notes && (
                <p className="text-xs text-muted-foreground mt-1 truncate">{task.notes}</p>
              )}
            </div>
            {task.status === "pending" && (
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-green-400 hover:bg-green-500/10"
                  title="Mark Complete"
                  disabled={loadingId === task.id}
                  onClick={() => handleComplete(task.id)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-amber-400 hover:bg-amber-500/10"
                  title="Snooze 1 day"
                  disabled={loadingId === task.id}
                  onClick={() => handleSnooze(task.id)}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import { ArrowLeft, Shield, CheckCircle2, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { pageTransition } from "@/lib/helpers/animations";
import { useAuth } from "@/lib/context/auth-context";
import { ComplianceItemForm } from "@/components/compliance/ComplianceItemForm";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
};

async function fetcher(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function ComplianceItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { session, role } = useAuth();
  const token = session?.access_token ?? "";

  const [completing, setCompleting] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionDocUrl, setCompletionDocUrl] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const { data: item, isLoading, mutate } = useSWR(
    token ? [`/api/compliance/${id}`, token] : null,
    ([url, t]) => fetcher(url, t),
    { revalidateOnFocus: false }
  );

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const t = session?.access_token;
      if (!t) throw new Error("Not authenticated");

      const res = await fetch(`/api/compliance/${id}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({
          completion_notes: completionNotes,
          completion_document_url: completionDocUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to complete");

      toast.success(
        data.next_occurrence
          ? `Completed! Next occurrence created for ${data.next_occurrence.due_date}`
          : "Compliance item completed"
      );
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to complete");
    } finally {
      setCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Compliance item not found.</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const daysUntil = differenceInDays(new Date(item.due_date), new Date());
  const isOverdue = daysUntil < 0 && item.status !== "completed";

  return (
    <motion.div {...pageTransition} className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-heading font-bold uppercase tracking-wider">
            {item.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">
            {item.category?.replace(/_/g, " ")} · {item.recurrence?.replace(/_/g, " ")}
          </p>
        </div>
        {(role === "admin" || role === "manager") && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-2">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
        )}
      </div>

      {/* Status Card */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <Badge
              variant="outline"
              className={`text-sm capitalize ${STATUS_COLORS[item.status] ?? ""}`}
            >
              {item.status?.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="text-right">
            <p className={`text-sm font-medium ${isOverdue ? "text-red-400" : daysUntil <= 7 ? "text-orange-400" : daysUntil <= 30 ? "text-yellow-400" : "text-green-400"}`}>
              {isOverdue
                ? `${Math.abs(daysUntil)} days overdue`
                : daysUntil === 0
                ? "Due today"
                : `${daysUntil} days left`}
            </p>
            <p className="text-xs text-muted-foreground">
              Due: {format(new Date(item.due_date), "dd MMM yyyy")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Assigned To</p>
            <p className="mt-0.5">{item.assigned_to_name ?? "Unassigned"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Category</p>
            <p className="capitalize mt-0.5">{item.category?.replace(/_/g, " ")}</p>
          </div>
        </div>

        {item.description && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Description</p>
            <p className="text-sm">{item.description}</p>
          </div>
        )}
      </div>

      {/* Completion Workflow */}
      {item.status !== "completed" && (role === "admin" || role === "manager") && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-heading font-bold uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" /> Mark as Completed
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="completion_doc">Completion Document URL</Label>
            <Input
              id="completion_doc"
              placeholder="https://..."
              value={completionDocUrl}
              onChange={(e) => setCompletionDocUrl(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="completion_notes">Completion Notes</Label>
            <Textarea
              id="completion_notes"
              placeholder="Describe how this was completed..."
              rows={3}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
            />
          </div>

          <Button onClick={handleComplete} disabled={completing} className="gap-2">
            {completing && <Loader2 className="w-4 h-4 animate-spin" />}
            <CheckCircle2 className="w-4 h-4" />
            Mark Complete
            {item.recurrence !== "one_time" && " & Create Next Occurrence"}
          </Button>
        </div>
      )}

      {/* Completion Info */}
      {item.status === "completed" && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-heading font-bold uppercase tracking-wider text-green-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Completed
          </h2>
          <div className="text-sm space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Completed At</p>
              <p>{item.completed_at ? format(new Date(item.completed_at), "dd MMM yyyy, HH:mm") : "—"}</p>
            </div>
            {item.completion_notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p>{item.completion_notes}</p>
              </div>
            )}
            {item.completion_document_url && (
              <div>
                <p className="text-xs text-muted-foreground">Document</p>
                <a
                  href={item.completion_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs"
                >
                  View Document
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <ComplianceItemForm
        editData={item}
        open={editOpen}
        onOpenChange={setEditOpen}
        onCreated={() => { mutate(); setEditOpen(false); }}
      />
    </motion.div>
  );
}

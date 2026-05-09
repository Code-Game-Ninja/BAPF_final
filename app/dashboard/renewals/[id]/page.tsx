"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft, RefreshCw, Calendar, IndianRupee, Building2,
  User, Clock, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { pageTransition } from "@/lib/helpers/animations";
import { useAuth } from "@/lib/context/auth-context";
import { RenewalRiskBadge } from "@/components/renewals/RenewalRiskBadge";
import { RenewalStageSelector } from "@/components/renewals/RenewalStageSelector";
import { FollowUpTaskForm } from "@/components/renewals/FollowUpTaskForm";
import { FollowUpTaskList } from "@/components/renewals/FollowUpTaskList";

const STAGE_COLORS: Record<string, string> = {
  due: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  contacted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  negotiating: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  renewed: "bg-green-500/10 text-green-400 border-green-500/20",
  lost: "bg-red-500/10 text-red-400 border-red-500/20",
};

async function fetcher(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function RenewalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { session } = useAuth();
  const token = session?.access_token ?? "";

  const { data: entry, isLoading, mutate } = useSWR(
    token ? [`/api/renewals/pipeline?limit=1`, token, id] : null,
    async ([, t]) => {
      // Fetch single renewal by querying pipeline with all data
      const res = await fetch(`/api/renewals/pipeline?limit=200`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      return (data.data ?? []).find((e: any) => e.id === id) ?? null;
    },
    { revalidateOnFocus: false }
  );

  // Fetch stage history
  const { data: historyData } = useSWR(
    token && id ? [`stage-history-${id}`, token] : null,
    async ([, t]) => {
      // We'll use supabase client directly for stage history
      const { supabase } = await import("@/lib/supabase/client");
      const { data } = await supabase
        .from("renewal_stage_history" as any)
        .select("*")
        .eq("renewal_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Renewal not found.</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const policy = entry.policies;
  const customer = entry.customers;
  const tasks = entry.follow_up_tasks ?? [];

  return (
    <motion.div {...pageTransition} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-heading font-bold uppercase tracking-wider">
            Renewal Detail
          </h1>
          <p className="text-sm text-muted-foreground">
            {policy?.policy_number ?? "—"} · {customer?.name ?? "—"}
          </p>
        </div>
        <RenewalRiskBadge score={entry.risk_score ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Policy Info */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-heading font-bold uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Policy Information
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Policy #</p>
                <p className="font-mono font-medium mt-0.5">{policy?.policy_number ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Type</p>
                <p className="capitalize mt-0.5">{policy?.policy_type?.replace(/_/g, " ") ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Insurer</p>
                <p className="mt-0.5">{policy?.insurer_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Premium</p>
                <p className="font-medium mt-0.5">
                  {policy?.premium_amount
                    ? `₹${policy.premium_amount.toLocaleString("en-IN")}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Expiry Date</p>
                <p className="mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  {policy?.end_date
                    ? format(new Date(policy.end_date), "dd MMM yyyy")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Sum Insured</p>
                <p className="mt-0.5">
                  {policy?.sum_insured
                    ? `₹${policy.sum_insured.toLocaleString("en-IN")}`
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-heading font-bold uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Customer
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Name</p>
                <p className="font-medium mt-0.5">{customer?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Phone</p>
                <p className="mt-0.5">{customer?.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
                <p className="mt-0.5 truncate">{customer?.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Contact</p>
                <p className="mt-0.5">
                  {entry.last_contact_date
                    ? format(new Date(entry.last_contact_date), "dd MMM yyyy")
                    : "Never"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/customers/${entry.customer_id}`)}
            >
              View Client 360
            </Button>
          </div>

          {/* Follow-up Tasks */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-heading font-bold uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Follow-up Tasks
              </h2>
              <FollowUpTaskForm renewalId={id} onCreated={() => mutate()} />
            </div>
            <FollowUpTaskList
              renewalId={id}
              tasks={tasks}
              onTaskUpdated={() => mutate()}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Stage Management */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-heading font-bold uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" /> Stage
            </h2>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={`text-sm capitalize ${STAGE_COLORS[entry.stage] ?? ""}`}
              >
                {entry.stage}
              </Badge>
              <RenewalStageSelector
                renewalId={id}
                currentStage={entry.stage}
                onStageUpdated={() => mutate()}
              />
            </div>
            {entry.lost_reason && (
              <div className="text-xs text-muted-foreground bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                <p className="font-medium text-red-400 mb-1">Lost Reason</p>
                <p>{entry.lost_reason}</p>
              </div>
            )}
          </div>

          {/* Stage History */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-heading font-bold uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Stage History
            </h2>
            {(historyData ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No history yet.</p>
            ) : (
              <div className="space-y-2">
                {(historyData ?? []).map((h: any) => (
                  <div key={h.id} className="text-xs border-l-2 border-primary/30 pl-3">
                    <p className="font-medium">
                      {h.from_stage ? `${h.from_stage} → ` : ""}{h.to_stage}
                    </p>
                    <p className="text-muted-foreground">
                      {h.changed_by_name ?? "System"} · {format(new Date(h.created_at), "dd MMM, HH:mm")}
                    </p>
                    {h.notes && <p className="text-muted-foreground italic">{h.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline Info */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-heading font-bold uppercase tracking-wider">Pipeline Info</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entered Pipeline</span>
                <span>
                  {entry.entered_pipeline_at
                    ? format(new Date(entry.entered_pipeline_at), "dd MMM yyyy")
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stage Updated</span>
                <span>
                  {entry.stage_updated_at
                    ? format(new Date(entry.stage_updated_at), "dd MMM yyyy")
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risk Score</span>
                <RenewalRiskBadge score={entry.risk_score ?? 0} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

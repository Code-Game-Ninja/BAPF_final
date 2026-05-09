"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Briefcase, Plus, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-400",
  processing: "bg-amber-500/10 text-amber-400",
  pending_customer: "bg-orange-500/10 text-orange-400",
  pending_insurer: "bg-purple-500/10 text-purple-400",
  won: "bg-green-500/10 text-green-400",
  done: "bg-emerald-500/10 text-emerald-400",
  lost: "bg-red-500/10 text-red-400",
  rejected: "bg-gray-500/10 text-gray-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-400",
  high: "text-orange-400",
  medium: "text-amber-400",
  low: "text-gray-400",
};

async function fetchCases(customerId: string) {
  const { data, error } = await supabase
    .from("business_cases")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export function CasesTab({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { data: cases, isLoading } = useSWR(
    `cases-${customerId}`,
    () => fetchCases(customerId),
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Business Cases</h3>
          <Badge variant="secondary" className="text-xs">{cases?.length ?? 0}</Badge>
        </div>
        <Button size="sm" variant="outline"
          onClick={() => router.push(`/dashboard/business-cases?customer=${customerId}`)}
          className="gap-2">
          <Plus className="w-4 h-4" /> New Case
        </Button>
      </div>

      {!cases || cases.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Briefcase className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No business cases yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cases.map((c: any) => (
            <button
              key={c.id}
              onClick={() => router.push(`/dashboard/business-cases/${c.id}`)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted/30 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{c.case_number || "—"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.case_type?.replace(/_/g, " ") || "—"}
                  {c.lob && ` · ${c.lob.replace(/_/g, " ")}`}
                  {c.created_at && ` · ${format(new Date(c.created_at), "dd MMM yyyy")}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {c.priority && (
                  <span className={`text-xs font-medium ${PRIORITY_COLORS[c.priority] || ""}`}>
                    {c.priority}
                  </span>
                )}
                <Badge variant="outline" className={`text-xs ${STATUS_COLORS[c.status] || ""}`}>
                  {c.status?.replace(/_/g, " ") || "—"}
                </Badge>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

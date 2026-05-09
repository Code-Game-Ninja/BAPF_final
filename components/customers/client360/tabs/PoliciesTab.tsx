"use client";

import { useRouter } from "next/navigation";
import { FileText, Plus, ExternalLink, RefreshCw } from "lucide-react";
import { usePoliciesByCustomer } from "@/lib/hooks/use-policies";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  expired: "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  archived: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export function PoliciesTab({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { data: policies, isLoading } = usePoliciesByCustomer(customerId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Linked Policies</h3>
          <Badge variant="secondary" className="text-xs">{policies?.length ?? 0}</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/intake?customer=${customerId}`)} className="gap-2">
          <Plus className="w-4 h-4" /> New Policy
        </Button>
      </div>

      {!policies || policies.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No policies linked yet.</p>
          <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/intake?customer=${customerId}`)} className="gap-2 mt-3">
            <Plus className="w-4 h-4" /> Create First Policy
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {policies.map(p => (
            <button
              key={p.id}
              onClick={() => router.push(`/dashboard/policies/${p.id}`)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.policy_number || "—"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.policy_type?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "—"}
                    {p.insurer_name && ` · ${p.insurer_name}`}
                    {p.end_date && ` · Expires ${new Date(p.end_date).toLocaleDateString("en-IN")}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {p.premium_amount && (
                  <span className="text-xs text-muted-foreground">
                    ₹{p.premium_amount.toLocaleString("en-IN")}
                  </span>
                )}
                <Badge variant="outline" className={`text-xs ${STATUS_COLORS[p.status] || ""}`}>
                  {p.status}
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

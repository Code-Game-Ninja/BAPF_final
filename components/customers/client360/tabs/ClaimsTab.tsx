"use client";

import { useRouter } from "next/navigation";
import { Shield, Plus, ExternalLink } from "lucide-react";
import { useClaims } from "@/lib/hooks/use-claims";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  registered: "bg-blue-500/10 text-blue-400",
  under_review: "bg-amber-500/10 text-amber-400",
  approved: "bg-green-500/10 text-green-400",
  settled: "bg-emerald-500/10 text-emerald-400",
  rejected: "bg-red-500/10 text-red-400",
  closed: "bg-gray-500/10 text-gray-400",
};

export function ClaimsTab({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { data: claims, isLoading } = useClaims({ customer_id: customerId } as any);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  const claimList = Array.isArray(claims) ? claims : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Claims</h3>
          <Badge variant="secondary" className="text-xs">{claimList.length}</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/claims?customer=${customerId}`)} className="gap-2">
          <Plus className="w-4 h-4" /> New Claim
        </Button>
      </div>

      {claimList.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Shield className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No claims registered yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {claimList.map((c: any) => (
            <button
              key={c.id}
              onClick={() => router.push(`/dashboard/claims/${c.id}`)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted/30 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{c.claim_number || "—"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.claim_type?.replace(/_/g, " ") || "—"}
                  {c.claim_date && ` · ${new Date(c.claim_date).toLocaleDateString("en-IN")}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {c.claim_amount && (
                  <span className="text-xs text-muted-foreground">₹{c.claim_amount.toLocaleString("en-IN")}</span>
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

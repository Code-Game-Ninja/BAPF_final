"use client";

import { useRouter } from "next/navigation";
import { TrendingUp, AlertTriangle, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { Policy } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { differenceInDays, format } from "date-fns";

interface RenewalRiskTabProps {
  customerId: string;
  policies: Policy[];
}

function getRiskLevel(daysLeft: number): { label: string; color: string; bg: string } {
  if (daysLeft < 0) return { label: "Expired", color: "text-red-400", bg: "bg-red-500/10" };
  if (daysLeft <= 15) return { label: "Critical", color: "text-red-400", bg: "bg-red-500/10" };
  if (daysLeft <= 30) return { label: "High Risk", color: "text-orange-400", bg: "bg-orange-500/10" };
  if (daysLeft <= 60) return { label: "Medium Risk", color: "text-amber-400", bg: "bg-amber-500/10" };
  if (daysLeft <= 90) return { label: "Low Risk", color: "text-yellow-400", bg: "bg-yellow-500/10" };
  return { label: "Safe", color: "text-green-400", bg: "bg-green-500/10" };
}

export function RenewalRiskTab({ customerId, policies }: RenewalRiskTabProps) {
  const router = useRouter();
  const today = new Date();

  // Only active policies with end dates
  const activePolicies = policies
    .filter(p => p.status === "active" && p.end_date)
    .map(p => ({
      ...p,
      daysLeft: differenceInDays(new Date(p.end_date), today),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const expiredCount = policies.filter(p => p.status === "expired" || p.status === "cancelled").length;
  const renewedCount = policies.filter(p => p.status === "active").length;
  const upcomingRenewals = activePolicies.filter(p => p.daysLeft <= 90).length;
  const criticalRenewals = activePolicies.filter(p => p.daysLeft <= 30).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Renewal Risk</h3>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Policies", value: renewedCount, icon: CheckCircle, color: "text-green-400" },
          { label: "Due in 90 Days", value: upcomingRenewals, icon: Clock, color: "text-amber-400" },
          { label: "Critical (≤30d)", value: criticalRenewals, icon: AlertTriangle, color: "text-red-400" },
          { label: "Expired / Cancelled", value: expiredCount, icon: RefreshCw, color: "text-gray-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3">
            <Icon className={`w-4 h-4 ${color} mb-2`} />
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Link to Renewal Cockpit */}
      <div className="flex justify-end">
        <button
          onClick={() => router.push(`/dashboard/renewals?customer=${customerId}`)}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          View in Renewal Cockpit
        </button>
      </div>

      {/* Upcoming renewals list */}
      {activePolicies.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No active policies to track.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading">Upcoming Renewals</p>
          {activePolicies.map(p => {
            const risk = getRiskLevel(p.daysLeft);
            return (
              <button
                key={p.id}
                onClick={() => router.push(`/dashboard/policies/${p.id}`)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.policy_number}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.policy_type?.replace(/_/g, " ")} · {p.insurer_name || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-medium">
                      {p.daysLeft < 0 ? `${Math.abs(p.daysLeft)}d ago` : `${p.daysLeft}d left`}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(new Date(p.end_date), "dd MMM yyyy")}</p>
                  </div>
                  <Badge variant="outline" className={`text-xs ${risk.color} ${risk.bg}`}>
                    {risk.label}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

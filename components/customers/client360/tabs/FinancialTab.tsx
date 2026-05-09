"use client";

import useSWR from "swr";
import { CreditCard, TrendingUp, TrendingDown, IndianRupee, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Policy } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

async function fetchFinancialData(customerId: string) {
  const [premiumsRes, commissionsRes] = await Promise.all([
    supabase
      .from("premiums")
      .select("amount, status, collected_date")
      .eq("customer_id", customerId),
    supabase
      .from("commissions")
      .select("amount, status")
      .in(
        "policy_id",
        (
          await supabase
            .from("policies")
            .select("id")
            .eq("customer_id", customerId)
        ).data?.map((p: any) => p.id) ?? []
      ),
  ]);

  const premiums = premiumsRes.data ?? [];
  const commissions = commissionsRes.data ?? [];

  const totalPremiumPaid = premiums
    .filter((p: any) => p.status === "collected")
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  const outstandingPremium = premiums
    .filter((p: any) => p.status === "pending" || p.status === "overdue")
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  const totalCommission = commissions
    .filter((c: any) => c.status === "paid" || c.status === "approved")
    .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

  return { totalPremiumPaid, outstandingPremium, totalCommission };
}

interface FinancialTabProps {
  customerId: string;
  policies: Policy[];
}

export function FinancialTab({ customerId, policies }: FinancialTabProps) {
  const { data, isLoading } = useSWR(
    `financial-${customerId}`,
    () => fetchFinancialData(customerId),
    { revalidateOnFocus: false }
  );

  const totalSumInsured = policies
    .filter(p => p.status === "active")
    .reduce((sum, p) => sum + (p.sum_insured || 0), 0);

  const totalPremium = policies
    .filter(p => p.status === "active")
    .reduce((sum, p) => sum + (p.premium_amount || 0), 0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    );
  }

  const fmt = (n: number) =>
    n >= 10_00_000
      ? `₹${(n / 10_00_000).toFixed(2)}L`
      : n >= 1_000
      ? `₹${(n / 1_000).toFixed(1)}K`
      : `₹${n.toLocaleString("en-IN")}`;

  const cards = [
    {
      label: "Total Premium Paid",
      value: fmt(data?.totalPremiumPaid ?? 0),
      icon: IndianRupee,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    {
      label: "Outstanding Premium",
      value: fmt(data?.outstandingPremium ?? 0),
      icon: AlertCircle,
      color: data?.outstandingPremium ? "text-red-400" : "text-muted-foreground",
      bg: data?.outstandingPremium ? "bg-red-500/10" : "bg-muted/30",
    },
    {
      label: "Total Commission",
      value: fmt(data?.totalCommission ?? 0),
      icon: TrendingUp,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Active Sum Insured",
      value: fmt(totalSumInsured),
      icon: CreditCard,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      label: "Active Annual Premium",
      value: fmt(totalPremium),
      icon: TrendingDown,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Financial Summary</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading">{label}</p>
            <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {policies.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading mb-3">Policy Breakdown</p>
          <div className="space-y-2">
            {policies.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate max-w-[200px]">
                  {p.policy_number} · {p.policy_type?.replace(/_/g, " ")}
                </span>
                <span className="font-medium">₹{(p.premium_amount || 0).toLocaleString("en-IN")}</span>
              </div>
            ))}
            {policies.length > 5 && (
              <p className="text-xs text-muted-foreground">+{policies.length - 5} more policies</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

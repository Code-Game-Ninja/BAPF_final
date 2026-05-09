"use client";

import { Building2, FileText, Shield } from "lucide-react";
import { Policy } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface InsurerRelationsTabProps {
  policies: Policy[];
}

export function InsurerRelationsTab({ policies }: InsurerRelationsTabProps) {
  // Group policies by insurer
  const insurerMap = new Map<string, { policies: Policy[]; claims: number; tpa?: string }>();

  for (const p of policies) {
    const insurer = p.insurer_name || "Unknown Insurer";
    if (!insurerMap.has(insurer)) {
      insurerMap.set(insurer, { policies: [], claims: 0 });
    }
    insurerMap.get(insurer)!.policies.push(p);
  }

  const insurers = Array.from(insurerMap.entries()).sort((a, b) => b[1].policies.length - a[1].policies.length);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-bold uppercase tracking-wider text-sm">Insurer Relationships</h3>
        <Badge variant="secondary" className="text-xs">{insurers.length}</Badge>
      </div>

      {insurers.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No insurer relationships yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {insurers.map(([insurer, data]) => {
            const activePolicies = data.policies.filter(p => p.status === "active");
            const policyTypes = [...new Set(data.policies.map(p => p.policy_type))];
            const totalPremium = data.policies.reduce((sum, p) => sum + (p.premium_amount || 0), 0);

            return (
              <div key={insurer} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{insurer}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {policyTypes.slice(0, 3).map(t => (
                          <Badge key={t} variant="outline" className="text-xs">
                            {t?.replace(/_/g, " ")}
                          </Badge>
                        ))}
                        {policyTypes.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{policyTypes.length - 3} more</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">Total Premium</p>
                    <p className="text-sm font-bold">₹{totalPremium.toLocaleString("en-IN")}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{data.policies.length}</p>
                    <p className="text-xs text-muted-foreground">Total Policies</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-400">{activePolicies.length}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-muted-foreground">
                      {data.policies.filter(p => p.status === "expired").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Expired</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

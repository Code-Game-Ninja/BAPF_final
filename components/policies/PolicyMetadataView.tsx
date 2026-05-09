"use client";

import { Policy, NomineeDetail } from "@/lib/types";
import { 
  Shield, 
  Car, 
  Heart, 
  User, 
  Building2, 
  Scale, 
  FileCheck, 
  Trophy, 
  Anchor, 
  CreditCard,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ValidityRegistryView } from "./ValidityRegistryView";

interface MetadataViewProps {
  policy: Policy;
}

export function PolicyMetadataView({ policy }: MetadataViewProps) {
  const isMotor = policy.policy_type === "motor";
  const isLife = policy.policy_type === "life";
  const isHealth = policy.policy_type === "health";

  return (
    <div className="space-y-6">
      {/* 1. Product-Specific Depth */}
      {isMotor && policy.motor_meta && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Motor Specifics
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetaField label="Registration" value={policy.motor_meta.registration_number} mono color="text-primary" />
              <MetaField label="Make/Model" value={`${policy.motor_meta.make} / ${policy.motor_meta.model}`} />
              <MetaField label="Variant" value={policy.motor_meta.variant} />
              <MetaField label="Mfg. Date" value={policy.motor_meta.mfg_month_year} />
              <MetaField label="Chassis" value={policy.motor_meta.chassis_number} mono />
              <MetaField label="Engine" value={policy.motor_meta.engine_number} mono />
              <MetaField label="Fuel" value={policy.motor_meta.fuel_type} capitalize />
              <MetaField label="CC" value={policy.motor_meta.cubic_capacity?.toString()} />
            </div>
            
            <Separator className="bg-border/40" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetaField label="IDV (Vehicle)" value={formatCurrency(policy.motor_meta.idv_vehicle)} />
              <MetaField label="NCB %" value={`${policy.motor_meta.ncb_percent}%`} />
              <MetaField label="Net Premium" value={formatCurrency(policy.motor_meta.net_premium)} />
              <MetaField label="GST" value={formatCurrency(policy.motor_meta.gst_amount)} />
            </div>

            {(() => {
              const addonKeys = policy.motor_meta.addons ? 
                Object.entries(policy.motor_meta.addons)
                  .filter(([_, enabled]) => !!enabled)
                  .map(([key]) => key.replace(/_/g, " ").toUpperCase())
                : [];
              
              const hasCovers = addonKeys.length > 0 || !!policy.motor_meta.paid_driver_cover || (policy.motor_meta.employee_liability_count || 0) > 0;
              
              if (!hasCovers) return null;

              return (
                <>
                  <Separator className="bg-border/40" />
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Covers & Endorsements</p>
                    <div className="flex flex-wrap gap-2">
                      {addonKeys.map((addon, i) => (
                        <Badge key={i} variant="outline" className="text-[8px] font-black uppercase tracking-tight border-primary/30 text-primary bg-primary/5">
                          {addon}
                        </Badge>
                      ))}
                      {policy.motor_meta.paid_driver_cover && (
                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tight border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
                          Paid Driver
                        </Badge>
                      )}
                      {(policy.motor_meta.employee_liability_count || 0) > 0 && (
                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tight border-indigo-500/30 text-indigo-500 bg-indigo-500/5">
                          LL to {policy.motor_meta.employee_liability_count} Employees
                        </Badge>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {isMotor && (
        <ValidityRegistryView 
          vehicleNumber={policy.motor_meta?.registration_number || policy.vehicle_number || ""}
          policyId={policy.id}
        />
      )}

      {isLife && policy.life_meta && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" /> Life Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetaField label="Plan Name" value={policy.life_meta.plan_name} />
              <MetaField label="Sum Assured" value={formatCurrency(policy.life_meta.sum_assured)} />
              <MetaField label="Policy Term" value={`${policy.life_meta.policy_term} Years`} />
              <MetaField label="PPT" value={`${policy.life_meta.premium_payment_term} Years`} />
            </div>

            <Separator className="bg-border/40" />

            {policy.life_meta.nominees && policy.life_meta.nominees.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nomination Section</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {policy.life_meta.nominees.map((n, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase">{n.name}</p>
                          <p className="text-[10px] text-muted-foreground font-black uppercase">{n.relationship}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-primary">{n.share_percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2. Financial & Banking Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-500" /> Banking &amp; Payouts
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <MetaField label="Commission %" value={policy.finance_meta?.commission_receivable_percent ? `${policy.finance_meta.commission_receivable_percent}%` : "0%"} />
              <MetaField label="Net Payable" value={formatCurrency(policy.finance_meta?.commission_payable_final || 0)} />
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/40 italic text-[10px] text-muted-foreground">
              Bank details are fetched from the associated Master Agent/Broker profile for automated NEFT clearing.
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-emerald-500" /> System Audit
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <MetaField label="Login Date" value={policy.login_date} />
              <MetaField label="Verification" value={policy.verification_confirmed ? "CERTIFIED" : "PENDING"} />
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase">
              <div className={cn("h-2 w-2 rounded-full", policy.verification_confirmed ? "bg-emerald-500" : "bg-amber-500")} />
              Policy state sync&apos;d with Supabase Registry
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetaField({ label, value, mono, color, capitalize }: { label: string; value?: string | number; mono?: boolean; color?: string; capitalize?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wider mb-1 opacity-70">{label}</p>
      <p className={cn(
        "text-sm font-bold tracking-tight text-foreground/90",
        mono && "font-mono text-xs uppercase",
        capitalize && "capitalize",
        color
      )}>
        {value || "—"}
      </p>
    </div>
  );
}

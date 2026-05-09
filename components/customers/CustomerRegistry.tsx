"use client";

import { Users, Landmark, UserPlus, ShieldPlus, MoreHorizontal, User, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Types for real data
export interface NomineeData {
  name: string;
  relationship: string;
  share?: string;
  isPrimary?: boolean;
  isActive?: boolean;
}

export interface BankDetailsData {
  bankName: string;
  accountNumber?: string;
  ifscCode?: string;
  maskedAccount?: string;
  verificationStatus?: "verified" | "pending" | "failed" | null;
}

export interface ReferrerData {
  name: string;
  type: string;
  leadSource?: string;
}

export interface CustomerRegistryData {
  nominees?: NomineeData[];
  bankDetails?: BankDetailsData;
  referrer?: ReferrerData;
}

interface CustomerRegistryProps {
  data?: CustomerRegistryData;
  loading?: boolean;
}

export function CustomerRegistry({ data, loading }: CustomerRegistryProps) {
  // Default empty state when no data
  const nominees = data?.nominees || [];
  const bankDetails = data?.bankDetails;
  const referrer = data?.referrer;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="rounded-[2rem] border-border/60 bg-card overflow-hidden shadow-sm animate-pulse">
            <CardHeader className="bg-muted/10 py-5 h-14" />
            <CardContent className="p-6 space-y-4">
              <div className="h-16 bg-muted/30 rounded-xl" />
              <div className="h-16 bg-muted/30 rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Nominees Section */}
      <Card className="rounded-[2rem] border-border/60 bg-card overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/10 py-5">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Global Nominees</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full"><Plus className="h-3 w-3" /></Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {nominees.length > 0 ? (
            nominees.map((nominee, index) => (
              <RegistryItem 
                key={index}
                title={nominee.name} 
                subtitle={`${nominee.relationship}${nominee.share ? ` • ${nominee.share}` : ""}`} 
                icon={UserPlus} 
                badge={nominee.isPrimary ? "Primary" : undefined}
                inactive={!nominee.isActive}
              />
            ))
          ) : (
            <div className="text-center py-6 opacity-40">
              <p className="text-[10px] font-black uppercase tracking-widest">No Nominees</p>
              <p className="text-[9px] font-bold mt-1">Add nominees from policy details.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Banking Coordinates */}
      <Card className="rounded-[2rem] border-border/60 bg-card overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/10 py-5">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Landmark className="h-4 w-4 text-amber-500" /> Banking Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {bankDetails ? (
            <>
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Default Disbursement</p>
                <p className="text-sm font-bold tracking-tight">{bankDetails.bankName}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-foreground/70">{bankDetails.maskedAccount || `**** ${bankDetails.accountNumber?.slice(-4) || "----"}`}</p>
                  {bankDetails.ifscCode && (
                    <p className="text-[10px] font-bold text-primary">IFSC: {bankDetails.ifscCode}</p>
                  )}
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground font-medium text-center">
                Verification status: {" "}
                <span className={cn(
                  "font-bold",
                  bankDetails.verificationStatus === "verified" && "text-emerald-500",
                  bankDetails.verificationStatus === "pending" && "text-amber-500",
                  bankDetails.verificationStatus === "failed" && "text-rose-500",
                  !bankDetails.verificationStatus && "text-muted-foreground"
                )}>
                  {bankDetails.verificationStatus === "verified" && "PENNY DROP SUCCESS"}
                  {bankDetails.verificationStatus === "pending" && "PENDING VERIFICATION"}
                  {bankDetails.verificationStatus === "failed" && "VERIFICATION FAILED"}
                  {!bankDetails.verificationStatus && "NOT VERIFIED"}
                </span>
              </p>
            </>
          ) : (
            <div className="text-center py-6 opacity-40">
              <p className="text-[10px] font-black uppercase tracking-widest">No Bank Details</p>
              <p className="text-[9px] font-bold mt-1">Add banking info from policy or life details.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* References & Introducers */}
      <Card className="rounded-[2rem] border-border/60 bg-card overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/10 py-5">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <ShieldPlus className="h-4 w-4 text-indigo-500" /> Referrer Stack
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {referrer ? (
            <>
              <RegistryItem 
                title={referrer.name} 
                subtitle={referrer.type} 
                icon={User} 
                color="text-indigo-500"
              />
              {referrer.leadSource && (
                <div className="mt-4 p-4 rounded-2xl border border-dashed border-border/60 flex flex-col items-center justify-center text-center space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground/50">Lead Source</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-foreground/60">{referrer.leadSource}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 opacity-40">
              <p className="text-[10px] font-black uppercase tracking-widest">No Referrer</p>
              <p className="text-[9px] font-bold mt-1">Add referrer from sales lead info.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RegistryItem({ title, subtitle, icon: Icon = Users, badge, inactive, color = "text-primary" }: any) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/5",
      inactive && "opacity-50 grayscale"
    )}>
       <div className="flex items-center gap-3">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center bg-card shadow-sm border border-border/40", color)}>
             <Icon className="h-4 w-4" />
          </div>
          <div>
             <p className="text-xs font-bold leading-tight">{title}</p>
             <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{subtitle}</p>
          </div>
       </div>
       {badge && (
         <Badge variant="outline" className="h-4 text-[8px] font-black uppercase text-primary border-primary/20 bg-primary/5">
            {badge}
         </Badge>
       )}
       {!badge && <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground/30" />}
    </div>
  );
}

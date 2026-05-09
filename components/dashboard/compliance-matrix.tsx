"use client";

import { motion } from "framer-motion";
import { ShieldAlert, Car, Clock, ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useComplianceMatrix } from "@/lib/hooks/use-dashboard";

export function ComplianceMatrix() {
  const { data: records, isLoading } = useComplianceMatrix();

  if (isLoading) return <div className="h-40 w-full animate-pulse bg-muted/20 rounded-3xl" />;

  return (
    <div className="rounded-[2rem] border border-border bg-card/40 p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          <ShieldAlert className="h-3 w-3" /> Compliance Matrix
        </h4>
        <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">Vehicle Exp</span>
      </div>

      <div className="space-y-3">
        {records?.slice(0, 5).map((record) => {
          const daysToExpiry = Math.ceil((new Date(record.expiry_date).getTime() - new Date().getTime()) / 86400000);
          
          let alertColor = "border-border/50 bg-muted/20";
          let iconColor = "bg-primary/10 text-primary";
          
          if (daysToExpiry <= 7) {
            alertColor = "bg-rose-500/10 border-rose-500/20";
            iconColor = "bg-rose-500/20 text-rose-500";
          } else if (daysToExpiry <= 15) {
            alertColor = "bg-orange-500/10 border-orange-500/20";
            iconColor = "bg-orange-500/20 text-orange-500";
          } else if (daysToExpiry <= 30) {
            alertColor = "bg-amber-500/5 border-amber-500/20";
            iconColor = "bg-amber-500/10 text-amber-500";
          }

          return (
            <div 
              key={record.id} 
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-all hover:scale-[1.01] group",
                alertColor
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                   "h-10 w-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                   iconColor
                )}>
                  {record.document_type.includes('permit') ? <Car className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                </div>
                <div>
                   <p className="text-xs font-black uppercase tracking-tight leading-none mb-1">{record.vehicle_number}</p>
                   <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[9px] font-black uppercase text-muted-foreground/60">{record.document_type.replace(/_/g, ' ')}</span>
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                      <span className="text-[9px] font-black uppercase text-foreground">{format(new Date(record.expiry_date), "dd MMM")}</span>
                   </div>
                </div>
              </div>
              {daysToExpiry <= 7 ? (
                <AlertTriangle className="h-4 w-4 text-rose-500 animate-pulse" />
              ) : (
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-30 group-hover:opacity-100 transition-all" />
              )}
            </div>
          );
        })}

        {(!records || records.length === 0) && (
          <div className="py-10 text-center text-muted-foreground font-bold uppercase tracking-widest text-[10px] border-2 border-dashed border-border/50 rounded-2xl opacity-40">
            No active document expiries
          </div>
        )}
      </div>

      <button className="w-full text-center text-[9px] font-black uppercase tracking-widest text-primary pt-2 hover:underline">
        Launch Compliance Registry
      </button>
    </div>
  );
}

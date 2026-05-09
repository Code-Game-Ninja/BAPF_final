"use client";

import { useEffect, useState } from "react";
import { 
  FileCheck, 
  AlertTriangle, 
  Calendar, 
  ShieldAlert, 
  Plus,
  RefreshCw
} from "lucide-react";
import { ValidityRegistry } from "@/lib/types";
import { validityService } from "@/lib/services/validity.service";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ValidityRegistryProps {
  vehicleNumber: string;
  policyId: string;
}

const DOC_TYPES: Record<string, string> = {
  permit_state: "State Permit",
  permit_national: "National Permit",
  fitness: "Fitness Certificate",
  puc: "PUC / Emission",
  rc: "RC Validity",
  tax_state: "State Tax",
  tax_national: "National Tax"
};

export function ValidityRegistryView({ vehicleNumber, policyId }: ValidityRegistryProps) {
  const [data, setData] = useState<ValidityRegistry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    if (!vehicleNumber) return;
    setIsLoading(true);
    try {
      const records = await validityService.getByVehicle(vehicleNumber);
      setData(records);
    } catch (err) {
      console.error("Failed to load validity records", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [vehicleNumber]);

  if (!vehicleNumber) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5 text-primary" />
          Vehicle Compliance Registry
        </h4>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-[9px] font-bold uppercase tracking-wider px-2"
          onClick={() => toast.info("Validity update wizard coming in Phase 4")}
        >
          <RefreshCw className="h-3 w-3 mr-1" /> Force Sync
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))
        ) : data.length > 0 ? (
          data.map((record) => (
            <ValidityCard key={record.id} record={record} />
          ))
        ) : (
          <div className="sm:col-span-3 p-8 rounded-2xl border border-dashed border-border/60 flex flex-col items-center justify-center text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-muted-foreground opacity-20" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-tight">
              No compliance records found <br />
              <span className="opacity-50">Syncing with RTO Dashboard...</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ValidityCard({ record }: { record: ValidityRegistry }) {
  const isExpired = new Date(record.expiry_date) < new Date();
  const isExpiringSoon = !isExpired && 
    (new Date(record.expiry_date).getTime() - Date.now()) < (30 * 24 * 60 * 60 * 1000);

  return (
    <div className={cn(
      "relative p-4 rounded-2xl border transition-all duration-300",
      isExpired 
        ? "bg-rose-500/5 border-rose-500/30 shadow-sm" 
        : isExpiringSoon 
          ? "bg-amber-500/5 border-amber-500/30" 
          : "bg-muted/20 border-border/60 hover:border-primary/30"
    )}>
      <div className="flex items-center justify-between mb-3">
        <Badge variant="outline" className={cn(
          "text-[8px] font-black uppercase px-1.5 py-0 h-4 border",
          isExpired 
            ? "border-rose-500 text-rose-500 bg-rose-500/10" 
            : isExpiringSoon 
              ? "border-amber-500 text-amber-500 bg-amber-500/10" 
              : "border-emerald-500 text-emerald-500 bg-emerald-500/10"
        )}>
          {isExpired ? "EXPIRED" : isExpiringSoon ? "EXPIRING" : "VALID"}
        </Badge>
        <span className="text-[10px] font-black font-mono opacity-40 uppercase tracking-tighter">
          {record.vehicle_number}
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-black tracking-tight text-foreground/90">
          {DOC_TYPES[record.document_type] || record.document_type}
        </p>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span className="text-[10px] font-bold uppercase tabular-nums">
            {format(new Date(record.expiry_date), "dd MMM yyyy")}
          </span>
        </div>
      </div>

      {isExpired && (
        <div className="absolute top-2 right-2">
          <AlertTriangle className="h-4 w-4 text-rose-500 animate-pulse" />
        </div>
      )}
    </div>
  );
}

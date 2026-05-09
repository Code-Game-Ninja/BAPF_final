"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hoverLift, staggerContainer, staggerItem } from "@/lib/helpers/animations";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RenewalItem {
  id: string;
  customer_name?: string;
  policy_number?: string;
  due_date?: string | null;
  policy_type?: string;
  premium_amount?: number;
}

interface UpcomingRenewalsWidgetProps {
  upcoming: RenewalItem[] | undefined;
}

export function UpcomingRenewalsWidget({ upcoming }: UpcomingRenewalsWidgetProps) {
  const [days, setDays] = useState("30");

  const filteredUpcoming = useMemo(() => {
    if (!upcoming) return [];
    const now = new Date();
    const limit = new Date();
    limit.setDate(now.getDate() + parseInt(days));
    return upcoming.filter(r => r.due_date && new Date(r.due_date) <= limit);
  }, [upcoming, days]);

  return (
    <Card className="border border-border/70 bg-card/40 backdrop-blur-md shadow-sm overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/40">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
               <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold tracking-tight">Renewal Intelligence</CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Forecast Insight</p>
            </div>
          </div>
          
          <Tabs defaultValue="30" className="w-auto" onValueChange={setDays}>
            <TabsList className="bg-background/50 h-8 p-1 rounded-lg">
              <TabsTrigger value="7" className="text-[10px] h-6 px-3 rounded-md font-bold uppercase tracking-tighter">7D</TabsTrigger>
              <TabsTrigger value="15" className="text-[10px] h-6 px-3 rounded-md font-bold uppercase tracking-tighter">15D</TabsTrigger>
              <TabsTrigger value="30" className="text-[10px] h-6 px-3 rounded-md font-bold uppercase tracking-tighter">30D</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredUpcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 opacity-40">
             <CalendarDays className="h-10 w-10 mb-2 stroke-1" />
             <p className="text-xs font-bold uppercase tracking-tighter">No renewals in next {days} days</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredUpcoming.slice(0, 6).map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/renewals/${r.id}`}
                className="group flex items-center justify-between px-6 py-4 transition-all hover:bg-primary/5 border-l-2 border-transparent hover:border-primary active:bg-primary/10"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="hidden sm:flex h-10 w-10 rounded-xl bg-background/80 border border-border/50 items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    <span className="text-[10px] font-black text-primary">{r.policy_type?.substring(0,2).toUpperCase() || "POL"}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                       <p className="truncate text-sm font-bold text-foreground">
                        {r.customer_name || "Unknown Business"}
                      </p>
                       <span className="text-[9px] font-black text-primary/60 border border-primary/20 px-1 rounded-sm bg-primary/5 uppercase">{r.policy_type || "General"}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono tracking-tighter">
                      PRM: ₹{r.premium_amount?.toLocaleString() || "TBC"} • {r.policy_number || "PENDING_ID"}
                    </p>
                  </div>
                </div>
                <div className="ml-4 shrink-0 text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Expires</p>
                  <p className="text-xs font-bold text-orange-600 dark:text-orange-400">
                    {r.due_date ? new Date(r.due_date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    }) : "—"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
        {filteredUpcoming.length > 0 && (
          <Link href="/dashboard/renewals" className="block border-t border-border/40 bg-background/20 p-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors">
            View Holistic Renewal Pipeline <ArrowRight className="inline-block h-3 w-3 ml-1" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

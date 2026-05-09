"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { CalendarClock, AlertTriangle, ChevronRight } from "lucide-react";

import { useAuth } from "@/lib/context/auth-context";
import { useTodayFollowUps, useOverdueFollowUps } from "@/lib/hooks/use-leads";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { hoverLift, staggerContainer, staggerItem } from "@/lib/helpers/animations";

export function LeadFollowUpWidget() {
  const router = useRouter();
  const { user, role } = useAuth();
  const userId = role === "employee" ? user?.id : undefined;
  const { data: todayFollowUps, isLoading: todayLoading } = useTodayFollowUps(userId);
  const { data: overdueFollowUps, isLoading: overdueLoading } = useOverdueFollowUps(userId);

  const isLoading = todayLoading || overdueLoading;
  const todayCount = todayFollowUps?.length ?? 0;
  const overdueCount = overdueFollowUps?.length ?? 0;

  if (isLoading) {
    return (
      <Card className="border border-border/70 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (todayCount === 0 && overdueCount === 0) return null;

  return (
    <Card className="border border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-2 space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            <CalendarClock className="h-4 w-4 text-primary" />
            Lead Follow-Ups
          </CardTitle>
          <Badge variant="outline" className="border-border-strong bg-background/70 text-[10px] text-muted-foreground">
            {todayCount + overdueCount} total
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
        {overdueCount > 0 && (
          <motion.div variants={staggerItem} {...hoverLift}>
            <button
              onClick={() => router.push("/dashboard/sales-leads")}
              className="w-full rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2.5 text-left transition-colors hover:bg-orange-500/15"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-orange-700 dark:text-orange-300" />
                  <div>
                    <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                      {overdueCount} Overdue
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {overdueFollowUps?.slice(0, 2).map((l) => l.customer_name).join(", ")}
                      {overdueCount > 2 ? ` +${overdueCount - 2} more` : ""}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-orange-700 dark:text-orange-300" />
              </div>
            </button>
          </motion.div>
        )}

        {todayCount > 0 && (
          <motion.div variants={staggerItem} {...hoverLift}>
            <button
              onClick={() => router.push("/dashboard/sales-leads")}
              className="w-full rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-left transition-colors hover:bg-amber-500/15"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                  <div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                      {todayCount} Due Today
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {todayFollowUps?.slice(0, 2).map((l) => l.customer_name).join(", ")}
                      {todayCount > 2 ? ` +${todayCount - 2} more` : ""}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
              </div>
            </button>
          </motion.div>
        )}
        </motion.div>
      </CardContent>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  TrendingUp,
  XCircle,
  CheckCircle2,
  Clock,
  Activity,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { hoverLift, staggerContainer, staggerItem } from "@/lib/helpers/animations";

interface ActivityItem {
  id: string;
  icon: string;
  title: string;
  description: string | null;
  timestamp: Date;
}

interface RecentActivityFeedProps {
  activity: ActivityItem[] | undefined;
  loading: boolean;
}

export function RecentActivityFeed({ activity, loading }: RecentActivityFeedProps) {
  return (
    <Card className="lg:col-span-2 border border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Operations Timeline
            </p>
            <CardTitle className="mt-1 text-base font-semibold tracking-tight text-foreground">
              Recent Activity
            </CardTitle>
          </div>
          <Link href="/dashboard/audit-logs">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg border border-border/70 bg-background/70 px-3 text-xs text-muted-foreground hover:bg-background hover:text-foreground"
            >
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                <Skeleton className="h-8 w-8 rounded-xl bg-skeleton" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4 bg-skeleton" />
                  <Skeleton className="h-3 w-1/2 bg-skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : !activity || activity.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 mx-auto text-skeleton mb-2" />
            <p className="text-muted-foreground text-sm">
              Activity feed will populate as you use the system
            </p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-1.5">
            {activity.map((item) => (
              <motion.div
                key={item.id}
                variants={staggerItem}
                {...hoverLift}
                className="group flex items-start gap-3 rounded-xl border border-transparent bg-background/45 px-2.5 py-2.5 transition-colors hover:border-border/80 hover:bg-background/80"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card shadow-sm">
                  <ActivityIcon type={item.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.description || "No additional details"}
                  </p>
                </div>
                <span className="mt-0.5 shrink-0 rounded-md border border-border/60 bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {formatTimeAgo(item.timestamp)}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Activity Icon ----

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "plus":
      return <Plus className="h-3.5 w-3.5 text-green-400" />;
    case "pencil":
      return <TrendingUp className="h-3.5 w-3.5 text-blue-400" />;
    case "trash":
      return <XCircle className="h-3.5 w-3.5 text-red-400" />;
    case "login":
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />;
    case "logout":
      return <Clock className="h-3.5 w-3.5 text-amber-400" />;
    default:
      return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

// ---- Time Ago Helper ----

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

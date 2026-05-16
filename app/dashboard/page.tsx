"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/lib/context/auth-context";
import { useAppSettings } from "@/lib/context/app-settings-context";
import {
  useDashboardStats,
  useRecentActivity,
  useUpcomingRenewals,
  useOverdueItems,
} from "@/lib/hooks/use-dashboard";
import { 
  AlertCircle, 
  ArrowRight, 
  Calendar, 
  Clock, 
  Zap, 
  Plus,
  ArrowUpRight,
  ClipboardCheck,
  LifeBuoy,
  FileBox,
  DollarSign,
  TrendingUp,
  MessageCircle
} from "lucide-react";
import { formatCurrency, cn } from "../../lib/utils/index";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { StatCardGrid } from "@/components/dashboard/stat-card-grid";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { UpcomingRenewalsWidget } from "@/components/dashboard/upcoming-renewals-widget";
import { OverdueAlerts } from "@/components/dashboard/overdue-alerts";
import { AttendanceWidget } from "@/components/dashboard/attendance-widget";
import { LeadFollowUpWidget } from "@/components/dashboard/follow-up-widget";
import { ComplianceMatrix } from "@/components/dashboard/compliance-matrix";
import { CelebrationRegistry } from "@/components/dashboard/celebration-registry";
import { pageTransition, staggerContainer, staggerItem } from "@/lib/helpers/animations";
import { format } from "date-fns";

export default function DashboardPage() {
  const { user: dbUser } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activity, isLoading: activityLoading } = useRecentActivity(15);
  const { data: upcoming } = useUpcomingRenewals();
  const { data: overdue } = useOverdueItems();
  
  const overdueCount = (stats?.overdueRenewals || 0) + (stats?.premiumOverdue || 0) + (stats?.pendingClaims || 0);

  return (
    <motion.div
      className="max-w-[1600px] mx-auto space-y-10 pb-20"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      {/* 1. COMMAND HEADER & GLOBAL FILTERS */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between px-2">
        <motion.div variants={staggerItem}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/80">Operational Intelligence • Live</p>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground font-heading leading-tight">
            Workday <span className="text-primary italic opacity-90">Command</span>
          </h1>
          <div className="flex items-center gap-3 mt-1">
             <Clock className="h-3 w-3 text-muted-foreground/40" />
             <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">{format(new Date(), "eeee, dd MMMM HH:mm")}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Welcome back, <span className="font-bold text-foreground underline decoration-primary/40 underline-offset-4">{dbUser?.name || "Officer"}</span>. The system identifies <span className="text-foreground font-black px-1.5 py-0.5 rounded bg-primary/10">{overdueCount} high-priority tasks</span> for your shift.
          </p>
        </motion.div>

        <motion.div variants={staggerItem} className="flex items-center gap-4">
          <div className="hidden md:flex items-center bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-1.5 shadow-2xl">
            {["Today", "7 Days", "30 Days"].map((tab) => (
              <button key={tab} className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all",
                tab === "Today" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}>
                {tab}
              </button>
            ))}
          </div>
          
          <Link href="/dashboard/intake">
            <Button size="lg" className="h-16 px-10 rounded-[1.75rem] shadow-2xl shadow-primary/30 hover:shadow-primary/40 transition-all hover:scale-[1.03] active:scale-[0.97] border-b-4 border-primary-foreground/20">
              <Plus className="mr-3 h-6 w-6 stroke-[3]" />
              <span className="font-black uppercase tracking-widest text-[11px]">New Intake</span>
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* 2. KPI STRIP (TOP PRIORITY ROW) */}
      <motion.div variants={staggerItem} className="px-2">
        <StatCardGrid stats={stats} loading={statsLoading} />
      </motion.div>

      {/* 3. PRIMARY ACTION ZONE (ACTION REQUIRED) */}
      <motion.section variants={staggerItem} className="space-y-6 px-2">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
           <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                 <AlertCircle className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground uppercase">Action Required</h2>
                <p className="text-[10px] text-muted-foreground font-black tracking-widest uppercase opacity-70">Focus Matrix • Immediate Response</p>
              </div>
           </div>
           <Link href="/dashboard/service-desk" className="p-2.5 rounded-xl bg-card/40 border border-border/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
              Deep Audit <ArrowRight className="h-3 w-3" />
           </Link>
        </div>
        
        <OverdueAlerts overdue={overdue} stats={stats} />
      </motion.section>

      {/* 4. SECONDARY OPERATIONAL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-2">
        {/* Left Focus: Intelligence & Timeline */}
        <div className="lg:col-span-8 space-y-8">
           <UpcomingRenewalsWidget upcoming={upcoming} />
           <RecentActivityFeed activity={activity} loading={activityLoading} />
        </div>

        {/* Right Focus: Compliance & Growth */}
        <div className="lg:col-span-4 space-y-8">
           <GrowthPipelineWidget stats={stats} />
           <ComplianceMatrix />
           <CelebrationRegistry />
           <AttendanceWidget hideHeader />
           
           {/* New Finance Alert Widget Placeholder */}
           <div className="rounded-[2.5rem] border-2 border-dashed border-border/40 p-10 flex flex-col items-center justify-center text-center group hover:border-primary/40 transition-all cursor-pointer bg-card/10">
              <DollarSign className="h-10 w-10 text-muted-foreground/30 mb-4 group-hover:text-primary/50 group-hover:scale-110 transition-all" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Financial Alerts</p>
              <p className="text-[10px] text-muted-foreground/40 font-medium">Reconciliation & Unpaid reconciliation pending</p>
           </div>
        </div>
      </div>

      {/* 5. FOOTER QUICK ACCESS */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-3 gap-6 px-2 pt-10 border-t border-border/20">
        {[
          { label: "SOP Library", icon: ClipboardCheck, href: "/dashboard/sop", desc: "Internal Process Manuals", color: "blue" },
          { label: "Service Desk", icon: LifeBuoy, href: "/dashboard/service-desk", desc: "Claims & Support Request", color: "purple" },
          { label: "Knowledge Base", icon: FileBox, href: "/dashboard/documents", desc: "Digital Document Repository", color: "amber" },
        ].map((action) => (
          <Link key={action.label} href={action.href}>
            <div className="group flex items-center justify-between p-6 rounded-[2rem] border border-border/60 bg-card/30 backdrop-blur-md hover:bg-card hover:border-primary/40 transition-all cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <action.icon className="h-16 w-16" />
              </div>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-14 w-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl",
                  action.color === "blue" ? "bg-blue-500/10 text-blue-500 shadow-blue-500/10" :
                  action.color === "purple" ? "bg-purple-500/10 text-purple-500 shadow-purple-500/10" :
                  "bg-amber-500/10 text-amber-500 shadow-amber-500/10"
                )}>
                  <action.icon className="h-7 w-7 stroke-[2.5]" />
                </div>
                <div>
                  <span className="block text-[13px] font-black uppercase tracking-[0.1em]">{action.label}</span>
                  <span className="block text-[10px] text-muted-foreground font-medium">{action.desc}</span>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
          </Link>
        ))}
      </motion.div>
    </motion.div>
  );
}

function GrowthPipelineWidget({ stats }: { stats: any }) {
  return (
    <div className="rounded-[2.5rem] border border-border/70 bg-card/40 backdrop-blur-md p-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
         <TrendingUp className="h-20 w-20" />
      </div>
      <h4 className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80 mb-6">
        <TrendingUp className="h-4 w-4 text-emerald-500" /> Growth Pipeline
      </h4>
      <LeadFollowUpWidget />
    </div>
  );
}
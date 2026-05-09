"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { differenceInDays, format } from "date-fns";
import {
  Shield, CheckCircle2, Clock, AlertTriangle, XCircle, Filter, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { pageTransition } from "@/lib/helpers/animations";
import { useAuth } from "@/lib/context/auth-context";
import { ComplianceItemForm } from "@/components/compliance/ComplianceItemForm";
import { RegulatoryCalendar } from "@/components/compliance/RegulatoryCalendar";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  license_renewal: "License Renewal",
  regulatory_filing: "Regulatory Filing",
  audit_submission: "Audit Submission",
  training_certification: "Training/Certification",
  policy_review: "Policy Review",
  other: "Other",
};

function getUrgencyColor(dueDate: string, status: string): string {
  if (status === "completed") return "text-green-400";
  const days = differenceInDays(new Date(dueDate), new Date());
  if (days < 0) return "text-red-400";
  if (days <= 7) return "text-orange-400";
  if (days <= 30) return "text-yellow-400";
  return "text-green-400";
}

async function fetcher(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function CompliancePage() {
  const router = useRouter();
  const { session, role } = useAuth();
  const token = session?.access_token ?? "";

  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (categoryFilter !== "all") params.set("category", categoryFilter);
  params.set("limit", "100");

  const { data, isLoading, mutate } = useSWR(
    token ? [`/api/compliance?${params}`, token] : null,
    ([url, t]) => fetcher(url, t),
    { revalidateOnFocus: false }
  );

  const { data: calendarData } = useSWR(
    token ? [`/api/compliance/calendar`, token] : null,
    ([url, t]) => fetcher(url, t),
    { revalidateOnFocus: false }
  );

  const items = data?.data ?? [];
  const calendarItems = calendarData?.items ?? [];

  // Metrics
  const total = items.length;
  const completed = items.filter((i: any) => i.status === "completed").length;
  const inProgress = items.filter((i: any) => i.status === "in_progress").length;
  const pending = items.filter((i: any) => i.status === "pending").length;
  const overdue = items.filter((i: any) => i.status === "overdue" || (i.status !== "completed" && differenceInDays(new Date(i.due_date), new Date()) < 0)).length;

  const metrics = [
    { label: "Total", value: total, color: "text-foreground", icon: Shield },
    { label: "Completed", value: completed, color: "text-green-400", icon: CheckCircle2 },
    { label: "In Progress", value: inProgress, color: "text-blue-400", icon: Clock },
    { label: "Pending", value: pending, color: "text-amber-400", icon: Clock },
    { label: "Overdue", value: overdue, color: "text-red-400", icon: AlertTriangle },
  ];

  // Group by category
  const grouped: Record<string, any[]> = {};
  for (const item of items) {
    const cat = item.category ?? "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  return (
    <motion.div {...pageTransition} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            IRDA Compliance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track regulatory requirements and deadlines
          </p>
        </div>
        {(role === "admin" || role === "manager") && (
          <ComplianceItemForm onCreated={() => mutate()} />
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {metrics.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <p className="text-xs text-muted-foreground font-heading uppercase tracking-wider">{label}</p>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-heading font-bold uppercase tracking-wider">
            Regulatory Calendar
          </h2>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                const d = new Date(calendarMonth);
                d.setMonth(d.getMonth() - 1);
                setCalendarMonth(d);
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                const d = new Date(calendarMonth);
                d.setMonth(d.getMonth() + 1);
                setCalendarMonth(d);
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <RegulatoryCalendar
          items={calendarItems}
          currentMonth={calendarMonth}
          onItemClick={(item) => router.push(`/dashboard/compliance/${item.id}`)}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Checklist grouped by category */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-card border border-border rounded-xl">
          <Shield className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No compliance items found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20">
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider">
                  {CATEGORY_LABELS[category] ?? category} ({categoryItems.length})
                </h3>
              </div>
              <div className="divide-y divide-border/50">
                {categoryItems.map((item: any) => {
                  const daysUntil = differenceInDays(new Date(item.due_date), new Date());
                  const urgencyColor = getUrgencyColor(item.due_date, item.status);

                  return (
                    <button
                      key={item.id}
                      onClick={() => router.push(`/dashboard/compliance/${item.id}`)}
                      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.assigned_to_name ?? "Unassigned"} · {item.recurrence?.replace(/_/g, " ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className={`text-xs font-medium ${urgencyColor}`}>
                            {daysUntil < 0
                              ? `${Math.abs(daysUntil)}d overdue`
                              : daysUntil === 0
                              ? "Today"
                              : `${daysUntil}d left`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(item.due_date), "dd MMM yyyy")}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${STATUS_COLORS[item.status] ?? ""}`}
                        >
                          {item.status?.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

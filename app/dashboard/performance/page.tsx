"use client";

import { TrendingUp, Users, Award, Target, RefreshCw } from "lucide-react";
import { useEmployeePerformance, usePersistencyRatio, useMonthlyBusinessAnalytics } from "@/lib/hooks/use-performance";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";
import { Sparkles } from "lucide-react";

export default function PerformancePage() {
  const { data: employees, isLoading: empLoading } = useEmployeePerformance();
  const { data: persistency, isLoading: perLoading } = usePersistencyRatio();
  const { data: monthly, isLoading: monthLoading } = useMonthlyBusinessAnalytics();
  const recentMonthly = monthly?.slice(-12) || [];
  const maxRevenue = recentMonthly.length > 0 ? Math.max(...recentMonthly.map((x) => x.revenue)) : 0;

  return (
    <motion.div className="mx-auto max-w-7xl space-y-6" {...pageTransition}>
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Analytics cockpit
          </div>
          <h1 className="text-2xl font-bold text-foreground font-heading uppercase tracking-[0.16em] sm:text-3xl">
            Performance Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Employee metrics, persistency intelligence, and monthly business momentum in one command view.
          </p>
        </div>
      </section>

      {/* Top stats */}
      {persistency && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            {
              icon: RefreshCw,
              label: "Persistency Ratio",
              value: `${persistency.ratio}%`,
              panel: "border-blue-500/30 bg-blue-500/10",
              text: "text-blue-700 dark:text-blue-300",
            },
            {
              icon: TrendingUp,
              label: "Renewed",
              value: persistency.renewed,
              panel: "border-emerald-500/30 bg-emerald-500/10",
              text: "text-emerald-700 dark:text-emerald-300",
            },
            {
              icon: Target,
              label: "Lost",
              value: persistency.lost,
              panel: "border-red-500/30 bg-red-500/10",
              text: "text-red-700 dark:text-red-300",
            },
            {
              icon: Users,
              label: "Total Employees",
              value: employees?.length ?? 0,
              panel: "border-indigo-500/30 bg-indigo-500/10",
              text: "text-indigo-700 dark:text-indigo-300",
            },
          ].map((item) => (
            <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
              <Card className={item.panel}>
                <CardContent className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className={`mt-1 text-xl font-semibold tracking-tight ${item.text}`}>{item.value}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-card px-2 py-1 shadow-inner">
                      <item.icon className={`h-4 w-4 ${item.text}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3 border border-border/80 bg-card/80 p-1">
          <TabsTrigger value="employees">Employee Performance</TabsTrigger>
          <TabsTrigger value="persistency">Persistency Ratio</TabsTrigger>
          <TabsTrigger value="business">Monthly Business</TabsTrigger>
        </TabsList>

        {/* Employee Performance */}
        <TabsContent value="employees" className="mt-4">
          {empLoading ? (
            <div className="space-y-3 rounded-2xl border border-border-strong/70 bg-card/90 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : !employees?.length ? (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-border-strong/70 bg-card/80 py-16"><p className="text-muted-foreground text-sm">No employee data.</p></div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_12px_28px_rgba(47,62,64,0.06)]">
              <Table>
                <TableHeader><TableRow className="border-border/80 bg-muted/20">
                  <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Employee</TableHead>
                  <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Designation</TableHead>
                  <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Policies</TableHead>
                  <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Premium</TableHead>
                  <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Leads</TableHead>
                  <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Conversion</TableHead>
                  <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Renewals</TableHead>
                  <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Commission</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {employees.map((emp, idx) => (
                    <TableRow key={emp.user_id} className={idx === 0 ? "border-border/70 bg-primary/5 hover:bg-primary/10" : "border-border/70 hover:bg-muted/35"}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {idx < 3 && <Award className={`w-4 h-4 ${idx === 0 ? "text-amber-400" : idx === 1 ? "text-gray-300" : "text-amber-700"}`} />}
                        {emp.user_name}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize text-xs">{emp.designation}</Badge></TableCell>
                      <TableCell className="text-right">{emp.policiesSold}</TableCell>
                      <TableCell className="text-right text-primary">{formatCurrency(emp.totalPremium)}</TableCell>
                      <TableCell className="text-right">{emp.leadsAssigned}</TableCell>
                      <TableCell className="text-right">
                        <span className={emp.conversionRate >= 50 ? "text-green-400" : emp.conversionRate >= 25 ? "text-amber-400" : "text-red-400"}>
                          {emp.conversionRate}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{emp.renewalRate}%</TableCell>
                      <TableCell className="text-right text-green-400">{formatCurrency(emp.commissionEarned)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Persistency Ratio */}
        <TabsContent value="persistency" className="mt-4">
          {perLoading ? (
            <div className="space-y-3 rounded-2xl border border-border-strong/70 bg-card/90 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
          ) : persistency ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border-strong/70 bg-card/95 p-6 shadow-[0_12px_28px_rgba(47,62,64,0.06)]">
                <h3 className="mb-4 text-lg font-bold text-foreground font-heading">Overall Persistency</h3>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-primary">{persistency.ratio}%</div>
                  <div className="flex-1">
                    <Progress value={persistency.ratio} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{persistency.renewed} renewed</span>
                      <span>{persistency.total} total</span>
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-foreground font-heading">By Insurer</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {persistency.byInsurer.map(ins => (
                  <div key={ins.name} className="rounded-xl border border-border-strong/70 bg-card/95 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-foreground text-sm">{ins.name}</h4>
                      <span className={`text-sm font-bold ${ins.ratio >= 70 ? "text-green-400" : ins.ratio >= 50 ? "text-amber-400" : "text-red-400"}`}>{ins.ratio}%</span>
                    </div>
                    <Progress value={ins.ratio} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{ins.renewed}/{ins.total} renewed</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </TabsContent>

        {/* Monthly Business */}
        <TabsContent value="business" className="mt-4">
          {monthLoading ? (
            <div className="space-y-3 rounded-2xl border border-border-strong/70 bg-card/90 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : !monthly?.length ? (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-border-strong/70 bg-card/80 py-16"><p className="text-muted-foreground text-sm">No business data.</p></div>
          ) : (
            <div className="space-y-4">
              {/* Visual bar chart */}
              <div className="rounded-2xl border border-border-strong/70 bg-card/95 p-6 shadow-[0_12px_28px_rgba(47,62,64,0.06)]">
                <h3 className="mb-4 font-bold text-foreground font-heading">Revenue by Month</h3>
                <div className="flex items-end gap-2 h-48">
                  {recentMonthly.map((m) => {
                    const height = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">{formatCurrency(m.revenue)}</span>
                        <div className="w-full bg-primary/20 rounded-t" style={{ height: `${Math.max(height, 2)}%` }}>
                          <div className="w-full h-full bg-primary rounded-t opacity-80"></div>
                        </div>
                        <span className="text-xs text-muted-foreground">{m.month.substring(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Table view */}
              <div className="overflow-hidden rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_12px_28px_rgba(47,62,64,0.06)]">
                <Table>
                  <TableHeader><TableRow className="border-border/80 bg-muted/20">
                    <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Month</TableHead>
                    <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Fresh</TableHead>
                    <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Renewals</TableHead>
                    <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Total Policies</TableHead>
                    <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Revenue</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {recentMonthly.slice().reverse().map(m => (
                      <TableRow key={m.month} className="border-border/70 hover:bg-muted/35">
                        <TableCell className="font-medium">{m.month}</TableCell>
                        <TableCell className="text-right text-blue-400">{m.fresh}</TableCell>
                        <TableCell className="text-right text-green-400">{m.renewal}</TableCell>
                        <TableCell className="text-right">{m.count}</TableCell>
                        <TableCell className="text-right text-primary font-medium">{formatCurrency(m.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

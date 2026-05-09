"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/context/auth-context";
import { useAppSettings } from "@/lib/context/app-settings-context";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useExecutiveSummary,
  usePolicyTypeBreakdown,
  usePolicyStatusBreakdown,
  useMonthlyPoliciesCreated,
  useTopInsurers,
  usePolicyFinancials,
  useMonthlyPremiumCollection,
  usePremiumCollectionRate,
  useRenewalBreakdown,
  useMonthlyRenewals,
  useRenewalConversionRate,
  useMonthlyCustomerGrowth,
  useAttendanceOverview,
} from "@/lib/hooks/use-reports";
import {
  PolicyTypePieChart,
  PolicyStatusPieChart,
  MonthlyPoliciesChart,
  PremiumCollectionChart,
  RenewalTrendChart,
  CustomerGrowthChart,
  TopInsurersChart,
  RenewalStatusPieChart,
} from "@/components/reports/report-charts-lazy";
import {
  exportToExcel,
  REPORT_EXPORTS,
} from "@/lib/helpers/export-report";
import {
  FileText,
  DollarSign,
  CalendarClock,
  Users,
  Clock,
  TrendingUp,
  Download,
  Loader2,
  Target,
  Percent,
  Shield,
  Sparkles,
} from "lucide-react";
import { hoverLift, pageTransition, staggerContainer, staggerItem } from "@/lib/helpers/animations";

const REPORT_TABS = [
  { value: "policies", label: "Policies", icon: FileText },
  { value: "premiums", label: "Premiums", icon: DollarSign },
  { value: "renewals", label: "Renewals", icon: CalendarClock },
  { value: "customers", label: "Customers", icon: Users },
  { value: "attendance", label: "Attendance", icon: Clock },
];

export default function ReportsPage() {
  const { user: dbUser } = useAuth();
  const { settings } = useAppSettings();
  const isAdminOrManager =
    dbUser?.role === "admin" || dbUser?.role === "manager";

  // ---- State (must be before any early return to satisfy Rules of Hooks) ----
  const now = new Date();
  const [attYear, setAttYear] = useState(now.getFullYear());
  const [attMonth, setAttMonth] = useState(now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState("policies");

  // Executive summary
  const { data: exec, isLoading: execLoading } = useExecutiveSummary();

  // Policy
  const { data: policyTypes, isLoading: ptLoading } = usePolicyTypeBreakdown();
  const { data: policyStatus, isLoading: psLoading } = usePolicyStatusBreakdown();
  const { data: monthlyPolicies, isLoading: mpLoading } = useMonthlyPoliciesCreated();
  const { data: topInsurers, isLoading: tiLoading } = useTopInsurers();
  const { data: policyFinancials } = usePolicyFinancials();

  // Premium
  const { data: premiumCollection, isLoading: pcLoading } = useMonthlyPremiumCollection();
  const { data: premiumRate } = usePremiumCollectionRate();

  // Renewal
  const { data: renewalBreakdown, isLoading: rbLoading } = useRenewalBreakdown();
  const { data: monthlyRenewals, isLoading: mrLoading } = useMonthlyRenewals();
  const { data: renewalRate } = useRenewalConversionRate();

  // Customer
  const { data: customerGrowth, isLoading: cgLoading } = useMonthlyCustomerGrowth();

  // Attendance
  const { data: attOverview } = useAttendanceOverview(attYear, attMonth);

  // ---- Role guard (after all hooks) ----
  if (!isAdminOrManager) {
    return (
      <div className="py-20 text-center">
        <Shield className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Admin or Manager access required</p>
      </div>
    );
  }

  if (!dbUser) return null;

  const inr = (n: number) => formatCurrency(n);

  // Compute current financial year label from settings
  const fyLabel = (() => {
    const raw = settings.financial_year_start || "01-01"; // MM-DD
    const [mm, dd] = raw.split("-").map(Number);
    const fyMonth = (mm >= 1 && mm <= 12) ? mm : 1;
    const today = new Date();
    const startYear = today.getMonth() + 1 >= fyMonth ? today.getFullYear() : today.getFullYear() - 1;
    const endYear = startYear + 1;
    const monthName = new Date(startYear, fyMonth - 1).toLocaleString("en-US", { month: "short" });
    return `FY ${startYear}–${String(endYear).slice(2)} (from ${monthName} ${dd || 1})`;
  })();

  return (
    <motion.div
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
      className="mx-auto max-w-7xl space-y-5"
    >
      <section className="rounded-[2rem] border border-border bg-card/85 p-6 shadow-[0_12px_28px_rgba(47,62,64,0.05)] backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Business Intelligence</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground font-heading">
              Reports & Analytics
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Business intelligence across all modules · {fyLabel}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              <Sparkles className="h-3 w-3" />
              Insights cockpit
            </div>
          </div>
        </div>
      </section>

      {/* Executive KPI Cards */}
      {execLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : exec ? (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        >
          <KPICard
            label="Total Policies"
            value={exec.totalPolicies}
            icon={<FileText className="h-4 w-4" />}
          />
          <KPICard
            label="Active Policies"
            value={exec.activePolicies}
            icon={<Target className="h-4 w-4" />}
            accent
          />
          <KPICard
            label="Customers"
            value={exec.totalCustomers}
            icon={<Users className="h-4 w-4" />}
          />
          <KPICard
            label="Premium Collected"
            value={inr(exec.totalPremiumCollected)}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <KPICard
            label="Renewal Rate"
            value={`${exec.renewalRate}%`}
            icon={<Percent className="h-4 w-4" />}
            accent
          />
          <KPICard
            label="Collection Rate"
            value={`${exec.premiumCollectionRate}%`}
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </motion.div>
      ) : null}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {/* Mobile: Dropdown selector */}
        <div className="sm:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full border-border bg-card text-foreground">
              <SelectValue>
                {(() => {
                  const tab = REPORT_TABS.find((t) => t.value === activeTab);
                  const Icon = tab?.icon || FileText;
                  return (
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {tab?.label || activeTab}
                    </span>
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="border-border bg-popover">
              {REPORT_TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {t.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Tab list */}
        <TabsList className="hidden h-auto flex-wrap gap-1 rounded-2xl border border-border bg-card/90 p-1 sm:flex">
          {REPORT_TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="h-4 w-4 mr-1.5" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ---- Policies Tab ---- */}
        <TabsContent value="policies" className="space-y-4">
          {/* Financials summary */}
          {policyFinancials && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat label="Total Premium" value={inr(policyFinancials.totalPremium)} />
              <MiniStat label="Total Sum Insured" value={inr(policyFinancials.totalSumInsured)} />
              <MiniStat label="Avg Premium" value={inr(policyFinancials.avgPremium)} />
              <MiniStat label="Policy Count" value={policyFinancials.policyCount} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PolicyTypePieChart data={policyTypes} loading={ptLoading} />
            <PolicyStatusPieChart data={policyStatus} loading={psLoading} />
            <MonthlyPoliciesChart data={monthlyPolicies} loading={mpLoading} />
            <TopInsurersChart data={topInsurers} loading={tiLoading} />
          </div>
        </TabsContent>

        {/* ---- Premiums Tab ---- */}
        <TabsContent value="premiums" className="space-y-4">
          {premiumRate && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MiniStat label="Total Amount" value={inr(premiumRate.totalAmount)} />
              <MiniStat label="Collected" value={inr(premiumRate.collectedAmount)} />
              <MiniStat label="Collection Rate" value={`${premiumRate.rate}%`} accent />
            </div>
          )}

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
                className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={async () => {
                if (premiumCollection) {
                  await exportToExcel(
                    premiumCollection as unknown as Record<string, unknown>[],
                    REPORT_EXPORTS.premiumCollection.columns,
                    REPORT_EXPORTS.premiumCollection.filename
                  );
                }
              }}
              disabled={!premiumCollection}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
          </div>

          <PremiumCollectionChart data={premiumCollection} loading={pcLoading} />
        </TabsContent>

        {/* ---- Renewals Tab ---- */}
        <TabsContent value="renewals" className="space-y-4">
          {renewalRate && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MiniStat label="Total Renewals" value={renewalRate.total} />
              <MiniStat label="Renewed" value={renewalRate.renewed} />
              <MiniStat label="Conversion Rate" value={`${renewalRate.rate}%`} accent />
            </div>
          )}

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
                className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={async () => {
                if (monthlyRenewals) {
                  await exportToExcel(
                    monthlyRenewals as unknown as Record<string, unknown>[],
                    REPORT_EXPORTS.renewals.columns,
                    REPORT_EXPORTS.renewals.filename
                  );
                }
              }}
              disabled={!monthlyRenewals}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RenewalTrendChart data={monthlyRenewals} loading={mrLoading} />
            <RenewalStatusPieChart data={renewalBreakdown} loading={rbLoading} />
          </div>
        </TabsContent>

        {/* ---- Customers Tab ---- */}
        <TabsContent value="customers" className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
                className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={async () => {
                if (customerGrowth) {
                  await exportToExcel(
                    customerGrowth as unknown as Record<string, unknown>[],
                    REPORT_EXPORTS.customerGrowth.columns,
                    REPORT_EXPORTS.customerGrowth.filename
                  );
                }
              }}
              disabled={!customerGrowth}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
          </div>

          <CustomerGrowthChart data={customerGrowth} loading={cgLoading} />
        </TabsContent>

        {/* ---- Attendance Tab ---- */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={String(attYear)}
              onValueChange={(v) => setAttYear(Number(v))}
            >
              <SelectTrigger className="w-full border-border bg-card text-foreground sm:w-25">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover">
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(
                  (y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Select
              value={String(attMonth)}
              onValueChange={(v) => setAttMonth(Number(v))}
            >
              <SelectTrigger className="w-full border-border bg-card text-foreground sm:w-32.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover">
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {new Date(new Date().getFullYear(), i).toLocaleString("en-IN", { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {attOverview && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <MiniStat label="Present" value={attOverview.present} color="#4ade80" />
              <MiniStat label="Absent" value={attOverview.absent} color="#f87171" />
              <MiniStat label="Late" value={attOverview.late} color="#fb923c" />
              <MiniStat label="Half Day" value={attOverview.halfDay} color="#fbbf24" />
              <MiniStat label="Leave" value={attOverview.leave} color="#60a5fa" />
              <MiniStat label="Avg Hours" value={`${attOverview.avgHours}h`} accent />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// ---- Helper Components ----

function KPICard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <motion.div variants={staggerItem} {...hoverLift}>
      <Card className="border-border bg-card/90 shadow-[0_8px_18px_rgba(47,62,64,0.04)]">
        <CardContent className="px-4 pb-3 pt-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="truncate text-xs">{label}</span>
          </div>
          <p className={`mt-1 text-xl font-semibold tracking-tight ${accent ? "text-primary" : "text-foreground"}`}>
            {value}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MiniStat({
  label,
  value,
  accent,
  color,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  color?: string;
}) {
  return (
    <motion.div {...hoverLift}>
      <Card className="border-border bg-card/90 shadow-[0_8px_18px_rgba(47,62,64,0.04)]">
        <CardContent className="px-3 pb-2 pt-3">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p
            className="mt-0.5 text-lg font-semibold tracking-tight"
            style={{
              color: color || (accent ? "var(--primary)" : "var(--foreground)"),
            }}
          >
            {value}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

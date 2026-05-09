"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileSearch, Download, Loader2, Sparkles, FileText, CalendarDays, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";

type ReportType = "policy_register" | "premium_register" | "claim_register" | "commission_disclosure" | "summary";

export default function IRDAReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("policy_register");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ report: reportType });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/irda?${params}`);
      const json = await res.json();
      if (res.ok) { setData(json); }
      else toast.error(json.error || "Failed to fetch report");
    } catch { toast.error("Failed to fetch report"); }
    finally { setLoading(false); }
  };

  const downloadCSV = async () => {
    const params = new URLSearchParams({ report: reportType, format: "csv" });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/irda?${params}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType}_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } else {
      toast.error("Failed to download");
    }
  };

  const headers = data && data.length > 0 ? Object.keys(data[0]) : [];
  const activeRange = from || to ? `${from || "..."} to ${to || "..."}` : "All Dates";

  return (
    <motion.div className="mx-auto max-w-7xl space-y-6" {...pageTransition}>
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Regulatory reporting desk
          </div>
          <h1 className="text-2xl font-bold text-foreground font-heading uppercase tracking-[0.16em] sm:text-3xl">
            IRDA Compliance Reports
          </h1>
          <p className="text-sm text-muted-foreground">Generate policy, premium, claims, and disclosure reports for audit-ready compliance.</p>
        </div>
      </section>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: FileText, label: "Report Type", value: reportType.replace(/_/g, " "), panel: "border-blue-500/30 bg-blue-500/10", text: "text-blue-700 dark:text-blue-300" },
          { icon: CalendarDays, label: "Date Range", value: activeRange, panel: "border-indigo-500/30 bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300" },
          { icon: ShieldCheck, label: "Rows Loaded", value: data?.length ?? 0, panel: "border-emerald-500/30 bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300" },
          { icon: Download, label: "Export", value: data && data.length > 0 ? "CSV Ready" : "Pending", panel: "border-amber-500/30 bg-amber-500/10", text: "text-amber-700 dark:text-amber-300" },
        ].map((item) => (
          <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
            <Card className={item.panel}>
              <CardContent className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                    <p className={`mt-1 line-clamp-1 text-xl font-semibold tracking-tight ${item.text}`}>{item.value}</p>
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

      {/* Controls */}
      <section className="rounded-2xl border border-border-strong/70 bg-card/90 p-5 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={(v) => { setReportType(v as ReportType); setData(null); }}>
              <SelectTrigger className="border-border/80 bg-background/80"><SelectValue /></SelectTrigger>
              <SelectContent className="border-border bg-popover">
                <SelectItem value="policy_register">Policy Register</SelectItem>
                <SelectItem value="premium_register">Premium Register</SelectItem>
                <SelectItem value="claim_register">Claim Register</SelectItem>
                <SelectItem value="commission_disclosure">Commission Disclosure</SelectItem>
                <SelectItem value="summary">Compliance Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>From Date</Label>
            <Input className="border-border/80 bg-background/80" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>To Date</Label>
            <Input className="border-border/80 bg-background/80" type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchReport} disabled={loading} className="gap-2 flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
              Generate
            </Button>
            {data && data.length > 0 && (
              <Button variant="outline" onClick={downloadCSV} className="gap-2 border-border">
                <Download className="w-4 h-4" /> CSV
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Results */}
      {loading ? (
        <div className="space-y-3 rounded-2xl border border-border-strong/70 bg-card/90 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : data === null ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong/70 bg-card/80 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50"><FileSearch className="h-8 w-8 text-muted-foreground" /></div>
          <p className="text-muted-foreground text-sm">Select a report type and click Generate</p>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong/70 bg-card/80 py-16">
          <p className="text-muted-foreground text-sm">No data found for the selected criteria.</p>
        </div>
      ) : reportType === "summary" ? (
        /* Summary report */
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(data[0]).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-border-strong/70 bg-card/95 p-4 shadow-[0_8px_18px_rgba(47,62,64,0.05)]">
              <p className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</p>
              <p className="text-xl font-bold text-foreground mt-1">
                {typeof value === "number" && key.toLowerCase().includes("amount") ? formatCurrency(value) :
                 typeof value === "object" ? JSON.stringify(value) : String(value)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        /* Table report */
        <div className="overflow-x-auto rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_12px_28px_rgba(47,62,64,0.06)]">
          <p className="border-b border-border/70 p-3 text-xs text-muted-foreground">{data.length} records found</p>
          <Table>
            <TableHeader>
              <TableRow className="border-border/80 bg-muted/20">
                {headers.map(h => (
                  <TableHead key={h} className="font-heading text-[11px] uppercase tracking-[0.14em] whitespace-nowrap text-muted-foreground">{h.replace(/_/g, " ")}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 100).map((row, idx) => (
                <TableRow key={idx} className="border-border/70 hover:bg-muted/35">
                  {headers.map(h => (
                    <TableCell key={h} className="text-sm whitespace-nowrap">
                      {typeof row[h] === "number" && (h.includes("amount") || h.includes("insured") || h.includes("premium")) ? formatCurrency(row[h] as number) : String(row[h] ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length > 100 && <p className="border-t border-border/70 p-3 text-xs text-muted-foreground">Showing first 100 of {data.length} records. Download CSV for complete data.</p>}
        </div>
      )}
    </motion.div>
  );
}

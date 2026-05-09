"use client";

import { useState } from "react";
import { Search, FileCheck, CheckCircle, XCircle, Clock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/lib/context/auth-context";
import { usePendingKYCCount } from "@/lib/hooks/use-kyc";
import { kycService } from "@/lib/services/kyc.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import useSWR from "swr";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";

export default function KYCPage() {
  const { user, role } = useAuth();
  const { data: pendingCount } = usePendingKYCCount();
  const [searchQuery, setSearchQuery] = useState("");
  const isAdmin = role === "admin" || role === "manager";

  // Fetch all KYC documents for admin view
  const { data: allDocs, isLoading, mutate } = useSWR("all-kyc-docs", async () => {
    const { data, error } = await (supabase.from("kyc_documents") as any).select("*, customers(name)").order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

  const filtered = (allDocs ?? []).filter((d: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (d.customers?.name?.toLowerCase() || "").includes(q) || (d.document_type?.toLowerCase() || "").includes(q) || (d.document_number?.toLowerCase() || "").includes(q);
  });
  const verifiedCount = (allDocs ?? []).filter((d: any) => d.status === "verified").length;
  const rejectedCount = (allDocs ?? []).filter((d: any) => d.status === "rejected").length;

  const handleVerify = async (id: string) => {
    if (!user) return;
    try { await kycService.verify(id, user.id); toast.success("KYC verified"); mutate(); }
    catch { toast.error("Failed"); }
  };

  const handleReject = async (id: string) => {
    if (!user) return;
    try { await kycService.reject(id, user.id, "Does not meet requirements"); toast.success("KYC rejected"); mutate(); }
    catch { toast.error("Failed"); }
  };

  const handleViewDocument = async (filePath: string) => {
    try {
      const url = await kycService.getSignedUrl(filePath);
      window.open(url, "_blank");
    } catch {
      toast.error("Could not load document preview.");
    }
  };

  return (
    <motion.div className="mx-auto max-w-7xl space-y-6" {...pageTransition}>
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Compliance desk
          </div>
          <h1 className="text-2xl font-bold text-foreground font-heading uppercase tracking-[0.16em] sm:text-3xl">
            KYC Documents
          </h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} document{filtered.length !== 1 ? "s" : ""} monitored for verification and compliance.
          </p>
        </div>
      </section>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {[
          {
            icon: Clock,
            label: "Pending Verification",
            value: pendingCount ?? 0,
            panel: "border-amber-500/30 bg-amber-500/10",
            text: "text-amber-700 dark:text-amber-300",
          },
          {
            icon: CheckCircle,
            label: "Verified",
            value: verifiedCount,
            panel: "border-emerald-500/30 bg-emerald-500/10",
            text: "text-emerald-700 dark:text-emerald-300",
          },
          {
            icon: XCircle,
            label: "Rejected",
            value: rejectedCount,
            panel: "border-red-500/30 bg-red-500/10",
            text: "text-red-700 dark:text-red-300",
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

      <section className="rounded-2xl border border-border-strong/70 bg-card/90 p-3 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customer, document type..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 border-border/80 bg-background/80"
          />
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-3 rounded-2xl border border-border-strong/70 bg-card/90 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong/70 bg-card/80 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50"><FileCheck className="h-8 w-8 text-muted-foreground" /></div>
          <p className="text-muted-foreground text-sm">No KYC documents found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_12px_28px_rgba(47,62,64,0.06)]">
          <Table>
            <TableHeader><TableRow className="border-border/80 bg-muted/20">
              <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Customer</TableHead>
              <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Document Type</TableHead>
              <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Document #</TableHead>
              <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">File</TableHead>
              <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Status</TableHead>
              <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Uploaded</TableHead>
              {isAdmin && <TableHead className="w-30 font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Actions</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((doc: any) => (
                <TableRow key={doc.id} className="border-border/70 hover:bg-muted/35">
                  <TableCell className="font-medium">{doc.customers?.name || "—"}</TableCell>
                  <TableCell className="capitalize">{(doc.document_type || "").replace(/_/g, " ")}</TableCell>
                  <TableCell className="font-mono text-xs">{doc.document_number || "—"}</TableCell>
                  <TableCell>
                    {doc.file_path ? (
                      <button 
                        onClick={() => handleViewDocument(doc.file_path)} 
                        className="text-primary text-xs hover:underline text-left"
                      >
                        {doc.file_name || "View"}
                      </button>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${doc.status === "verified" ? "bg-green-500/10 text-green-400" : doc.status === "rejected" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{format(new Date(doc.created_at), "dd MMM yyyy")}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      {doc.status === "pending" && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleVerify(doc.id)} className="h-7 px-2 text-green-500 hover:bg-green-500/10 hover:text-green-400"><CheckCircle className="mr-1 h-3.5 w-3.5" /> Verify</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleReject(doc.id)} className="h-7 px-2 text-red-500 hover:bg-red-500/10 hover:text-red-400"><XCircle className="mr-1 h-3.5 w-3.5" /> Reject</Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </motion.div>
  );
}

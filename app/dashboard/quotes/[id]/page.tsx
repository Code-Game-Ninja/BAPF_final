"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ArrowLeft, FileText, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { pageTransition } from "@/lib/helpers/animations";
import { useAuth } from "@/lib/context/auth-context";
import { QuoteComparisonMatrix } from "@/components/quotes/QuoteComparisonMatrix";
import { QuoteEntryForm } from "@/components/quotes/QuoteEntryForm";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  quotes_received: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  converted: "bg-green-500/10 text-green-400 border-green-500/20",
  expired: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

async function fetcher(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { session } = useAuth();
  const token = session?.access_token ?? "";

  const { data: qr, isLoading, mutate } = useSWR(
    token ? [`/api/quotes/${id}`, token] : null,
    ([url, t]) => fetcher(url, t),
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!qr) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Quote request not found.</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  return (
    <motion.div {...pageTransition} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-heading font-bold uppercase tracking-wider">
              {qr.quote_request_number}
            </h1>
            <Badge
              variant="outline"
              className={`text-xs capitalize ${STATUS_COLORS[qr.status] ?? ""}`}
            >
              {qr.status?.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {qr.customers?.name ?? "—"} · {qr.policy_type?.replace(/_/g, " ")}
          </p>
        </div>
        <QuoteEntryForm quoteRequestId={id} onCreated={() => mutate()} />
      </div>

      {/* Request Info */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-heading font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Request Details
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Customer</p>
            <p className="font-medium mt-0.5 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              {qr.customers?.name ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Policy Type</p>
            <p className="capitalize mt-0.5">{qr.policy_type?.replace(/_/g, " ") ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Created</p>
            <p className="mt-0.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              {qr.created_at ? format(new Date(qr.created_at), "dd MMM yyyy") : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Target Insurers</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {(qr.target_insurers ?? []).join(", ") || "Any"}
            </p>
          </div>
        </div>
        {qr.coverage_requirements && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Coverage Requirements
            </p>
            <p className="text-sm">{qr.coverage_requirements}</p>
          </div>
        )}
      </div>

      {/* Quote Comparison Matrix */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-heading font-bold uppercase tracking-wider">
            Quote Comparison ({(qr.quotes ?? []).length} quotes)
          </h2>
        </div>
        <QuoteComparisonMatrix
          quoteRequestId={id}
          quotes={qr.quotes ?? []}
          onQuoteUpdated={() => mutate()}
        />
      </div>
    </motion.div>
  );
}

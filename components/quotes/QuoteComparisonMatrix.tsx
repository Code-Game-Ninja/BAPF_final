"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Star, TrendingDown, TrendingUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/context/auth-context";
import { useRouter } from "next/navigation";

interface Quote {
  id: string;
  insurer_name: string;
  premium_amount: number;
  sum_insured: number;
  coverage_details?: string;
  terms?: string;
  validity_date: string;
  is_recommended: boolean;
  is_accepted: boolean;
  is_expired: boolean;
}

interface QuoteComparisonMatrixProps {
  quoteRequestId: string;
  quotes: Quote[];
  onQuoteUpdated?: () => void;
}

export function QuoteComparisonMatrix({
  quoteRequestId,
  quotes,
  onQuoteUpdated,
}: QuoteComparisonMatrixProps) {
  const { session } = useAuth();
  const router = useRouter();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [confirmQuote, setConfirmQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);

  if (quotes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No quotes added yet. Add quotes to compare.
      </div>
    );
  }

  const minPremium = Math.min(...quotes.map((q) => q.premium_amount));
  const maxSumInsured = Math.max(...quotes.map((q) => q.sum_insured));

  const fmt = (n: number) =>
    n >= 10_00_000
      ? `₹${(n / 10_00_000).toFixed(2)}L`
      : `₹${n.toLocaleString("en-IN")}`;

  const handleAccept = async (quote: Quote) => {
    setLoading(true);
    setAcceptingId(quote.id);
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(
        `/api/quotes/${quoteRequestId}/quotes/${quote.id}/accept`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to accept quote");

      toast.success(`Quote from ${quote.insurer_name} accepted`);
      onQuoteUpdated?.();

      if (data.redirect_to) {
        router.push(data.redirect_to);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to accept quote");
    } finally {
      setLoading(false);
      setAcceptingId(null);
      setConfirmQuote(null);
    }
  };

  const rows = [
    { label: "Premium", key: "premium_amount", render: (q: Quote) => (
      <span className={q.premium_amount === minPremium ? "text-green-400 font-bold" : ""}>
        {fmt(q.premium_amount)}
        {q.premium_amount === minPremium && (
          <TrendingDown className="w-3 h-3 inline ml-1 text-green-400" />
        )}
      </span>
    )},
    { label: "Sum Insured", key: "sum_insured", render: (q: Quote) => (
      <span className={q.sum_insured === maxSumInsured ? "text-blue-400 font-bold" : ""}>
        {fmt(q.sum_insured)}
        {q.sum_insured === maxSumInsured && (
          <TrendingUp className="w-3 h-3 inline ml-1 text-blue-400" />
        )}
      </span>
    )},
    { label: "Coverage", key: "coverage_details", render: (q: Quote) => (
      <span className="text-xs">{q.coverage_details || "—"}</span>
    )},
    { label: "Terms", key: "terms", render: (q: Quote) => (
      <span className="text-xs">{q.terms || "—"}</span>
    )},
    { label: "Valid Until", key: "validity_date", render: (q: Quote) => (
      <span className="text-xs">
        {new Date(q.validity_date).toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
        })}
      </span>
    )},
  ];

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-xs uppercase tracking-wider font-heading text-muted-foreground w-32">
                Feature
              </th>
              {quotes.map((q) => (
                <th key={q.id} className="py-3 px-4 text-center min-w-[180px]">
                  <div className="space-y-1">
                    <p className="font-bold text-sm">{q.insurer_name}</p>
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {q.is_recommended && (
                        <Badge className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1">
                          <Star className="w-3 h-3" /> Recommended
                        </Badge>
                      )}
                      {q.is_accepted && (
                        <Badge className="text-xs bg-green-500/10 text-green-400 border-green-500/20 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Accepted
                        </Badge>
                      )}
                      {q.is_expired && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Expired
                        </Badge>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, render }) => (
              <tr key={label} className="border-b border-border/50 hover:bg-muted/20">
                <td className="py-3 px-4 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {label}
                </td>
                {quotes.map((q) => (
                  <td
                    key={q.id}
                    className={`py-3 px-4 text-center ${
                      label === "Premium" && q.premium_amount === minPremium
                        ? "bg-green-500/5"
                        : label === "Sum Insured" && q.sum_insured === maxSumInsured
                        ? "bg-blue-500/5"
                        : ""
                    }`}
                  >
                    {render(q)}
                  </td>
                ))}
              </tr>
            ))}
            {/* Actions row */}
            <tr>
              <td className="py-4 px-4 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Action
              </td>
              {quotes.map((q) => (
                <td key={q.id} className="py-4 px-4 text-center">
                  {!q.is_accepted && !q.is_expired ? (
                    <Button
                      size="sm"
                      onClick={() => setConfirmQuote(q)}
                      disabled={loading && acceptingId === q.id}
                      className="gap-1"
                    >
                      {loading && acceptingId === q.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      Accept
                    </Button>
                  ) : q.is_accepted ? (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                      Accepted
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Expired
                    </Badge>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Confirm Accept Dialog */}
      <AlertDialog open={!!confirmQuote} onOpenChange={(open) => !open && setConfirmQuote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading uppercase tracking-wider">
              Accept Quote
            </AlertDialogTitle>
            <AlertDialogDescription>
              Accept the quote from <strong>{confirmQuote?.insurer_name}</strong> for{" "}
              <strong>₹{confirmQuote?.premium_amount?.toLocaleString("en-IN")}</strong>?
              This will mark the quote request as converted and redirect you to create a policy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmQuote && handleAccept(confirmQuote)}
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Accept & Create Policy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pageTransition } from "@/lib/helpers/animations";
import { useAuth } from "@/lib/context/auth-context";

export default function NewReconciliationPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [insurerName, setInsurerName] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !insurerName || !periodStart || !periodEnd) {
      toast.error("All fields are required");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size must be less than 20 MB");
      return;
    }

    setLoading(true);
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("insurer_name", insurerName);
      formData.append("period_start", periodStart);
      formData.append("period_end", periodEnd);

      const res = await fetch("/api/reconciliation", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");

      toast.success(
        `Import complete: ${data.matched_count} matched, ${data.discrepancy_count} discrepancies`
      );
      router.push(`/dashboard/commission-reconciliation/${data.run_id}`);
    } catch (err: any) {
      toast.error(err.message ?? "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...pageTransition} className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <h1 className="text-xl font-heading font-bold uppercase tracking-wider">
          Import Commission Statement
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-heading font-bold uppercase tracking-wider">
            Statement Details
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="insurer_name">Insurer Name *</Label>
            <Input
              id="insurer_name"
              placeholder="e.g., HDFC Ergo"
              value={insurerName}
              onChange={(e) => setInsurerName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="period_start">Period Start *</Label>
              <Input
                id="period_start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period_end">Period End *</Label>
              <Input
                id="period_end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-heading font-bold uppercase tracking-wider">
            Upload File
          </h2>
          <p className="text-xs text-muted-foreground">
            Supported formats: Excel (.xlsx, .xls) or CSV. Max size: 20 MB.
            Required columns: Policy Number, Premium Amount, Commission Amount.
          </p>

          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              file ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"
            }`}
          >
            {file ? (
              <div className="space-y-2">
                <FileSpreadsheet className="w-10 h-10 mx-auto text-primary" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Drop your file here or click to browse
                </p>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                    <Upload className="w-4 h-4" /> Choose File
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !file}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import & Reconcile
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

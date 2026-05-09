"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/lib/context/auth-context";

interface IRDAReportGeneratorProps {
  onGenerated?: () => void;
}

export function IRDAReportGenerator({ onGenerated }: IRDAReportGeneratorProps) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("business_summary");
  const [periodType, setPeriodType] = useState("monthly");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [fileFormat, setFileFormat] = useState("excel");

  const handleGenerate = async () => {
    if (!periodStart || !periodEnd) {
      toast.error("Period start and end dates are required");
      return;
    }

    setLoading(true);
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/irda-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          report_type: reportType,
          period_type: periodType,
          period_start: periodStart,
          period_end: periodEnd,
          file_format: fileFormat,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate report");

      toast.success("Report generated successfully");
      onGenerated?.();

      // Trigger download
      if (data.id) {
        const downloadRes = await fetch(`/api/irda-reports/${data.id}/download`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (downloadRes.ok) {
          const blob = await downloadRes.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `irda-${reportType}-${periodStart}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-heading uppercase tracking-wider flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          Generate IRDA Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business_summary">Business Summary</SelectItem>
                <SelectItem value="premium_register">Premium Register</SelectItem>
                <SelectItem value="commission_register">Commission Register</SelectItem>
                <SelectItem value="claims_register">Claims Register</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Period Type</Label>
            <Select value={periodType} onValueChange={setPeriodType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="period_start">Period Start</Label>
            <Input
              id="period_start"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="period_end">Period End</Label>
            <Input
              id="period_end"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Format</Label>
            <Select value={fileFormat} onValueChange={setFileFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading || !periodStart || !periodEnd}
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {loading ? "Generating..." : "Generate & Download"}
        </Button>
      </CardContent>
    </Card>
  );
}

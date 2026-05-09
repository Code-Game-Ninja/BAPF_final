"use client";

/**
 * Reusable Export Button Component
 * Supports CSV, Excel, and JSON export with role-based data visibility.
 * Respects current filters/search state via the `data` prop.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, FileJson, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExportButtonProps {
  /** Array of data objects to export */
  data: Record<string, unknown>[];
  /** Filename (without extension) */
  filename?: string;
  /** Column headers mapping: { key: "Display Label" } */
  columns?: Record<string, string>;
  /** Allowed formats (default: all) */
  formats?: ("csv" | "excel" | "json")[];
  /** Button variant */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Button label */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function ExportButton({
  data,
  filename = "export",
  columns,
  formats = ["csv", "excel", "json"],
  variant = "outline",
  size = "sm",
  label = "Export",
  disabled = false,
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const getFormattedData = (): Record<string, unknown>[] => {
    if (!columns) return data;
    return data.map((row) => {
      const formatted: Record<string, unknown> = {};
      for (const [key, header] of Object.entries(columns)) {
        formatted[header] = row[key] ?? "";
      }
      return formatted;
    });
  };

  const exportCSV = () => {
    const formatted = getFormattedData();
    if (formatted.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = Object.keys(formatted[0]);
    const csvRows = [
      headers.join(","),
      ...formatted.map((row) =>
        headers
          .map((h) => {
            const val = String(row[h] ?? "");
            return val.includes(",") || val.includes('"') || val.includes("\n")
              ? `"${val.replace(/"/g, '""')}"`
              : val;
          })
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `${filename}.csv`);
    toast.success(`Exported ${formatted.length} rows as CSV`);
  };

  const exportJSON = () => {
    const formatted = getFormattedData();
    if (formatted.length === 0) {
      toast.error("No data to export");
      return;
    }

    const blob = new Blob([JSON.stringify(formatted, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    downloadBlob(blob, `${filename}.json`);
    toast.success(`Exported ${formatted.length} rows as JSON`);
  };

  const exportExcel = async () => {
    const formatted = getFormattedData();
    if (formatted.length === 0) {
      toast.error("No data to export");
      return;
    }

    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(formatted);

      // Auto-size columns
      const colWidths = Object.keys(formatted[0]).map((key) => {
        const maxLen = Math.max(
          key.length,
          ...formatted.map((row) => String(row[key] ?? "").length)
        );
        return { wch: Math.min(maxLen + 2, 40) };
      });
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      XLSX.writeFile(wb, `${filename}.xlsx`);
      toast.success(`Exported ${formatted.length} rows as Excel`);
    } catch {
      toast.error("Failed to export Excel");
    } finally {
      setExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = (format: "csv" | "excel" | "json") => {
    switch (format) {
      case "csv":
        exportCSV();
        break;
      case "excel":
        exportExcel();
        break;
      case "json":
        exportJSON();
        break;
    }
  };

  if (formats.length === 1) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled={disabled || exporting || data.length === 0}
        onClick={() => handleExport(formats[0])}
        className="text-muted-foreground hover:text-foreground border-border-strong"
      >
        {exporting ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-1" />
        )}
        {label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || exporting || data.length === 0}
          className="text-muted-foreground hover:text-foreground border-border-strong"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-1" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card border-border-strong">
        {formats.includes("csv") && (
          <DropdownMenuItem
            className="text-foreground focus:bg-muted"
            onClick={() => handleExport("csv")}
          >
            <FileText className="h-4 w-4 mr-2" />
            Export CSV
          </DropdownMenuItem>
        )}
        {formats.includes("excel") && (
          <DropdownMenuItem
            className="text-foreground focus:bg-muted"
            onClick={() => handleExport("excel")}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </DropdownMenuItem>
        )}
        {formats.includes("json") && (
          <DropdownMenuItem
            className="text-foreground focus:bg-muted"
            onClick={() => handleExport("json")}
          >
            <FileJson className="h-4 w-4 mr-2" />
            Export JSON
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

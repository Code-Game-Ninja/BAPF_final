"use client";

import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface ExportColumn {
  header: string;
  key: string;
  format?: (value: unknown) => string;
}

/**
 * Export data to Excel (.xlsx)
 */
export async function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string
) {
  try {
    const XLSX = await import("xlsx");
    const rows = data.map((row) => {
      const obj: Record<string, unknown> = {};
      for (const col of columns) {
        const val = row[col.key];
        obj[col.header] = col.format ? col.format(val) : val;
      }
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");

    // Auto-size columns
    const colWidths = columns.map((col) => ({
      wch: Math.max(
        col.header.length,
        ...rows.map((r) => String(r[col.header] ?? "").length)
      ) + 2,
    }));
    ws["!cols"] = colWidths;

    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success("Report exported successfully");
  } catch (err) {
    toast.error("Failed to export report");
    console.error(err);
  }
}

/**
 * Export data to CSV
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string
) {
  try {
    const headers = columns.map((c) => c.header).join(",");
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const val = row[col.key];
          const formatted = col.format ? col.format(val) : String(val ?? "");
          // Escape commas and quotes
          return formatted.includes(",") || formatted.includes('"')
            ? `"${formatted.replace(/"/g, '""')}"`
            : formatted;
        })
        .join(",")
    );

    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  } catch (err) {
    toast.error("Failed to export CSV");
    console.error(err);
  }
}

// ---- Pre-built Export Configs ----

export const REPORT_EXPORTS = {
  premiumCollection: {
    columns: [
      { header: "Month", key: "month" },
      {
        header: "Collected",
        key: "collected",
        format: (v: unknown) => formatCurrency(Number(v)),
      },
      {
        header: "Pending",
        key: "pending",
        format: (v: unknown) => formatCurrency(Number(v)),
      },
      {
        header: "Overdue",
        key: "overdue",
        format: (v: unknown) => formatCurrency(Number(v)),
      },
    ],
    filename: "premium-collection-report",
  },
  commissions: {
    columns: [
      { header: "Month", key: "month" },
      {
        header: "Amount",
        key: "amount",
        format: (v: unknown) => formatCurrency(Number(v)),
      },
    ],
    filename: "commission-report",
  },
  renewals: {
    columns: [
      { header: "Month", key: "month" },
      { header: "Due", key: "due" },
      { header: "Renewed", key: "renewed" },
      { header: "Lost", key: "lost" },
    ],
    filename: "renewal-report",
  },
  customerGrowth: {
    columns: [
      { header: "Month", key: "month" },
      { header: "New Customers", key: "count" },
      { header: "Total", key: "cumulative" },
    ],
    filename: "customer-growth-report",
  },
};

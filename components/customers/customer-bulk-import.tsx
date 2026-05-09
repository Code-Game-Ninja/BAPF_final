"use client";

import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/context/auth-context";
import { bulkCreateCustomers, BulkCustomerRow } from "@/lib/services/customer.service";
import { auditLogService } from "@/lib/services/audit-log.service";
import { invalidateCustomers } from "@/lib/hooks/use-customers";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

// ── Template columns ──────────────────────────────────────────────
const TEMPLATE_HEADERS = ["name", "email", "phone", "address", "city", "state", "pincode"];
const TEMPLATE_SAMPLE: string[][] = [
  ["Rajesh Kumar", "rajesh@email.com", "9876543210", "12 Park Street", "Mumbai", "Maharashtra", "400001"],
  ["Priya Sharma", "priya@email.com", "9123456789", "", "Delhi", "Delhi", ""],
];

// ── Validation ────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const PINCODE_RE = /^\d{6}$/;

interface ParsedRow extends BulkCustomerRow {
  _rowIndex: number;
  _errors: string[];
  _valid: boolean;
}

function validateRow(raw: Record<string, string>, rowIndex: number): ParsedRow {
  const name = (raw["name"] ?? raw["Name"] ?? "").trim();
  const email = (raw["email"] ?? raw["Email"] ?? "").trim();
  const phone = (raw["phone"] ?? raw["Phone"] ?? "").replace(/\D/g, "").trim();
  const address = (raw["address"] ?? raw["Address"] ?? "").trim();
  const city = (raw["city"] ?? raw["City"] ?? "").trim();
  const state = (raw["state"] ?? raw["State"] ?? "").trim();
  const pincode = (raw["pincode"] ?? raw["Pincode"] ?? "").replace(/\D/g, "").trim();

  const errors: string[] = [];
  if (!name || name.length < 2) errors.push("Name required (min 2 chars)");
  if (!email || !EMAIL_RE.test(email)) errors.push("Valid email required");
  if (!phone || !PHONE_RE.test(phone)) errors.push("10-digit Indian mobile required");
  if (pincode && !PINCODE_RE.test(pincode)) errors.push("Pincode must be 6 digits");

  return {
    name,
    email,
    phone,
    address,
    city,
    state,
    pincode,
    _rowIndex: rowIndex,
    _errors: errors,
    _valid: errors.length === 0,
  };
}

function normaliseRaw(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

// ── Template download helpers ─────────────────────────────────────
function downloadCSVTemplate() {
  const rows = [TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE];
  const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "customers_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadExcelTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE]);
  // Bold header row
  TEMPLATE_HEADERS.forEach((_, i) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: i });
    if (ws[cell]) ws[cell].s = { font: { bold: true } };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Customers");
  XLSX.writeFile(wb, "customers_import_template.xlsx");
}

// ── Props ─────────────────────────────────────────────────────────
interface CustomerBulkImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ─────────────────────────────────────────────────────
export function CustomerBulkImport({ open, onOpenChange }: CustomerBulkImportProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    skipped: number;
    errors: { row: number; reason: string }[];
  } | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // ── Parse file ──────────────────────────────────────────────────
  const processFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["csv", "xlsx", "xls"].includes(ext)) {
      toast.error("Only .csv, .xlsx, and .xls files are supported");
      return;
    }
    setFileName(file.name);
    setImportDone(false);
    setImportResult(null);
    setShowErrors(false);

    if (ext === "csv") {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.data.length === 0) { toast.error("File is empty"); return; }
          setRows(result.data.map((raw, i) => validateRow(raw, i + 2)));
        },
        error: (err) => toast.error(`CSV parse error: ${err.message}`),
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buf = e.target?.result as ArrayBuffer;
          const wb = XLSX.read(buf, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
          if (data.length === 0) { toast.error("File is empty"); return; }
          setRows(data.map((raw, i) => {
            const n: Record<string, string> = {};
            for (const k of Object.keys(raw)) n[k.toLowerCase().trim()] = normaliseRaw(raw[k]);
            return validateRow(n, i + 2);
          }));
        } catch { toast.error("Failed to parse Excel file"); }
      };
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const validRows = rows.filter((r) => r._valid);
  const invalidRows = rows.filter((r) => !r._valid);

  // ── Import ──────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!user || validRows.length === 0) return;
    setImporting(true);
    setImportProgress(10);

    try {
      const toImport: BulkCustomerRow[] = validRows.map(({ name, email, phone, address, city, state, pincode }) => ({
        name, email, phone, address, city, state, pincode,
      }));

      setImportProgress(40);
      const result = await bulkCreateCustomers(toImport, user.id);
      setImportProgress(85);

      await auditLogService.logAction(
        user.id,
        user.name,
        "bulk_import",
        "customer",
        `Bulk imported ${result.created} customer(s) from ${fileName}. Skipped: ${result.skipped}.`
      );

      invalidateCustomers();
      setImportProgress(100);
      setImportResult(result);
      setImportDone(true);

      toast.success(`${result.created} customer${result.created !== 1 ? "s" : ""} imported successfully`);
      if (result.skipped > 0) {
        toast.warning(`${result.skipped} row${result.skipped !== 1 ? "s" : ""} skipped (duplicates)`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  // ── Reset ───────────────────────────────────────────────────────
  const handleReset = () => {
    setRows([]);
    setFileName(null);
    setImportDone(false);
    setImportResult(null);
    setImportProgress(0);
    setShowErrors(false);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="p-6 pb-4 border-b border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-cabin uppercase tracking-wider">
              <Users className="w-5 h-5" />
              Bulk Import Customers
            </DialogTitle>
            <DialogDescription>
              Import multiple customers at once from a CSV or Excel file.
              Download the template, fill it in, then upload.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-auto p-6 flex flex-col gap-4 min-h-0">

          {/* Template download */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground font-medium">Download template:</span>
            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={downloadCSVTemplate}>
              <Download className="w-3.5 h-3.5" /> CSV Template
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={downloadExcelTemplate}>
              <Download className="w-3.5 h-3.5" /> Excel Template (.xlsx)
            </Button>
          </div>

          {/* Column info */}
          <div className="flex flex-wrap gap-1.5 items-center text-xs text-muted-foreground">
            <span>Required columns:</span>
            {["name", "email", "phone"].map((col) => (
              <code key={col} className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">{col}</code>
            ))}
            <span className="ml-1">Optional:</span>
            {["address", "city", "state", "pincode"].map((col) => (
              <code key={col} className="bg-muted/50 px-1.5 py-0.5 rounded font-mono">{col}</code>
            ))}
          </div>

          {/* Upload zone */}
          {!fileName && (
            <div
              className={`
                border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
                ${dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/20"}
              `}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-3 pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileSpreadsheet className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-base">
                    {dragOver ? "Drop the file here…" : "Drag & drop your file here"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or <span className="text-primary underline underline-offset-2">click to browse</span>
                    {" "}— supports <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* File loaded: preview */}
          {fileName && rows.length > 0 && (
            <div className="flex flex-col gap-3 min-h-0">
              {/* File info bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium text-sm truncate max-w-55">{fileName}</span>
                <Badge variant="secondary">{rows.length} row{rows.length !== 1 ? "s" : ""}</Badge>
                {validRows.length > 0 && (
                  <Badge className="bg-green-500/15 text-green-400 border border-green-500/20 gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {validRows.length} valid
                  </Badge>
                )}
                {invalidRows.length > 0 && (
                  <Badge className="bg-red-500/15 text-red-400 border border-red-500/20 gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {invalidRows.length} invalid
                  </Badge>
                )}
                {!importing && !importDone && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={handleReset}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Preview table */}
              <div className="border border-border rounded-lg overflow-hidden">
              <ScrollArea className="max-h-65">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="w-10 text-xs font-cabin uppercase">#</TableHead>
                      <TableHead className="text-xs font-cabin uppercase">Name</TableHead>
                      <TableHead className="text-xs font-cabin uppercase">Email</TableHead>
                      <TableHead className="text-xs font-cabin uppercase">Phone</TableHead>
                      <TableHead className="text-xs font-cabin uppercase">City</TableHead>
                      <TableHead className="text-xs font-cabin uppercase">State</TableHead>
                      <TableHead className="w-8 text-xs font-cabin uppercase">OK</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row._rowIndex} className={!row._valid ? "bg-red-500/5" : ""}>
                        <TableCell className="text-xs text-muted-foreground">{row._rowIndex}</TableCell>
                        <TableCell className="text-xs font-medium">{row.name || <span className="text-red-400 italic">missing</span>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.email || <span className="text-red-400 italic">missing</span>}</TableCell>
                        <TableCell className="text-xs">{row.phone || <span className="text-red-400 italic">missing</span>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.city || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.state || "—"}</TableCell>
                        <TableCell>
                          {row._valid ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          ) : (
                            <span title={row._errors.join("; ")}><AlertCircle className="w-4 h-4 text-red-400" /></span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              </div>

              {/* Validation errors expandable */}
              {invalidRows.length > 0 && (
                <div className="border border-red-500/20 rounded-lg bg-red-500/5 p-3 space-y-2">
                  <button
                    className="flex items-center gap-2 text-sm font-medium text-red-400 w-full text-left"
                    onClick={() => setShowErrors((v) => !v)}
                  >
                    <AlertCircle className="w-4 h-4" />
                    {invalidRows.length} row{invalidRows.length !== 1 ? "s" : ""} will be skipped (validation errors)
                    {showErrors ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                  </button>
                  {showErrors && (
                    <ul className="text-xs text-red-400 space-y-1 pl-6 list-disc">
                      {invalidRows.map((r) => (
                        <li key={r._rowIndex}>
                          Row {r._rowIndex}: {r._errors.join("; ")}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Progress + result */}
              {importing && (
                <div className="space-y-1.5">
                  <Progress value={importProgress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground text-center">Importing…</p>
                </div>
              )}

              {importDone && importResult && (
                <div className="border border-green-500/20 rounded-lg bg-green-500/5 p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-400">Import complete</p>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      <strong>{importResult.created}</strong> customer{importResult.created !== 1 ? "s" : ""} created.
                      {importResult.skipped > 0 && (
                        <> <strong>{importResult.skipped}</strong> skipped (phone already existed).</>
                      )}
                    </p>
                    {importResult.errors.length > 0 && (
                      <ul className="mt-2 text-xs text-red-400 list-disc pl-4 space-y-0.5">
                        {importResult.errors.slice(0, 5).map((e, i) => (
                          <li key={i}>Row {e.row}: {e.reason}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>…and {importResult.errors.length - 5} more</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border gap-2">
          <Button variant="outline" onClick={handleClose}>
            {importDone ? "Close" : "Cancel"}
          </Button>
          <div className="flex items-center gap-2">
            {importDone && (
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <Upload className="w-4 h-4" /> Import Another File
              </Button>
            )}
            {!importDone && fileName && validRows.length > 0 && (
              <Button onClick={handleImport} disabled={importing} className="gap-2 min-w-40">
                {importing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                ) : (
                  <><Upload className="w-4 h-4" /> Import {validRows.length} Customer{validRows.length !== 1 ? "s" : ""}</>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

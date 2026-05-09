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
import { bulkCreateUsers, BulkUserRow } from "@/lib/services/user.service";
import { auditLogService } from "@/lib/services/audit-log.service";
import { invalidateUsers } from "@/lib/hooks/use-settings";
import { useAppSettings } from "@/lib/context/app-settings-context";

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

// ── Template ──────────────────────────────────────────────────────
const TEMPLATE_HEADERS = ["name", "email", "password", "role", "phone"];
const TEMPLATE_SAMPLE: string[][] = [
  ["Rajesh Kumar", "rajesh@company.com", "Rajesh@123", "employee", "9876543210"],
  ["Priya Sharma", "priya@company.com", "Priya@456", "manager", "9123456789"],
  ["Amit Patel", "amit@company.com", "Amit@789", "employee", ""],
];

// ── Validation ────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ["admin", "manager", "employee"];

interface ParsedRow extends BulkUserRow {
  _rowIndex: number;
  _errors: string[];
  _valid: boolean;
}

function validateRow(raw: Record<string, string>, rowIndex: number, minPwdLength: number): ParsedRow {
  const name = (raw["name"] ?? raw["Name"] ?? "").trim();
  const email = (raw["email"] ?? raw["Email"] ?? "").trim().toLowerCase();
  const password = (raw["password"] ?? raw["Password"] ?? "").trim();
  const role = (raw["role"] ?? raw["Role"] ?? "").trim().toLowerCase();
  const phone = (raw["phone"] ?? raw["Phone"] ?? "").replace(/\D/g, "").trim();

  const errors: string[] = [];
  if (!name || name.length < 2) errors.push("Name required (min 2 chars)");
  if (!email || !EMAIL_RE.test(email)) errors.push("Valid email required");
  if (!password || password.length < minPwdLength)
    errors.push(`Password required (min ${minPwdLength} chars)`);
  if (!role || !VALID_ROLES.includes(role))
    errors.push(`Role must be one of: ${VALID_ROLES.join(", ")}`);

  return {
    name,
    email,
    password,
    role: (VALID_ROLES.includes(role) ? role : "employee") as BulkUserRow["role"],
    phone: phone || undefined,
    _rowIndex: rowIndex,
    _errors: errors,
    _valid: errors.length === 0,
  };
}

function normaliseRaw(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function downloadCSVTemplate() {
  const rows = [TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE];
  const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "users_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadExcelTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Users");
  XLSX.writeFile(wb, "users_import_template.xlsx");
}

// ── Role badge color ────────────────────────────────────────────
function roleBadge(role: string) {
  switch (role) {
    case "admin":
      return <Badge className="bg-red-500/15 text-red-400 border border-red-500/20 text-[10px]">admin</Badge>;
    case "manager":
      return <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/20 text-[10px]">manager</Badge>;
    default:
      return <Badge className="bg-green-500/15 text-green-400 border border-green-500/20 text-[10px]">employee</Badge>;
  }
}

// ── Component ─────────────────────────────────────────────────────
interface UserBulkImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserBulkImport({ open, onOpenChange }: UserBulkImportProps) {
  const { user } = useAuth();
  const { settings } = useAppSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const minPwdLength = settings?.password_min_length ?? 6;

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
  const processFile = useCallback(
    (file: File) => {
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
            if (result.data.length === 0) {
              toast.error("File is empty");
              return;
            }
            setRows(result.data.map((raw, i) => validateRow(raw, i + 2, minPwdLength)));
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
            const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
              defval: "",
            });
            if (data.length === 0) {
              toast.error("File is empty");
              return;
            }
            setRows(
              data.map((raw, i) => {
                const n: Record<string, string> = {};
                for (const k of Object.keys(raw))
                  n[k.toLowerCase().trim()] = normaliseRaw(raw[k]);
                return validateRow(n, i + 2, minPwdLength);
              })
            );
          } catch {
            toast.error("Failed to parse Excel file");
          }
        };
        reader.readAsArrayBuffer(file);
      }
    },
    [minPwdLength]
  );

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
    setImportProgress(5);

    try {
      const toImport: BulkUserRow[] = validRows.map(
        ({ name, email, password, role, phone }) => ({
          name,
          email,
          password,
          role,
          phone,
        })
      );

      const result = await bulkCreateUsers(toImport, (completed, total) => {
        setImportProgress(Math.round(5 + (completed / total) * 85));
      });

      setImportProgress(95);

      await auditLogService.logAction(
        user.id,
        user.name,
        "bulk_import",
        "users",
        `Bulk imported ${result.created} user(s) from ${fileName}. Skipped: ${result.skipped}.`
      );

      invalidateUsers();
      setImportProgress(100);
      setImportResult(result);
      setImportDone(true);

      toast.success(
        `${result.created} user${result.created !== 1 ? "s" : ""} imported`
      );
      if (result.skipped > 0) {
        toast.warning(
          `${result.skipped} row${result.skipped !== 1 ? "s" : ""} skipped`
        );
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
              Bulk Import Users
            </DialogTitle>
            <DialogDescription>
              Import multiple users at once from a CSV or Excel file. Each user
              will get a Supabase Auth account with login credentials.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-auto p-6 flex flex-col gap-4 min-h-0">
          {/* Template download */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground font-medium">
              Download template:
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-7 text-xs"
              onClick={downloadCSVTemplate}
            >
              <Download className="w-3.5 h-3.5" /> CSV Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-7 text-xs"
              onClick={downloadExcelTemplate}
            >
              <Download className="w-3.5 h-3.5" /> Excel Template (.xlsx)
            </Button>
          </div>

          {/* Column info */}
          <div className="flex flex-wrap gap-1.5 items-center text-xs text-muted-foreground">
            <span>Required:</span>
            {["name", "email", "password", "role"].map((col) => (
              <code
                key={col}
                className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono"
              >
                {col}
              </code>
            ))}
            <span className="ml-1">Optional:</span>
            <code className="bg-muted/50 px-1.5 py-0.5 rounded font-mono">
              phone
            </code>
          </div>

          <div className="text-xs text-muted-foreground border border-border rounded-lg p-2.5 bg-muted/30">
            <strong>Note:</strong> Valid roles are{" "}
            <code className="bg-muted px-1 rounded">admin</code>,{" "}
            <code className="bg-muted px-1 rounded">manager</code>,{" "}
            <code className="bg-muted px-1 rounded">employee</code>. Password
            minimum is <strong>{minPwdLength}</strong> characters. Each user
            will receive a Supabase Auth login.
          </div>

          {/* Upload zone */}
          {!fileName && (
            <div
              className={`
                border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
                ${
                  dragOver
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : "border-border hover:border-primary/50 hover:bg-muted/20"
                }
              `}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-3 pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileSpreadsheet className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-base">
                    {dragOver
                      ? "Drop the file here…"
                      : "Drag & drop your file here"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or{" "}
                    <span className="text-primary underline underline-offset-2">
                      click to browse
                    </span>{" "}
                    — supports <strong>.csv</strong>, <strong>.xlsx</strong>,{" "}
                    <strong>.xls</strong>
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
                <span className="font-medium text-sm truncate max-w-55">
                  {fileName}
                </span>
                <Badge variant="secondary">
                  {rows.length} row{rows.length !== 1 ? "s" : ""}
                </Badge>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 ml-auto"
                    onClick={handleReset}
                  >
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
                        <TableHead className="w-10 text-xs font-cabin uppercase">
                          #
                        </TableHead>
                        <TableHead className="text-xs font-cabin uppercase">
                          Name
                        </TableHead>
                        <TableHead className="text-xs font-cabin uppercase">
                          Email
                        </TableHead>
                        <TableHead className="text-xs font-cabin uppercase">
                          Role
                        </TableHead>
                        <TableHead className="text-xs font-cabin uppercase">
                          Phone
                        </TableHead>
                        <TableHead className="w-8 text-xs font-cabin uppercase">
                          OK
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow
                          key={row._rowIndex}
                          className={!row._valid ? "bg-red-500/5" : ""}
                        >
                          <TableCell className="text-xs text-muted-foreground">
                            {row._rowIndex}
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {row.name || (
                              <span className="text-red-400 italic">
                                missing
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.email || (
                              <span className="text-red-400 italic">
                                missing
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{roleBadge(row.role)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.phone || "—"}
                          </TableCell>
                          <TableCell>
                            {row._valid ? (
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            ) : (
                              <span title={row._errors.join("; ")}>
                                <AlertCircle className="w-4 h-4 text-red-400" />
                              </span>
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
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {invalidRows.length} row
                    {invalidRows.length !== 1 ? "s" : ""} will be skipped
                    (validation errors)
                    {showErrors ? (
                      <ChevronUp className="w-4 h-4 ml-auto" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    )}
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

              {/* Progress bar */}
              {importing && (
                <div className="space-y-1.5">
                  <Progress value={importProgress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground text-center">
                    Creating {validRows.length} user
                    {validRows.length !== 1 ? "s" : ""} (Supabase Auth +
                    Database)…
                  </p>
                </div>
              )}

              {/* Import complete */}
              {importDone && importResult && (
                <div className="border border-green-500/20 rounded-lg bg-green-500/5 p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-400">
                      Import complete
                    </p>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      <strong>{importResult.created}</strong> user
                      {importResult.created !== 1 ? "s" : ""} created.
                      {importResult.skipped > 0 && (
                        <>
                          {" "}
                          <strong>{importResult.skipped}</strong> skipped.
                        </>
                      )}
                    </p>
                    {importResult.errors.length > 0 && (
                      <ul className="mt-2 text-xs text-red-400 list-disc pl-4 space-y-0.5">
                        {importResult.errors.slice(0, 5).map((e, i) => (
                          <li key={i}>
                            Row {e.row}: {e.reason}
                          </li>
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
              <Button
                onClick={handleImport}
                disabled={importing}
                className="gap-2 min-w-40"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Importing…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Import {validRows.length}{" "}
                    User{validRows.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

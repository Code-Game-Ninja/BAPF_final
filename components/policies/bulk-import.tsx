"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Papa from "papaparse";
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Download,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { csvPolicyRowSchema, type CSVPolicyRow } from "@/lib/validations/policy";
import { policyService } from "@/lib/services/policy.service";
import { customerService } from "@/lib/services/customer.service";
import { auditLogService } from "@/lib/services/audit-log.service";


import { useAuth } from "@/lib/context/auth-context";
import { invalidatePolicies } from "@/lib/hooks/use-policies";

// ---- Types ----

interface BulkImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ParsedRow {
  raw: Record<string, string>;
  mapped: Partial<CSVPolicyRow>;
  errors: string[];
  status: "pending" | "success" | "error";
}

const REQUIRED_FIELDS = [
  { key: "policy_number", label: "Policy Number" },
  { key: "policy_type", label: "Policy Type" },
  { key: "customer_name", label: "Customer Name" },
  { key: "start_date", label: "Start Date" },
  { key: "end_date", label: "End Date" },
  { key: "premium_amount", label: "Premium Amount" },
] as const;

const OPTIONAL_FIELDS = [
  { key: "customer_phone", label: "Customer Phone" },
  { key: "customer_email", label: "Customer Email" },
  { key: "sum_insured", label: "Sum Insured" },
  { key: "insurer_name", label: "Insurer Name" },
  { key: "payment_frequency", label: "Payment Frequency" },
] as const;

const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

// ---- Component ----

export function BulkImport({ open, onOpenChange, onSuccess }: BulkImportProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Preview, 4: Import
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    total: number;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // ---- Step 1: Parse CSV ----
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Only CSV files are supported");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast.error(`CSV parse errors: ${results.errors[0].message}`);
          return;
        }

        const headers = results.meta.fields || [];
        const data = results.data as Record<string, string>[];

        if (data.length === 0) {
          toast.error("CSV file is empty");
          return;
        }

        setCsvHeaders(headers);
        setRawData(data);

        // Auto-map columns by fuzzy matching with common aliases
        const ALIASES: Record<string, string[]> = {
          policy_type: ["type", "policy type", "policytype", "insurance type"],
          customer_name: ["customer", "name", "customer name", "insured", "insured name", "proposer"],
          start_date: ["start date", "startdate", "from", "from date", "inception", "inception date", "policy start"],
          end_date: ["end date", "enddate", "to", "to date", "expiry", "expiry date", "policy end"],
          premium_amount: ["premium", "premium amount", "amount", "net premium", "gross premium", "total premium"],
          policy_number: ["policy number", "policy no", "policyno", "policy #"],
          customer_phone: ["phone", "mobile", "contact", "customer phone"],
          customer_email: ["email", "customer email", "mail"],
          sum_insured: ["sum insured", "suminsured", "si", "cover amount", "idv"],
          insurer_name: ["insurer", "insurer name", "insurance company", "company"],
          payment_frequency: ["frequency", "payment frequency", "payment mode"],
        };

        const autoMap: Record<string, string> = {};
        for (const field of ALL_FIELDS) {
          const norm = (s: string) => s.toLowerCase().replace(/[_\s\-#.]/g, "");
          const aliases = ALIASES[field.key] || [];

          const match = headers.find((h) => {
            const hNorm = norm(h);
            // Exact normalized match
            if (hNorm === norm(field.key)) return true;
            // Alias match (normalized)
            if (aliases.some((a) => hNorm === norm(a))) return true;
            // Substring match
            if (h.toLowerCase().includes(field.key.replace(/_/g, " ").toLowerCase())) return true;
            return false;
          });
          if (match) autoMap[field.key] = match;
        }
        setColumnMap(autoMap);

        toast.success(`Loaded ${data.length} rows from CSV`);
        setStep(2);
      },
      error: (err) => {
        toast.error(`Failed to parse CSV: ${err.message}`);
      },
    });
  }, []);

  // ---- Step 2: Validate Mapping ----
  function handleMappingDone() {
    // Validate required fields are mapped
    const missing = REQUIRED_FIELDS.filter((f) => !columnMap[f.key]);
    if (missing.length > 0) {
      toast.error(`Missing required mappings: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }

    // Map + validate rows
    const rows: ParsedRow[] = rawData.map((raw) => {
      const mapped: Partial<CSVPolicyRow> = {};
      for (const [fieldKey, csvHeader] of Object.entries(columnMap)) {
        if (csvHeader && raw[csvHeader] !== undefined) {
          // Trim whitespace from CSV values to avoid validation failures
          const val = typeof raw[csvHeader] === "string" ? raw[csvHeader].trim() : raw[csvHeader];
          (mapped as any)[fieldKey] = val;
        }
      }

      // Validate with Zod
      const result = csvPolicyRowSchema.safeParse(mapped);
      const errors: string[] = [];
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push(`${issue.path.join(".")}: ${issue.message}`);
        }
      }

      return { raw, mapped, errors, status: "pending" as const };
    });

    setParsedRows(rows);
    setStep(3);
  }

  // ---- Step 4: Import ----
  async function handleImport() {
    if (!user) return;
    setIsImporting(true);
    setStep(4);
    setImportProgress(0);

    const validRows = parsedRows.filter((r) => r.errors.length === 0);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        // Find or create customer
        let customerId = "";
        let customerName = row.mapped.customer_name || "";

        if (row.mapped.customer_phone) {
          const existing = await customerService.phoneExists(row.mapped.customer_phone);
          if (existing) {
            const results = await customerService.searchByNameOrPhone(row.mapped.customer_phone);
            if (results.length > 0) {
              customerId = results[0].id!;
              customerName = results[0].name;
            }
          }
        }

        if (!customerId && customerName) {
          // Create new customer
          const result = await customerService.createCustomer({
            name: customerName,
            phone: row.mapped.customer_phone || "",
            email: row.mapped.customer_email || "",
          } as any, user.uid);
          customerId = result.id;
        }

        // Create policy
        await policyService.createPolicy({
          policy_number: row.mapped.policy_number || undefined,
          policy_type: row.mapped.policy_type as any,
          customer_id: customerId,
          customer_name: customerName,
          start_date: new Date(row.mapped.start_date!),
          end_date: new Date(row.mapped.end_date!),
          premium_amount: parseFloat(row.mapped.premium_amount!) || 0,
          sum_insured: row.mapped.sum_insured ? parseFloat(row.mapped.sum_insured) : undefined,
          insurer_name: row.mapped.insurer_name || undefined,
          payment_frequency: row.mapped.payment_frequency as any || undefined,
          status: "active",
          assigned_to: user.uid,
          assigned_to_name: user.name || "",
          lockedForEmployee: false,
          verification_confirmed: false,
          branch_id: user.branch_id || undefined,
          created_by: user.uid,
        } as any);

        row.status = "success";
        success++;
      } catch (err: any) {
        row.status = "error";
        row.errors.push(err.message || "Import failed");
        failed++;
      }

      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setImportResults({ success, failed, total: validRows.length });
    setIsImporting(false);
    invalidatePolicies();

    // Audit log: bulk import
    if (user && success > 0) {
      auditLogService.logAction(
        user.uid, user.name || "", "bulk_import", "policies",
        `Bulk imported ${success} policies (${failed} failed) from CSV`
      ).catch(() => {});
    }

    if (success > 0) {
      toast.success(`Imported ${success} policies successfully`);
    }
    if (failed > 0) {
      toast.error(`${failed} policies failed to import`);
    }
  }

  // ---- Template Download ----
  function downloadTemplate() {
    const headers = ALL_FIELDS.map((f) => f.key).join(",");
    const sampleRow = [
      "MOT-2025-0001",
      "motor",
      "John Doe",
      "9876543210",
      "john@example.com",
      "2025-01-01",
      "2026-01-01",
      "15000",
      "500000",
      "Bajaj Allianz",
      "annual",
    ].join(",");

    const csv = `${headers}\n${sampleRow}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "policy_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClose() {
    setStep(1);
    setCsvHeaders([]);
    setRawData([]);
    setColumnMap({});
    setParsedRows([]);
    setImportProgress(0);
    setImportResults(null);
    onOpenChange(false);
    if (importResults && importResults.success > 0) {
      onSuccess?.();
    }
  }

  const validCount = parsedRows.filter((r) => r.errors.length === 0).length;
  const errorCount = parsedRows.filter((r) => r.errors.length > 0).length;

  const STEP_LABELS = ["Upload", "Map", "Preview", "Import"];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Bulk CSV Import
          </DialogTitle>
          <DialogDescription className="sr-only">
            Import policies from a CSV file
          </DialogDescription>
        </DialogHeader>

        {/* Step Progress Bar */}
        <div className="flex items-center justify-between px-2">
          {STEP_LABELS.map((label, i) => {
            const s = i + 1;
            const isActive = s === step;
            const isDone = s < step;
            return (
              <div key={s} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isDone
                        ? "bg-green-500 text-white"
                        : isActive
                          ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : s}
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </div>
                {s < 4 && (
                  <div className={`mx-2 h-0.5 flex-1 rounded transition-colors ${isDone ? "bg-green-500" : "bg-muted"}`} />
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Upload */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5 py-2"
            >
              <div
                className="group flex cursor-pointer flex-col items-center gap-4 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-12 transition-all hover:border-primary/50 hover:bg-primary/5"
                onClick={() => document.getElementById("csv-upload")?.click()}
              >
                <div className="rounded-full bg-primary/10 p-4 transition-colors group-hover:bg-primary/20">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">
                    Click to upload CSV file
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Supported format: .csv with headers
                  </p>
                </div>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  aria-label="Upload CSV file"
                  onChange={handleFileUpload}
                />
              </div>

              <div className="flex items-center justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Sample Template
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Map Columns */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="mb-3 rounded-lg border bg-muted/30 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Map your CSV columns to the policy fields below. Required fields are marked with <span className="font-semibold text-red-400">*</span>
                </p>
              </div>

              <div className="max-h-[50vh] overflow-y-auto rounded-lg border p-3">
                <div className="space-y-1.5">
                  {/* Required Fields */}
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Required Fields
                  </p>
                  {REQUIRED_FIELDS.map((field) => {
                    const isMapped = !!columnMap[field.key];
                    return (
                      <div
                        key={field.key}
                        className={`flex items-center gap-4 rounded-lg border px-4 py-2.5 transition-colors ${
                          isMapped
                            ? "border-green-500/30 bg-green-500/5"
                            : "border-red-500/30 bg-red-500/5"
                        }`}
                      >
                        <div className="flex w-44 shrink-0 items-center gap-2">
                          {isMapped ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-400" />
                          )}
                          <span className="text-sm font-medium">
                            {field.label}
                            <span className="ml-0.5 text-red-400">*</span>
                          </span>
                        </div>
                        <Select
                          value={columnMap[field.key] || ""}
                          onValueChange={(v) =>
                            setColumnMap((prev) => ({
                              ...prev,
                              [field.key]: v === "__none__" ? "" : v,
                            }))
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="— Select CSV column —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Skip —</SelectItem>
                            {csvHeaders.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}

                  {/* Optional Fields */}
                  <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Optional Fields
                  </p>
                  {OPTIONAL_FIELDS.map((field) => {
                    const isMapped = !!columnMap[field.key];
                    return (
                      <div
                        key={field.key}
                        className={`flex items-center gap-4 rounded-lg border px-4 py-2.5 transition-colors ${
                          isMapped ? "border-border bg-muted/20" : "border-transparent bg-transparent"
                        }`}
                      >
                        <div className="flex w-44 shrink-0 items-center gap-2">
                          {isMapped ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <div className="h-3.5 w-3.5" />
                          )}
                          <span className="text-sm text-muted-foreground">
                            {field.label}
                          </span>
                        </div>
                        <Select
                          value={columnMap[field.key] || ""}
                          onValueChange={(v) =>
                            setColumnMap((prev) => ({
                              ...prev,
                              [field.key]: v === "__none__" ? "" : v,
                            }))
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="— Skip —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Skip —</SelectItem>
                            {csvHeaders.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-4 mt-4">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleMappingDone}>
                  Preview Data <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Stats bar */}
              <div className="mb-3 flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">{validCount} valid</span>
                </div>
                {errorCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="text-sm font-medium">{errorCount} errors</span>
                  </div>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {parsedRows.length} total rows &middot; Only valid rows will be imported
                </span>
              </div>

              {/* Error alert when all rows fail */}
              {errorCount > 0 && validCount === 0 && (
                <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-red-300">
                        All rows failed validation
                      </p>
                      <p className="text-xs leading-relaxed text-red-400/80">
                        Go back and check that your CSV columns are correctly mapped.
                        Required: Policy Type, Customer Name, Start Date, End Date, Premium Amount.
                      </p>
                      {parsedRows[0]?.errors.length > 0 && (
                        <div className="rounded-md bg-red-950/50 p-2.5">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-400/60">Row 1 errors</p>
                          {parsedRows[0].errors.map((err, i) => (
                            <p key={i} className="text-xs text-red-300">&bull; {err}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Data table */}
              <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="sticky top-0 z-10 w-10 bg-muted/90 text-center">#</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-muted/90">Customer</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-muted/90">Type</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-muted/90 text-right">Premium</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-muted/90">Period</TableHead>
                      <TableHead className="sticky top-0 z-10 w-28 bg-muted/90 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 50).map((row, idx) => {
                      const hasError = row.errors.length > 0;
                      return (
                        <TableRow
                          key={idx}
                          className={hasError ? "bg-red-500/5" : ""}
                        >
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.mapped.customer_name || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-normal capitalize">
                              {row.mapped.policy_type || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.mapped.premium_amount
                              ? `₹${Number(row.mapped.premium_amount).toLocaleString("en-IN")}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.mapped.start_date || "—"} → {row.mapped.end_date || "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {!hasError ? (
                              <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/15">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Valid
                              </Badge>
                            ) : (
                              <div className="group relative inline-block">
                                <Badge className="cursor-help bg-red-500/15 text-red-400 hover:bg-red-500/15">
                                  <XCircle className="mr-1 h-3 w-3" /> Error
                                </Badge>
                                <div className="absolute bottom-full right-0 z-50 mb-2 hidden w-64 rounded-lg border border-red-500/30 bg-popover p-3 shadow-lg group-hover:block">
                                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Validation Errors
                                  </p>
                                  {row.errors.map((err, i) => (
                                    <p key={i} className="text-xs text-red-400">
                                      &bull; {err}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {parsedRows.length > 50 && (
                  <div className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
                    Showing first 50 of {parsedRows.length} rows
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t pt-4 mt-4">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={validCount === 0}
                  size="lg"
                >
                  Import {validCount} {validCount === 1 ? "Policy" : "Policies"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Importing / Results */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-4"
            >
              {isImporting ? (
                <div className="space-y-6 py-8 text-center" role="status" aria-live="polite">
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                  <div>
                    <p className="text-base font-semibold">Importing policies...</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Please don&apos;t close this window
                    </p>
                  </div>
                  <div className="mx-auto max-w-sm space-y-2">
                    <Progress value={importProgress} className="h-2" />
                    <p className="text-sm font-medium text-muted-foreground">{importProgress}%</p>
                  </div>
                </div>
              ) : importResults ? (
                <div className="space-y-6 py-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">Import Complete</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your policies have been imported successfully
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <div className="rounded-lg border bg-green-500/10 px-5 py-3 text-center">
                      <p className="text-2xl font-bold text-green-500">{importResults.success}</p>
                      <p className="text-xs text-muted-foreground">Imported</p>
                    </div>
                    {importResults.failed > 0 && (
                      <div className="rounded-lg border bg-red-500/10 px-5 py-3 text-center">
                        <p className="text-2xl font-bold text-red-400">{importResults.failed}</p>
                        <p className="text-xs text-muted-foreground">Failed</p>
                      </div>
                    )}
                  </div>
                  <Button onClick={handleClose} size="lg">
                    Done
                  </Button>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

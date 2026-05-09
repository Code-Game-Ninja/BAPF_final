"use client";

import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Download, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/context/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface BulkUploadWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobType: "gmc_members" | "fleet_vehicles";
  customerId: string;
  policyId?: string;
  onComplete?: () => void;
}

const STEPS = ["Upload", "Preview", "Validate", "Confirm"];

const GMC_TEMPLATE_HEADERS = ["Employee ID", "Name", "DOB", "Gender", "Mobile", "Email", "Department", "Designation"];
const FLEET_TEMPLATE_HEADERS = ["Registration Number", "Make", "Model", "Variant", "Fuel Type", "MFG Year", "Seating Capacity", "GVW", "IDV", "Vehicle Category"];

export function BulkUploadWizard({ open, onOpenChange, jobType, customerId, policyId, onComplete }: BulkUploadWizardProps) {
  const { session } = useAuth();
  const token = session?.access_token ?? "";

  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    total_rows: number;
    successful_rows: number;
    failed_rows: number;
    errors: Array<{ row: number; field: string; message: string }>;
    error_report_url?: string;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const templateHeaders = jobType === "gmc_members" ? GMC_TEMPLATE_HEADERS : FLEET_TEMPLATE_HEADERS;
  const apiEndpoint = jobType === "gmc_members"
    ? `/api/gmc/${customerId}/members/bulk`
    : `/api/fleet/${customerId}/vehicles/bulk`;

  const reset = () => {
    setStep(0);
    setFile(null);
    setRows([]);
    setHeaders([]);
    setUploading(false);
    setProgress(0);
    setResult(null);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const parseFile = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          toast.error("File must have at least a header row and one data row");
          return;
        }

        const hdrs = (jsonData[0] as string[]).map(h => String(h).trim());
        const dataRows = jsonData.slice(1).filter(row => row.some((cell: any) => cell !== null && cell !== undefined && cell !== ""));

        setHeaders(hdrs);
        setRows(dataRows);
        setFile(f);
        setStep(1);
      } catch {
        toast.error("Failed to parse file. Please use Excel (.xlsx) or CSV format.");
      }
    };
    reader.readAsArrayBuffer(f);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (policyId) formData.append("policy_id", policyId);

      setProgress(50);

      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      setProgress(90);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      setResult(data);
      setProgress(100);
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([templateHeaders]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${jobType}_template.xlsx`);
  };

  const previewRows = rows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wider">
            Bulk Upload — {jobType === "gmc_members" ? "GMC Members" : "Fleet Vehicles"}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step ? "bg-green-500 text-white"
                : i === step ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 0: Upload */}
        {step === 0 && (
          <div className="space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium text-sm">Drag & drop your file here, or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Supports Excel (.xlsx) and CSV (.csv) — max 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Need a template?</p>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                <Download className="w-4 h-4" /> Download Template
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Preview */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{file?.name}</span>
              <Badge variant="secondary">{rows.length} rows</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Preview of first 5 rows:</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {headers.map(h => (
                      <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i} className="border-border">
                      {headers.map((_, j) => (
                        <TableCell key={j} className="text-xs whitespace-nowrap">{String(row[j] ?? "")}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => setStep(2)} className="gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Validate & Upload */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium">Ready to upload</p>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>File: <strong className="text-foreground">{file?.name}</strong></span>
                <span>Rows: <strong className="text-foreground">{rows.length}</strong></span>
              </div>
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Processing...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={uploading}>Back</Button>
              <Button onClick={handleUpload} disabled={uploading} className="gap-2">
                {uploading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? "Uploading..." : "Upload & Process"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold">{result.total_rows}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Rows</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{result.successful_rows}</p>
                <p className="text-xs text-muted-foreground mt-1">Successful</p>
              </div>
              <div className={`${result.failed_rows > 0 ? "bg-red-500/10 border-red-500/20" : "bg-card border-border"} border rounded-xl p-4 text-center`}>
                <p className={`text-2xl font-bold ${result.failed_rows > 0 ? "text-red-400" : "text-muted-foreground"}`}>{result.failed_rows}</p>
                <p className="text-xs text-muted-foreground mt-1">Failed</p>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Errors ({result.errors.length})
                  </p>
                  {result.error_report_url && (
                    <Button variant="outline" size="sm" asChild className="gap-2">
                      <a href={result.error_report_url} download>
                        <Download className="w-4 h-4" /> Download Error Report
                      </a>
                    </Button>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Row</TableHead>
                        <TableHead className="text-xs">Field</TableHead>
                        <TableHead className="text-xs">Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.slice(0, 50).map((err, i) => (
                        <TableRow key={i} className="border-border">
                          <TableCell className="text-xs">{err.row}</TableCell>
                          <TableCell className="text-xs font-mono">{err.field}</TableCell>
                          <TableCell className="text-xs text-red-400">{err.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {result.successful_rows > 0 && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                {result.successful_rows} records imported successfully
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={reset}>Upload Another</Button>
              <Button onClick={() => { onComplete?.(); handleClose(); }}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

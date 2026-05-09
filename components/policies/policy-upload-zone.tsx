"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Sparkles,
  Loader2,
  X,
  User,
  UserPlus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getMaxFileSize } from "@/lib/helpers/storage";
import type { ExtractedPolicyData } from "@/lib/helpers/pdf-extractor";
import type { Customer } from "@/lib/types";

interface PolicyUploadZoneProps {
  uploadedFile: File | null;
  extractedData: ExtractedPolicyData | null;
  isExtracting: boolean;
  isUploading: boolean;
  uploadProgress: number;
  fuzzyMatches: Customer[];
  isAutoCreating?: boolean;
  autoCreatedCustomer?: Customer | null;
  onFileUpload: (file: File) => void;
  onClearFile: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onAutoCreateCustomer?: () => void;
}

/** Confidence color based on percentage */
function confidenceColor(confidence: number): string {
  if (confidence >= 0.75) return "text-green-600 dark:text-green-400";
  if (confidence >= 0.5) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function confidenceBg(confidence: number): string {
  if (confidence >= 0.75) return "bg-green-500/20 text-green-600 dark:text-green-400";
  if (confidence >= 0.5) return "bg-amber-500/20 text-amber-600 dark:text-amber-400";
  return "bg-red-500/20 text-red-600 dark:text-red-400";
}

/** Labeled extraction field for the summary panel */
function ExtractionField({ label, value }: { label: string; value: string | number | null }) {
  const filled = value !== null && value !== undefined && value !== "" && value !== 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      {filled ? (
        <FileCheck className="h-3 w-3 shrink-0 text-green-500" />
      ) : (
        <AlertTriangle className="h-3 w-3 shrink-0 text-muted-foreground/50" />
      )}
      <span className="w-24 shrink-0 font-medium text-muted-foreground">{label}</span>
      <span className={filled ? "text-foreground" : "italic text-muted-foreground/50"}>
        {filled ? String(value) : "Not found"}
      </span>
    </div>
  );
}

export function PolicyUploadZone({
  uploadedFile,
  extractedData,
  isExtracting,
  isUploading,
  uploadProgress,
  fuzzyMatches,
  isAutoCreating,
  autoCreatedCustomer,
  onFileUpload,
  onClearFile,
  onSelectCustomer,
  onAutoCreateCustomer,
}: PolicyUploadZoneProps) {
  const [showDetails, setShowDetails] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFileUpload(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file);
  }

  return (
    <>
      {/* PDF Upload Zone */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
      >
        {!uploadedFile ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/40 p-8 transition-colors hover:border-primary/60"
            onClick={() => document.getElementById("doc-upload-input")?.click()}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Drop file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Max {getMaxFileSize() / (1024 * 1024)}MB &bull; PDF or image &bull; Indian insurer formats
              </p>
            </div>
            <input
              id="doc-upload-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.bmp,.tiff,.tif,.gif"
              className="hidden"
              aria-label="Upload policy document"
              onChange={handleFileInput}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-muted-foreground/30 bg-card p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadedFile.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isExtracting && (
                  <Badge variant="outline" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Extracting...
                  </Badge>
                )}
                {extractedData && (
                  <Badge className="gap-1 bg-primary/20 text-primary">
                    <Sparkles className="h-3 w-3" />
                    {Math.round(extractedData.confidence * 100)}%
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onClearFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Extraction Details — expandable summary */}
      <AnimatePresence>
        {extractedData && !isExtracting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-border bg-card p-3"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
              onClick={() => setShowDetails((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Extraction Summary
                </span>
                <Badge className={`gap-1 ${confidenceBg(extractedData.confidence)}`}>
                  {Math.round(extractedData.confidence * 100)}% confidence
                </Badge>
              </div>
              {showDetails ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-3"
                >
                  {/* Policy Fields */}
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Policy Details
                    </p>
                    <div className="space-y-1">
                      <ExtractionField label="Policy No." value={extractedData.policyNumber} />
                      <ExtractionField label="Type" value={extractedData.policyType} />
                      <ExtractionField label="Insurer" value={extractedData.insurerName} />
                      <ExtractionField label="Premium" value={extractedData.premium ? `₹${extractedData.premium.toLocaleString("en-IN")}` : null} />
                      <ExtractionField label="Sum Insured" value={extractedData.sumInsured ? `₹${extractedData.sumInsured.toLocaleString("en-IN")}` : null} />
                      <ExtractionField label="Start Date" value={extractedData.startDate} />
                      <ExtractionField label="End Date" value={extractedData.endDate} />
                      <ExtractionField label="Frequency" value={extractedData.paymentFrequency} />
                    </div>
                  </div>

                  {/* Customer Fields */}
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Customer Details
                    </p>
                    <div className="space-y-1">
                      <ExtractionField label="Name" value={extractedData.customerName} />
                      <ExtractionField label="Phone" value={extractedData.customerPhone} />
                      <ExtractionField label="Email" value={extractedData.customerEmail} />
                      <ExtractionField label="Address" value={extractedData.customerAddress} />
                      <ExtractionField label="City" value={extractedData.customerCity} />
                      <ExtractionField label="State" value={extractedData.customerState} />
                      <ExtractionField label="Pincode" value={extractedData.customerPincode} />
                    </div>
                  </div>

                  {extractedData.confidence < 0.5 && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3" />
                      Low confidence — please verify all fields before saving.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fuzzy Customer Matches */}
      <AnimatePresence>
        {fuzzyMatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-primary/30 bg-primary/5 p-3"
          >
            <p className="mb-2 text-xs font-medium text-primary">
              Matching customers found:
            </p>
            <div className="space-y-1">
              {fuzzyMatches.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-primary/10"
                  onClick={() => onSelectCustomer(c)}
                >
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.uid}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-Create Customer — shown when extraction done but no matches found */}
      <AnimatePresence>
        {extractedData && !isExtracting && fuzzyMatches.length === 0 && extractedData.customerName && !autoCreatedCustomer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
          >
            <p className="mb-2 text-xs font-medium text-amber-600 dark:text-amber-400">
              No matching customer found. Auto-create from extracted data?
            </p>
            <div className="mb-2 space-y-1 text-xs text-muted-foreground">
              <p><span className="font-medium text-foreground">Name:</span> {extractedData.customerName}</p>
              {extractedData.customerPhone && (
                <p><span className="font-medium text-foreground">Phone:</span> {extractedData.customerPhone}</p>
              )}
              {extractedData.customerEmail && (
                <p><span className="font-medium text-foreground">Email:</span> {extractedData.customerEmail}</p>
              )}
              {extractedData.customerAddress && (
                <p><span className="font-medium text-foreground">Address:</span> {extractedData.customerAddress}</p>
              )}
              {extractedData.customerCity && (
                <p><span className="font-medium text-foreground">City:</span> {extractedData.customerCity}</p>
              )}
              {extractedData.customerState && (
                <p><span className="font-medium text-foreground">State:</span> {extractedData.customerState}</p>
              )}
              {extractedData.customerPincode && (
                <p><span className="font-medium text-foreground">Pincode:</span> {extractedData.customerPincode}</p>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 border-amber-500/50 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
              onClick={onAutoCreateCustomer}
              disabled={isAutoCreating}
            >
              {isAutoCreating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  Auto-Create Customer & Assign Policy
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-Created Customer Success */}
      <AnimatePresence>
        {autoCreatedCustomer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-green-500/30 bg-green-500/5 p-3"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-xs font-medium text-green-600 dark:text-green-400">
                Customer created & assigned automatically
              </p>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-sm">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{autoCreatedCustomer.name}</span>
              <Badge variant="outline" className="text-xs">{autoCreatedCustomer.uid}</Badge>
              {autoCreatedCustomer.phone && autoCreatedCustomer.phone !== "0000000000" && (
                <span className="text-xs text-muted-foreground">{autoCreatedCustomer.phone}</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Progress */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-1"
          >
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading PDF...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1.5" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { kycService } from "@/lib/services/kyc.service";
import { useAuth } from "@/lib/context/auth-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DOCUMENT_TYPES = [
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "gst", label: "GST Certificate" },
  { value: "address_proof", label: "Address Proof" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving License" },
  { value: "voter_id", label: "Voter ID" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "company_registration", label: "Company Registration" },
  { value: "other", label: "Other" },
];

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface KYCUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  onSuccess: () => void;
}

export function KYCUploadDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  onSuccess,
}: KYCUploadDialogProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      toast.error("Only PDF, JPEG, PNG, or WEBP files are allowed");
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error("File must be under 10MB");
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      toast.error("Only PDF, JPEG, PNG, or WEBP files are allowed");
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error("File must be under 10MB");
      return;
    }
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!documentType) { toast.error("Select a document type"); return; }
    if (!file) { toast.error("Choose a file to upload"); return; }

    setUploading(true);
    try {
      await kycService.upload(customerId, file, documentType, documentNumber, user.id);
      toast.success("KYC document uploaded successfully");
      handleClose();
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setDocumentType("");
    setDocumentNumber("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    onOpenChange(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-cabin uppercase tracking-wider text-sm">
            Upload KYC Document
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            For <span className="text-foreground font-medium">{customerName}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Document Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-cabin uppercase tracking-wider text-muted-foreground">
              Document Type <span className="text-red-400">*</span>
            </Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value}>
                    {dt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Number */}
          <div className="space-y-1.5">
            <Label className="text-xs font-cabin uppercase tracking-wider text-muted-foreground">
              Document Number
            </Label>
            <Input
              placeholder="e.g. XXXX XXXX XXXX (optional)"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
            />
          </div>

          {/* File Drop Zone */}
          <div className="space-y-1.5">
            <Label className="text-xs font-cabin uppercase tracking-wider text-muted-foreground">
              File <span className="text-red-400">*</span>
            </Label>

            {file ? (
              /* File selected preview */
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Drop zone */
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Upload className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-foreground font-medium">
                  Drop file here or <span className="text-primary">browse</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, JPEG, PNG, WEBP · Max 10MB
                </p>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading || !documentType || !file}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

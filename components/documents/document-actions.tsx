"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { documentService } from "@/lib/services/document.service";
import { auditLogService } from "@/lib/services/audit-log.service";

import { useAuth } from "@/lib/context/auth-context";
import { invalidateDocuments } from "@/lib/hooks/use-documents";
import { friendlyError } from "@/lib/helpers/friendly-error";
import { getMaxFileSize } from "@/lib/helpers/storage";
import {
  DOCUMENT_TYPES,
  documentUploadSchema,
  type DocumentUploadFormData,
} from "@/lib/validations/document";
import {
  Upload,
  Loader2,
  FileText,
  Image as ImageIcon,
  File,
  Trash2,
  Download,
  ExternalLink,
} from "lucide-react";
import { useStorageUrl } from "@/lib/hooks/use-storage-url";

// ---- Document Type Badge ----

export function DocumentTypeBadge({ type }: { type: string }) {
  const config = DOCUMENT_TYPES.find((d) => d.value === type);
  return (
    <Badge
      variant="outline"
      className="border-primary/40 text-primary bg-primary/10"
    >
      {config?.label || type}
    </Badge>
  );
}

// ---- File Size Formatter ----

export function formatFileSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---- File Type Icon ----

export function FileTypeIcon({
  fileName,
  className = "h-4 w-4",
}: {
  fileName: string;
  className?: string;
}) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileText className={`${className} text-red-400`} />;
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff"].includes(ext || ""))
    return <ImageIcon className={`${className} text-blue-400`} />;
  return <File className={`${className} text-muted-foreground`} />;
}

// ---- Upload Dialog ----

interface UploadDialogProps {
  userId: string;
  policyId?: string;
  customerId?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function UploadDialog({
  userId,
  policyId,
  customerId,
  trigger,
  onSuccess,
}: UploadDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    setValue,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<DocumentUploadFormData>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      document_type: "",
      policy_id: policyId || "",
      customer_id: customerId || "",
    },
  });

  const docType = watch("document_type");

  const onSubmit = async (data: DocumentUploadFormData) => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      await documentService.uploadAndCreate(
        selectedFile,
        {
          policy_id: data.policy_id || undefined,
          customer_id: data.customer_id || undefined,
          uploaded_by: userId,
          document_type: data.document_type,
        },
        (p) => setProgress(p)
      );

      toast.success("Document uploaded successfully");
      invalidateDocuments();
      if (user) {
        auditLogService.logAction(
          user.uid, user.name || "", "create", "documents",
          `Uploaded document (${data.document_type}) by ${userId}`
        ).catch(() => {});
      }
      setOpen(false);
      setSelectedFile(null);
      reset();
      onSuccess?.();
    } catch (err) {
      toast.error(
        friendlyError(err, "Upload failed")
      );
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Upload
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-border-strong">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Upload Document
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload a PDF or image (max {getMaxFileSize() / (1024 * 1024)} MB)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* File Input */}
          <div>
            <Label className="text-foreground">File</Label>
            <div
              className="mt-1 border-2 border-dashed border-border-strong rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.bmp,.tiff,.gif"
                className="hidden"
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileTypeIcon fileName={selectedFile.name} />
                  <span className="text-foreground text-sm">
                    {selectedFile.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    ({formatFileSize(selectedFile.size)})
                  </span>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">
                    Click to select a file
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Document Type */}
          <div>
            <Label className="text-foreground">Document Type</Label>
            <Select
              value={docType}
              onValueChange={(v) => setValue("document_type", v)}
            >
              <SelectTrigger className="bg-background border-border-strong text-foreground">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border-strong">
                {DOCUMENT_TYPES.map((dt) => (
                  <SelectItem
                    key={dt.value}
                    value={dt.value}
                    className="text-foreground"
                  >
                    {dt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.document_type && (
              <p className="text-red-400 text-sm mt-1">
                {errors.document_type.message}
              </p>
            )}
          </div>

          {/* Optional: Policy ID */}
          {!policyId && (
            <div>
              <Label className="text-foreground">
                Policy ID{" "}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                onChange={(e) => setValue("policy_id", e.target.value)}
                placeholder="Link to a policy"
                className="bg-background border-border-strong text-foreground"
              />
            </div>
          )}

          {/* Optional: Customer ID */}
          {!customerId && (
            <div>
              <Label className="text-foreground">
                Customer ID{" "}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                onChange={(e) => setValue("customer_id", e.target.value)}
                placeholder="Link to a customer"
                className="bg-background border-border-strong text-foreground"
              />
            </div>
          )}

          {/* Progress */}
          {uploading && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {progress}% uploaded
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-muted-foreground"
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploading || !selectedFile}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Delete Button ----

interface DeleteDocButtonProps {
  docId: string;
  onDeleted?: () => void;
}

export function DeleteDocButton({ docId, onDeleted }: DeleteDocButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

  const handleDelete = async () => {
    if (!isAdminOrManager) {
      toast.error("Only admins and managers can delete documents");
      return;
    }

    try {
      setLoading(true);
      await documentService.deleteWithFile(docId);
      toast.success("Document deleted");
      invalidateDocuments();
      if (user) {
        auditLogService.logAction(
          user.uid, user.name || "", "delete", "documents",
          `Deleted document ${docId}`
        ).catch(() => {});
      }
      onDeleted?.();
    } catch (err) {
      toast.error(
        friendlyError(err, "Delete failed")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-400 hover:text-red-300"
        disabled={loading}
        onClick={() => setShowConfirm(true)}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-card border-border-strong">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Document</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this document? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border-strong text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---- Download / View Buttons ----

export function DocActions({ filePath }: { filePath?: string }) {
  const { url: resolvedUrl, error } = useStorageUrl(filePath);

  if (error || !resolvedUrl) return null;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        asChild
      >
        <a href={resolvedUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
        </a>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        asChild
      >
        <a href={resolvedUrl} download>
          <Download className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}

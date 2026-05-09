"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, File, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { getAccessToken } from "@/lib/services/auth.service";
import { useLeadDocuments, invalidateLeads } from "@/lib/hooks/use-leads";
import { LeadDocument } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface LeadDocumentsPanelProps {
  leadId: string;
  onSuccess?: () => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LeadDocumentsPanel({ leadId, onSuccess }: LeadDocumentsPanelProps) {
  const { data: documents, isLoading, mutate } = useLeadDocuments(leadId);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only PDF and image files are allowed");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File must be under 10 MB");
      return;
    }

    setUploading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `leads/${leadId}/${Date.now()}_${safeName}`;

      // 1. Get signed upload URL from server
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ path: storagePath, mimeType: file.type, size: file.size }),
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({ error: "Upload init failed" }));
        throw new Error(err.error || "Failed to initialize upload");
      }
      const { uploadUrl, downloadUrl } = await uploadRes.json() as {
        uploadUrl: string;
        downloadUrl: string;
      };

      // 2. PUT file directly to Supabase Storage
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("File upload failed");

      // 3. Save metadata via lead documents API
      const metaRes = await fetch(`/api/leads/${leadId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          file_name: file.name,
          file_path: storagePath,
          file_url: downloadUrl,
          file_size: file.size,
          document_type: file.type === "application/pdf" ? "pdf" : "image",
        }),
      });
      if (!metaRes.ok) throw new Error("Failed to save document metadata");

      toast.success("Document uploaded");
      mutate();
      invalidateLeads();
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-cabin font-bold uppercase tracking-wider text-sm text-foreground flex items-center gap-2">
          <File className="w-4 h-4 text-primary" /> Documents
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs h-7"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileUp className="w-3.5 h-3.5" />
          )}
          {uploading ? "Uploading..." : "Upload"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !documents || documents.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No documents yet.</p>
      ) : (
        <div className="space-y-1.5">
          {documents.map((doc: LeadDocument) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <File className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-foreground truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)}
                    {doc.createdAt && ` · ${format(new Date(doc.createdAt), "dd MMM yyyy")}`}
                  </p>
                </div>
              </div>
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 flex-shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { format } from "date-fns";
import { FileText, Download, Trash2, Upload, Loader2, File } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/context/auth-context";
import { Button } from "@/components/ui/button";
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

interface TicketDocument {
  id: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  uploaded_by_name: string;
  created_at: string;
}

interface DocumentAttachmentsProps {
  ticketId: string;
  documents: TicketDocument[];
  onDocumentsChange: () => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileName: string): React.ElementType {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png"].includes(ext ?? "")) return File;
  if (ext === "pdf") return FileText;
  return File;
}

export function DocumentAttachments({
  ticketId,
  documents,
  onDocumentsChange,
}: DocumentAttachmentsProps) {
  const { session, role } = useAuth();
  const [deletingDoc, setDeletingDoc] = useState<TicketDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.access_token) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/service-desk/tickets/${ticketId}/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onDocumentsChange();
      toast.success("Document uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deletingDoc || !session?.access_token) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/service-desk/tickets/${ticketId}/documents/${deletingDoc.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeletingDoc(null);
      onDocumentsChange();
      toast.success("Document deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No documents attached.
          </p>
        ) : (
          documents.map(doc => {
            const Icon = getFileIcon(doc.file_name);
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-3 py-2 bg-muted/20 rounded-lg"
              >
                <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)} · {doc.uploaded_by_name} ·{" "}
                    {format(new Date(doc.created_at), "dd MMM yyyy")}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                  {(role === "admin" || role === "manager") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-400"
                      onClick={() => setDeletingDoc(doc)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Upload button */}
        <label className="cursor-pointer block">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
            onChange={handleUpload}
            className="hidden"
            disabled={isUploading}
          />
          <div className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg hover:bg-muted/30 transition-colors text-sm text-muted-foreground">
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isUploading ? "Uploading..." : "Upload Document"}
          </div>
        </label>
      </div>

      <AlertDialog open={!!deletingDoc} onOpenChange={open => !open && setDeletingDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{deletingDoc?.file_name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

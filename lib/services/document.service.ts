/**
 * Supabase Document Service
 */

import { supabase } from "@/lib/supabase/client";
import { Document } from "@/lib/types";

const TBL = "documents";

export async function createDocument(data: Omit<Document, "id" | "createdAt" | "updatedAt">): Promise<Document> {
  const now = new Date().toISOString();
  const { data: row, error } = await supabase
    .from(TBL)
    .insert({ ...data, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw error;
  return row as Document;
}

export async function updateDocument(id: string, data: Partial<Document>): Promise<void> {
  const { error } = await supabase
    .from(TBL)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from(TBL).delete().eq("id", id);
  if (error) throw error;
}

export async function getDocumentsByCustomer(customerId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from(TBL)
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Document[];
}

export async function getDocumentsByPolicy(policyId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from(TBL)
    .select("*")
    .eq("policy_id", policyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Document[];
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function makeStoragePath(fileName: string, uploadedBy?: string): string {
  const timestamp = Date.now();
  const owner = uploadedBy?.trim() || "unknown";
  return `documents/${owner}/${timestamp}_${safeFileName(fileName)}`;
}

async function putFileToSignedUrl(
  file: File,
  uploadUrl: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  if (typeof XMLHttpRequest !== "undefined" && onProgress) {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve();
          return;
        }
        reject(new Error(`Upload failed with status ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("Upload failed due to a network error"));
      xhr.send(file);
    });
    return;
  }

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!res.ok) {
    throw new Error(`Upload failed with status ${res.status}`);
  }

  onProgress?.(100);
}

export const documentService = {
  create: createDocument,
  update: updateDocument,
  delete: deleteDocument,
  getByCustomer: getDocumentsByCustomer,
  getByPolicy: getDocumentsByPolicy,
  getById: async (id: string): Promise<Document | null> => {
    const { data, error } = await supabase.from(TBL).select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as Document;
  },
  getStats: async () => {
    const { data, error } = await supabase.from(TBL).select("*");
    if (error) throw error;
    const docs = data ?? [];
    const total = docs.length;
    const totalSize = docs.reduce((s, d) => s + ((d.file_size as number) || 0), 0);
    const byType: Record<string, number> = {};
    docs.forEach((d) => {
      const t = (d.document_type as string) || "other";
      byType[t] = (byType[t] || 0) + 1;
    });
    return { total, totalSize, byType };
  },
  uploadAndCreate: async (
    _file: File | Partial<Omit<Document, "id" | "createdAt" | "updatedAt">>,
    data?: Partial<Omit<Document, "id" | "createdAt" | "updatedAt">>,
    _onProgress?: (progress: number) => void
  ): Promise<Document> => {
    const isFile = typeof File !== "undefined" && _file instanceof File;
    if (!isFile) {
      const docData = {
        file_path: "",
        file_url: "",
        file_name: "",
        uploaded_by: "",
        document_type: "other",
        ...(data ?? (_file as Partial<Omit<Document, "id" | "createdAt" | "updatedAt">>)),
      } as Omit<Document, "id" | "createdAt" | "updatedAt">;
      return createDocument(docData);
    }

    const file = _file as File;
    const { getAccessToken } = await import("@/lib/services/auth.service");
    const token = await getAccessToken();
    if (!token) throw new Error("Not authenticated");

    const { data: sessionData } = await supabase.auth.getUser();
    const uploadedBy = data?.uploaded_by || sessionData?.user?.id || "unknown";
    const storagePath = makeStoragePath(file.name, uploadedBy);

    const uploadInitRes = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        path: storagePath,
        mimeType: file.type,
        size: file.size,
      }),
    });

    if (!uploadInitRes.ok) {
      const err = await uploadInitRes.json().catch(() => ({ error: "Failed to initialize upload" }));
      throw new Error(err.error ?? "Failed to initialize upload");
    }

    const uploadInit = (await uploadInitRes.json()) as {
      uploadUrl: string;
      downloadUrl: string;
      storagePath: string;
    };

    await putFileToSignedUrl(file, uploadInit.uploadUrl, _onProgress);

    const docData = {
      file_path: uploadInit.storagePath,
      file_url: uploadInit.downloadUrl,
      file_name: file.name,
      file_size: file.size,
      uploaded_by: uploadedBy,
      document_type: data?.document_type || "other",
      policy_id: data?.policy_id,
      customer_id: data?.customer_id,
    } as Omit<Document, "id" | "createdAt" | "updatedAt">;

    return createDocument(docData);
  },
  deleteWithFile: async (id: string, _fileUrl?: string): Promise<void> => {
    if (_fileUrl) {
      try {
        // Extract the storage path from the URL or use as-is
        let storagePath = _fileUrl;
        if (_fileUrl.includes("/storage/v1/object/")) {
          const match = _fileUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^?]+)/);
          if (match) storagePath = decodeURIComponent(match[1]);
        }
        // storagePath format: "bucket/path" — split into bucket and path
        const slashIdx = storagePath.indexOf("/");
        if (slashIdx > 0) {
          const bucket = storagePath.substring(0, slashIdx);
          const path = storagePath.substring(slashIdx + 1);
          await supabase.storage.from(bucket).remove([path]);
        }
      } catch (storageErr) {
        console.warn("Failed to delete storage file:", storageErr);
      }
    }
    await deleteDocument(id);
  },
};

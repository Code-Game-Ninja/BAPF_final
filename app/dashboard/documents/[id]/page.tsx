"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/context/auth-context";
import { useDocument } from "@/lib/hooks/use-documents";
import { useStorageUrl } from "@/lib/hooks/use-storage-url";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DocumentTypeBadge,
  FileTypeIcon,
  formatFileSize,
  DeleteDocButton,
  DocActions,
} from "@/components/documents/document-actions";
import {
  ArrowLeft,
  FileText,
  Link2,
  Calendar,
  HardDrive,
  Loader2,
  Sparkles,
  Hash,
  Shield,
} from "lucide-react";

// ---- Preview (isolated so its hook doesn't affect parent hook count) ----

function DocumentPreview({ filePath, fileName }: { filePath?: string; fileName: string }) {
  const { url: resolvedUrl, isLoading: urlLoading, error } = useStorageUrl(filePath);

  const isImage = /\.(jpg|jpeg|png|webp|gif|bmp|tiff)$/i.test(fileName);
  const hasFileUrl = Boolean(resolvedUrl);

  if (urlLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <FileText className="h-16 w-16 mb-4" />
        <p>File not available in storage</p>
        <p className="text-xs mt-1">The file may have been deleted or moved.</p>
      </div>
    );
  }

  if (isImage && hasFileUrl) {
    return (
      <div className="overflow-hidden rounded-xl border border-border/70">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedUrl ?? undefined}
          alt={fileName}
          className="w-full h-auto max-h-150 object-contain bg-background"
        />
      </div>
    );
  }

  if (fileName.endsWith(".pdf") && hasFileUrl) {
    return (
      <div className="overflow-hidden rounded-xl border border-border/70">
        <iframe
          src={resolvedUrl ?? undefined}
          className="w-full h-150 bg-white"
          title={fileName}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <FileText className="h-16 w-16 mb-4" />
      <p>Preview not available for this file type</p>
      {hasFileUrl && (
        <Button
          variant="outline"
          className="mt-4 border-border-strong text-foreground"
          asChild
        >
          <a href={resolvedUrl ?? undefined} target="_blank" rel="noopener noreferrer">
            Open in new tab
          </a>
        </Button>
      )}
    </div>
  );
}

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user: dbUser } = useAuth();
  const router = useRouter();
  const isAdminOrManager = dbUser?.role === "admin" || dbUser?.role === "manager";

  const { data: doc, isLoading } = useDocument(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Document not found</p>
        <Button
          variant="ghost"
          className="mt-4 text-primary"
          onClick={() => router.push("/dashboard/documents")}
        >
          Back to Documents
        </Button>
      </div>
    );
  }

  const linkedCount = [doc.policy_id, doc.customer_id].filter(Boolean).length;
  const typeLabel = doc.document_type.replace(/_/g, " ");

  return (
    <motion.div className="mx-auto max-w-7xl space-y-6" {...pageTransition}>
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/documents")}
              className="border-border/80 bg-background/80 text-muted-foreground hover:bg-muted/60"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Documents
            </Button>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Document control panel
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <FileTypeIcon fileName={doc.file_name} className="h-5 w-5 shrink-0" />
              <h1 className="truncate text-2xl font-bold text-foreground font-heading uppercase tracking-[0.12em] sm:text-3xl">
                {doc.file_name}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">Document details, links, and preview.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DocumentTypeBadge type={doc.document_type} />
            <DocActions filePath={doc.file_path} />
            {isAdminOrManager && (
              <DeleteDocButton
                docId={doc.id}
                onDeleted={() => router.push("/dashboard/documents")}
              />
            )}
          </div>
        </div>
      </section>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {[
          {
            icon: Hash,
            label: "Record ID",
            value: doc.id.slice(0, 8),
            panel: "border-blue-500/30 bg-blue-500/10",
            text: "text-blue-700 dark:text-blue-300",
          },
          {
            icon: FileText,
            label: "Type",
            value: typeLabel,
            panel: "border-indigo-500/30 bg-indigo-500/10",
            text: "text-indigo-700 dark:text-indigo-300",
          },
          {
            icon: HardDrive,
            label: "File Size",
            value: formatFileSize(doc.file_size),
            panel: "border-emerald-500/30 bg-emerald-500/10",
            text: "text-emerald-700 dark:text-emerald-300",
          },
          {
            icon: Shield,
            label: "Linked Records",
            value: linkedCount,
            panel: "border-amber-500/30 bg-amber-500/10",
            text: "text-amber-700 dark:text-amber-300",
          },
        ].map((item) => (
          <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
            <Card className={item.panel}>
              <CardContent className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className={`mt-1 truncate text-sm font-semibold tracking-tight sm:text-base ${item.text}`}>
                      {item.value}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-card px-2 py-1 shadow-inner">
                    <item.icon className={`h-4 w-4 ${item.text}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Preview */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-lg font-heading">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentPreview filePath={doc.file_path} fileName={doc.file_name} />
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <div className="space-y-4">
          <Card className="rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground text-lg flex items-center gap-2 font-heading">
                <FileText className="h-5 w-5 text-primary" />
                File Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="File Name" value={doc.file_name} />
              <InfoRow label="Type" value={typeLabel} />
              <InfoRow label="Size" value={formatFileSize(doc.file_size)} />
              <InfoRow label="Storage Path" value={doc.file_path} mono />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground text-lg flex items-center gap-2 font-heading">
                <Link2 className="h-5 w-5 text-primary" />
                Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow
                label="Policy"
                value={doc.policy_id || "-"}
                link={
                  doc.policy_id
                    ? `/dashboard/policies/${doc.policy_id}`
                    : undefined
                }
              />
              <InfoRow
                label="Customer"
                value={doc.customer_id || "-"}
                link={
                  doc.customer_id
                    ? `/dashboard/customers/${doc.customer_id}`
                    : undefined
                }
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground text-lg flex items-center gap-2 font-heading">
                <Calendar className="h-5 w-5 text-primary" />
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Uploaded By" value={doc.uploaded_by} />
              <InfoRow label="Record ID" value={doc.id} mono />
              {doc.createdAt && (
                <InfoRow
                  label="Created"
                  value={new Date(doc.createdAt).toLocaleString("en-IN")}
                />
              )}
              {doc.updatedAt && (
                <InfoRow
                  label="Updated"
                  value={new Date(doc.updatedAt).toLocaleString("en-IN")}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

// ---- Helper ----

function InfoRow({
  label,
  value,
  mono,
  link,
}: {
  label: string;
  value: string;
  mono?: boolean;
  link?: string;
}) {
  const router = useRouter();

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
      <span className="shrink-0 text-xs uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      {link ? (
        <button
          className="truncate text-sm text-primary text-right hover:underline"
          onClick={() => router.push(link)}
        >
          {value}
        </button>
      ) : (
        <span
          className={`truncate text-sm text-foreground text-right break-all ${
            mono ? "font-mono text-xs" : ""
          }`}
        >
          {value}
        </span>
      )}
    </div>
  );
}

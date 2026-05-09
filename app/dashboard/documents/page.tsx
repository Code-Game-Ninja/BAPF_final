"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/context/auth-context";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  UploadDialog,
  DocumentTypeBadge,
  FileTypeIcon,
  formatFileSize,
  DeleteDocButton,
  DocActions,
} from "@/components/documents/document-actions";
import {
  useDocuments,
  useDocumentStats,
} from "@/lib/hooks/use-documents";
import { DOCUMENT_TYPES } from "@/lib/validations/document";
import {
  FolderOpen,
  Search,
  HardDrive,
  FileText,
  Loader2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";

export default function DocumentsPage() {
  const { user: dbUser } = useAuth();
  const router = useRouter();
  const isAdminOrManager = dbUser?.role === "admin" || dbUser?.role === "manager";

  const { data: documents, isLoading } = useDocuments();
  const { data: stats } = useDocumentStats();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Filter documents
  const filtered = (documents || []).filter((doc) => {
    const matchesSearch =
      !search ||
      doc.file_name.toLowerCase().includes(search.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(search.toLowerCase()) ||
      (doc.policy_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (doc.customer_id || "").toLowerCase().includes(search.toLowerCase());

    const matchesType =
      typeFilter === "all" || doc.document_type === typeFilter;

    return matchesSearch && matchesType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!dbUser) return null;

  return (
    <motion.div className="space-y-6" {...pageTransition}>
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Central file vault
            </div>
            <h1 className="text-2xl font-bold text-foreground font-heading uppercase tracking-[0.16em] sm:text-3xl">
              Documents
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage uploaded files, policy attachments, and customer documentation.
            </p>
          </div>
          <motion.div {...hoverLift}>
            <UploadDialog userId={dbUser.id} />
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            {
              icon: FileText,
              label: "Total Files",
              value: stats.total,
              panel: "border-blue-500/30 bg-blue-500/10",
              text: "text-blue-700 dark:text-blue-300",
            },
            {
              icon: HardDrive,
              label: "Total Size",
              value: formatFileSize(stats.totalSize),
              panel: "border-indigo-500/30 bg-indigo-500/10",
              text: "text-indigo-700 dark:text-indigo-300",
            },
            {
              icon: FolderOpen,
              label: "Types",
              value: Object.keys(stats.byType).length,
              panel: "border-emerald-500/30 bg-emerald-500/10",
              text: "text-emerald-700 dark:text-emerald-300",
            },
            {
              icon: FileText,
              label: "Policy Docs",
              value: stats.byType["policy_pdf"] || 0,
              panel: "border-amber-500/30 bg-amber-500/10",
              text: "text-amber-700 dark:text-amber-300",
            },
          ].map((item) => (
            <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
              <Card className={item.panel}>
                <CardContent className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className={`mt-1 text-xl font-semibold tracking-tight ${item.text}`}>{item.value}</p>
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
      )}

      {/* Filters */}
      <section className="rounded-2xl border border-border-strong/70 bg-card/90 p-3 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, type, policy, or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-border/80 bg-background/80 pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full border-border/80 bg-background/80 sm:w-45">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="border-border bg-popover">
              <SelectItem value="all">All Types</SelectItem>
              {DOCUMENT_TYPES.map((dt) => (
                <SelectItem key={dt.value} value={dt.value}>
                  {dt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Documents Table */}
      <Card className="overflow-hidden rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_12px_28px_rgba(47,62,64,0.06)]">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !filtered.length ? (
            <div className="border-dashed border-border-strong/60 bg-card/85 py-14 text-center">
              <FolderOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No documents found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/80 bg-muted/20">
                    <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">File</TableHead>
                    <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Type</TableHead>
                    <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Size</TableHead>
                    <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Linked To</TableHead>
                    <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Uploaded</TableHead>
                    <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className="cursor-pointer border-border/70 hover:bg-muted/35"
                      onClick={() =>
                        router.push(`/dashboard/documents/${doc.id}`)
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileTypeIcon fileName={doc.file_name} />
                          <span className="max-w-50 truncate text-sm text-foreground">
                            {doc.file_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DocumentTypeBadge type={doc.document_type} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {doc.policy_id
                          ? `Policy`
                          : doc.customer_id
                            ? `Customer`
                            : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {doc.createdAt
                          ? new Date(doc.createdAt)
                              .toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                          : "—"}
                      </TableCell>
                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-0.5">
                          <DocActions filePath={doc.file_path} />
                          {isAdminOrManager && (
                            <DeleteDocButton docId={doc.id} />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            aria-label="View document"
                            onClick={() =>
                              router.push(
                                `/dashboard/documents/${doc.id}`
                              )
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-border-strong/60 bg-card/80 p-3">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({filtered.length} documents)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border-border text-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border-border text-foreground"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

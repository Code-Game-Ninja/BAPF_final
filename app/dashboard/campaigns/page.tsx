"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/context/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
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
import { ExportButton } from "@/components/global";
import { campaignService } from "@/lib/services/campaign.service";
import { auditLogService } from "@/lib/services/audit-log.service";

import {
  useCampaigns,
  useCampaignStats,
  invalidateCampaigns,
} from "@/lib/hooks/use-campaigns";
import {
  createCampaignSchema,
  type CreateCampaignFormData,
  CAMPAIGN_CHANNELS,
  CAMPAIGN_STATUSES,
  getCampaignStatusConfig,
} from "@/lib/validations/campaign";
import {
  Megaphone,
  Plus,
  Search,
  Loader2,
  Shield,
  Pencil,
  Trash2,
  DollarSign,
  TrendingUp,
  Hash,
  Percent,
  Sparkles,
} from "lucide-react";
import { Campaign } from "@/lib/types";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";

export default function CampaignsPage() {
  const { user: dbUser } = useAuth();
  const isAdminOrManager = dbUser?.role === "admin" || dbUser?.role === "manager";

  const { data: campaigns, isLoading } = useCampaigns();
  const { data: stats } = useCampaignStats();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  if (!isAdminOrManager) {
    return (
      <div className="py-20 text-center">
        <Shield className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Admin or Manager access required</p>
      </div>
    );
  }

  // Filter
  const filtered = (campaigns || []).filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.channel.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || (c.status || "draft") === statusFilter;
    const matchesChannel =
      channelFilter === "all" || c.channel === channelFilter;
    return matchesSearch && matchesStatus && matchesChannel;
  });

  const handleDelete = async (id: string) => {
    if (dbUser?.role !== "admin") return;
    setDeleting(id);
    try {
      await campaignService.delete(id);
      toast.success("Campaign deleted");
      invalidateCampaigns();
      if (dbUser) {
        auditLogService.logAction(
          dbUser.uid || dbUser.id, dbUser.name || "", "delete", "campaigns",
          `Deleted campaign ${id}`
        ).catch(() => {});
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const channelLabel = (ch: string) =>
    CAMPAIGN_CHANNELS.find((c) => c.value === ch)?.label || ch;

  return (
    <motion.div className="space-y-6" {...pageTransition}>
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Live campaign desk
            </div>
            <h1 className="text-2xl font-bold text-foreground font-heading sm:text-3xl uppercase tracking-[0.16em]">
              Campaigns Command Center
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Manage marketing campaigns, monitor ROI, and optimize budget utilization across channels.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton
              data={filtered.map((c) => ({
                name: c.name,
                channel: c.channel,
                status: c.status || "draft",
                budget: c.budget || 0,
                linked_policies_count: c.linked_policies_count || 0,
                roi: c.roi !== undefined ? `${c.roi}%` : "",
              }))}
              filename="campaigns"
              columns={{
                name: "Name",
                channel: "Channel",
                status: "Status",
                budget: "Budget (₹)",
                linked_policies_count: "Linked Policies",
                roi: "ROI",
              }}
            />
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <motion.div {...hoverLift}>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    New Campaign
                  </Button>
                </motion.div>
              </DialogTrigger>
              <CampaignDialog
                onClose={() => setAddOpen(false)}
                userId={dbUser?.id || ""}
                userName={dbUser?.name || ""}
              />
            </Dialog>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      {stats && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            { icon: Hash, label: "Total Campaigns", value: stats.total, panel: "border-blue-500/30 bg-blue-500/10", text: "text-blue-700 dark:text-blue-300" },
            { icon: DollarSign, label: "Total Budget", value: formatCurrency(stats.totalBudget), panel: "border-indigo-500/30 bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300" },
            { icon: TrendingUp, label: "Premium Generated", value: formatCurrency(stats.totalPremiumGenerated), panel: "border-emerald-500/30 bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300" },
            { icon: Percent, label: "Overall ROI", value: `${stats.overallROI}%`, panel: "border-amber-500/30 bg-amber-500/10", text: "text-amber-700 dark:text-amber-300" },
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 border-border/80 bg-background/80"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-37.5 border-border/80 bg-background/80 text-foreground">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="border-border bg-popover">
              <SelectItem value="all">All Status</SelectItem>
              {CAMPAIGN_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-full sm:w-42.5 border-border/80 bg-background/80 text-foreground">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent className="border-border bg-popover">
              <SelectItem value="all">All Channels</SelectItem>
              {CAMPAIGN_CHANNELS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Data Table */}
      {isLoading ? (
        <div className="rounded-2xl border border-border-strong/70 bg-card/90 p-6">
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong/70 bg-card/80 text-center py-12">
          <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No campaigns found</p>
        </div>
      ) : (
        <Card className="overflow-hidden rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_12px_28px_rgba(47,62,64,0.06)]">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/80 bg-muted/20">
                  <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Name</TableHead>
                  <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Channel</TableHead>
                  <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Budget</TableHead>
                  <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Linked Policies</TableHead>
                  <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">ROI</TableHead>
                  <TableHead className="text-right font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const statusConfig = getCampaignStatusConfig(c.status || "draft");
                  return (
                    <TableRow key={c.id} className="border-border/70 hover:bg-muted/35">
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {channelLabel(c.channel)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const bg = statusConfig?.color ?? "#6b7280";
                          return (
                            <Badge
                              className="text-xs capitalize"
                              style={{ backgroundColor: bg, color: "#fff" }}
                            >
                              {statusConfig?.label ?? c.status}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(c.budget || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.linked_policies_count || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.roi !== undefined ? `${c.roi}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditCampaign(c)}
                            className="h-8 w-8 hover:bg-muted"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {dbUser?.role === "admin" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(c.id)}
                              disabled={deleting === c.id}
                              className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            >
                              {deleting === c.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      {editCampaign && (
        <Dialog open={!!editCampaign} onOpenChange={() => setEditCampaign(null)}>
          <CampaignDialog
            campaign={editCampaign}
            onClose={() => setEditCampaign(null)}
            userId={dbUser?.id || ""}
            userName={dbUser?.name || ""}
          />
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this campaign? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (deleteTarget) handleDelete(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

// ---- Campaign Dialog (Create / Edit) ----

function CampaignDialog({
  campaign,
  onClose,
  userId,
  userName,
}: {
  campaign?: Campaign;
  onClose: () => void;
  userId: string;
  userName: string;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCampaignFormData>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: campaign
      ? {
          name: campaign.name,
          channel: campaign.channel,
          budget: campaign.budget,
          status: campaign.status || "draft",
          start_date: campaign.start_date
            ? new Date(typeof campaign.start_date === "object" && campaign.start_date !== null && "toDate" in campaign.start_date ? (campaign.start_date as any).toDate() : campaign.start_date).toISOString().split("T")[0]
            : "",
          end_date: campaign.end_date
            ? new Date(typeof campaign.end_date === "object" && campaign.end_date !== null && "toDate" in campaign.end_date ? (campaign.end_date as any).toDate() : campaign.end_date).toISOString().split("T")[0]
            : "",
        }
      : { status: "draft", budget: 0 },
  });

  const onSubmit = async (data: CreateCampaignFormData) => {
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        channel: data.channel,
        budget: data.budget,
        status: data.status,
        created_by: userId,
      };
      if (data.start_date) {
        payload.start_date = new Date(data.start_date).toISOString();
      }
      if (data.end_date) {
        payload.end_date = new Date(data.end_date).toISOString();
      }

      if (campaign) {
        await campaignService.update(campaign.id, payload as Partial<Campaign>);
        toast.success("Campaign updated");
      } else {
        await campaignService.create(payload as Omit<Campaign, "id" | "createdAt" | "updatedAt">);
        toast.success("Campaign created");
      }
      invalidateCampaigns();
      // Audit log: campaign create/update
      auditLogService.logAction(
        userId, userName, campaign ? "update" : "create", "campaigns",
        `${campaign ? "Updated" : "Created"} campaign: ${data.name}`
      ).catch(() => {});
      onClose();
    } catch {
      toast.error("Failed to save campaign");
    }
  };

  return (
    <DialogContent className="max-w-lg border-border bg-card text-foreground rounded-3xl">
      <DialogHeader>
        <DialogTitle className="text-foreground">
          {campaign ? "Edit Campaign" : "New Campaign"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Campaign Name</Label>
          <Input
            {...register("name")}
            className="bg-background border-border text-foreground"
            placeholder="e.g. Summer Health Insurance Drive"
          />
          {errors.name && (
            <p className="text-red-400 text-xs">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Channel</Label>
            <Select
              value={watch("channel") || ""}
              onValueChange={(v) => setValue("channel", v)}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover">
                {CAMPAIGN_CHANNELS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.channel && (
              <p className="text-red-400 text-xs">{errors.channel.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Status</Label>
            <Select
              value={watch("status") || "draft"}
              onValueChange={(v) =>
                setValue("status", v as "draft" | "active" | "completed")
              }
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover">
                {CAMPAIGN_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground">Budget (₹)</Label>
          <Input
            type="number"
            {...register("budget", { valueAsNumber: true })}
            className="bg-background border-border text-foreground"
            placeholder="0"
          />
          {errors.budget && (
            <p className="text-red-400 text-xs">{errors.budget.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Start Date</Label>
            <Input
              type="date"
              {...register("start_date")}
              className="bg-background border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">End Date</Label>
            <Input
              type="date"
              {...register("end_date")}
              className="bg-background border-border text-foreground"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {campaign ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

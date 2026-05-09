"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/context/auth-context";
import { useAppSettings } from "@/lib/context/app-settings-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { userService } from "@/lib/services/user.service";
import { auditLogService } from "@/lib/services/audit-log.service";
import type { AuditLog } from "@/lib/types";
import type { LucideIcon } from "lucide-react";
import {
  Pencil,
  Mail,
  Phone,
  Building2,
  Shield,
  Clock,
  Loader2,
  Save,
  Activity,
  LogIn,
  LogOut,
  FileText,
  UserPlus,
  Settings,
  Sparkles,
  UserCircle,
} from "lucide-react";
import {
  pageTransition,
  staggerContainer,
  staggerItem,
  hoverLift,
} from "@/lib/helpers/animations";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  bio: z.string().max(500, "Bio must be under 500 characters").optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user: dbUser, refreshUser } = useAuth();
  const { settings } = useAppSettings();
  const [editOpen, setEditOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    if (!dbUser) return;
    auditLogService
      .getByUser(dbUser.id)
      .then((logs) => {
        setActivityLogs(logs.slice(0, 15));
      })
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, [dbUser]);

  if (!dbUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const roleBadgeColor =
    dbUser.role === "admin"
      ? "#ef4444"
      : dbUser.role === "manager"
        ? "#3b82f6"
        : "#10b981";

  const recentActions = activityLogs.length;
  const latestActionAt = activityLogs[0]?.createdAt;
  const initials = dbUser.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const formatDateTime = (value?: string | null) =>
    value
      ? new Date(value).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Never";

  return (
    <motion.div className="mx-auto max-w-6xl space-y-6" {...pageTransition}>
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Personal account hub
            </div>
            <h1 className="text-2xl font-bold text-foreground font-heading uppercase tracking-[0.16em] sm:text-3xl">
              My Profile
            </h1>
            <p className="text-sm text-muted-foreground">
              View account details, update personal information, and monitor your recent actions.
            </p>
          </div>
          <Badge
            style={{
              backgroundColor: roleBadgeColor + "20",
              color: roleBadgeColor,
              borderColor: roleBadgeColor + "40",
            }}
            variant="outline"
            className="w-fit"
          >
            {dbUser.role}
          </Badge>
        </div>
      </section>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {[
          {
            icon: UserCircle,
            label: "Status",
            value: dbUser.status.toUpperCase(),
            panel: "border-emerald-500/30 bg-emerald-500/10",
            text: "text-emerald-700 dark:text-emerald-300",
          },
          {
            icon: Shield,
            label: "Role",
            value: dbUser.role.toUpperCase(),
            panel: "border-indigo-500/30 bg-indigo-500/10",
            text: "text-indigo-700 dark:text-indigo-300",
          },
          {
            icon: Activity,
            label: "Recent Actions",
            value: recentActions,
            panel: "border-blue-500/30 bg-blue-500/10",
            text: "text-blue-700 dark:text-blue-300",
          },
          {
            icon: Clock,
            label: "Last Activity",
            value: latestActionAt
              ? formatDateTime(latestActionAt)
              : formatDateTime(dbUser.lastLoginAt),
            panel: "border-amber-500/30 bg-amber-500/10",
            text: "text-amber-700 dark:text-amber-300",
          },
        ].map((item) => (
          <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
            <div className={`${item.panel} rounded-xl border px-4 py-3`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p
                    className={`mt-1 line-clamp-2 text-sm font-semibold tracking-tight sm:text-base ${item.text}`}
                  >
                    {item.value}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-card px-2 py-1 shadow-inner">
                  <item.icon className={`h-4 w-4 ${item.text}`} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border-strong/70 bg-card/95 shadow-[0_12px_28px_rgba(47,62,64,0.07)]">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                  {dbUser.avatarUrl ? (
                    <img
                      src={dbUser.avatarUrl}
                      alt={dbUser.name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-primary">{initials}</span>
                  )}
                </div>
                <div>
                  <CardTitle className="text-xl text-foreground font-heading">
                    {dbUser.name}
                  </CardTitle>
                  <CardDescription className="break-all text-muted-foreground">
                    {dbUser.email}
                  </CardDescription>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge
                      style={{
                        backgroundColor: roleBadgeColor + "20",
                        color: roleBadgeColor,
                        borderColor: roleBadgeColor + "40",
                      }}
                      variant="outline"
                    >
                      {dbUser.role}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        dbUser.status === "active"
                          ? "border-green-600/40 bg-green-600/10 text-green-400"
                          : "border-border-strong text-muted-foreground"
                      }
                    >
                      {dbUser.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <motion.div {...hoverLift}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border/80 bg-background/80 text-foreground hover:bg-muted/60"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </motion.div>
                </DialogTrigger>
                <ProfileEditDialog
                  user={dbUser}
                  onClose={() => setEditOpen(false)}
                  onSaved={refreshUser}
                />
              </Dialog>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 border-t border-border-strong/70 pt-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailRow icon={Mail} label="Email" value={dbUser.email} />
              <DetailRow icon={Phone} label="Phone" value={dbUser.phone || "Not set"} />
              <DetailRow
                icon={Shield}
                label="Role"
                value={dbUser.role.charAt(0).toUpperCase() + dbUser.role.slice(1)}
              />
              {settings.multi_branch_enabled && (
                <DetailRow
                  icon={Building2}
                  label="Branch"
                  value={dbUser.branch_id || "Not assigned"}
                />
              )}
              <DetailRow
                icon={Clock}
                label="Last Login"
                value={formatDateTime(dbUser.lastLoginAt)}
              />
              <DetailRow
                icon={Clock}
                label="Member Since"
                value={
                  dbUser.createdAt
                    ? new Date(dbUser.createdAt).toLocaleDateString("en-IN")
                    : "-"
                }
              />
            </div>

            {dbUser.bio && (
              <div className="border-t border-border-strong/70 pt-3">
                <p className="mb-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Bio
                </p>
                <p className="whitespace-pre-wrap text-sm text-foreground">{dbUser.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border-strong/70 bg-card/95 shadow-[0_12px_28px_rgba(47,62,64,0.07)]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg text-foreground">Recent Activity</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              Latest login timestamps and module actions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : activityLogs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No activity recorded yet
              </p>
            ) : (
              <div className="space-y-2">
                {activityLogs.map((log) => {
                  const actionIcon = getActivityIcon(log.action);
                  const ts = log.createdAt;
                  const timeStr = ts ? formatDateTime(ts) : "-";

                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/60 p-2.5 transition-colors hover:bg-muted/40"
                    >
                      <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center">
                        {actionIcon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">
                          {log.action.replace(/_/g, " ").toUpperCase()}
                          {log.module ? (
                            <span className="text-muted-foreground"> - {log.module}</span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {log.details || "-"}
                        </p>
                      </div>
                      <span className="whitespace-nowrap text-xs text-muted-foreground shrink-0">
                        {timeStr}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

function getActivityIcon(action: string) {
  switch (action) {
    case "login":
      return <LogIn className="h-4 w-4 text-green-400" />;
    case "logout":
      return <LogOut className="h-4 w-4 text-muted-foreground" />;
    case "create":
      return <UserPlus className="h-4 w-4 text-blue-400" />;
    case "update":
      return <Settings className="h-4 w-4 text-amber-400" />;
    case "delete":
      return <FileText className="h-4 w-4 text-red-400" />;
    default:
      return <Activity className="h-4 w-4 text-primary" />;
  }
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
      <div className="h-9 w-9 shrink-0 rounded-lg border border-border/50 bg-background flex items-center justify-center">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground break-all">{value}</p>
      </div>
    </div>
  );
}

function ProfileEditDialog({
  user,
  onClose,
  onSaved,
}: {
  user: { id: string; name: string; phone?: string; bio?: string };
  onClose: () => void;
  onSaved?: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      phone: user.phone || "",
      bio: user.bio || "",
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await userService.update(user.id, {
        name: data.name,
        phone: data.phone || undefined,
        bio: data.bio || undefined,
      });
      toast.success("Profile updated");
      auditLogService
        .logAction(
          user.id,
          user.name || "",
          "update",
          "profile",
          `Updated profile: name=${data.name}`,
        )
        .catch(() => {});
      if (onSaved) onSaved();
      onClose();
    } catch {
      toast.error("Failed to update profile");
    }
  };

  return (
    <DialogContent className="max-w-md rounded-3xl border border-border-strong/80 bg-card/95 text-foreground shadow-[0_18px_36px_rgba(47,62,64,0.14)]">
      <DialogHeader>
        <DialogTitle className="font-heading uppercase tracking-[0.12em] text-foreground">
          Edit Profile
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Full Name</Label>
          <Input
            {...register("name")}
            className="border-border/80 bg-background/80 text-foreground"
          />
          {errors.name && (
            <p className="text-xs text-red-400">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground">Phone</Label>
          <Input
            {...register("phone")}
            className="border-border/80 bg-background/80 text-foreground"
            placeholder="+91 XXXXX XXXXX"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground">Bio</Label>
          <Textarea
            {...register("bio")}
            rows={4}
            className="resize-none border-border/80 bg-background/80 text-foreground"
            placeholder="A short bio about yourself..."
          />
          {errors.bio && <p className="text-xs text-red-400">{errors.bio.message}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-border/80 bg-background/80 text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

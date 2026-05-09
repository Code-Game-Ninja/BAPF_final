"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/context/auth-context";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useNotifications,
  useUnreadCount,
  useUsers,
  invalidateNotifications,
} from "@/lib/hooks/use-settings";
import { notificationService } from "@/lib/services/notification.service";
import { auditLogService } from "@/lib/services/audit-log.service";

import { NOTIFICATION_TYPES } from "@/lib/validations/settings";
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
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  Loader2,
  ExternalLink,
  Inbox,
  AlertTriangle,
  CalendarClock,
  UserPlus,
  Clock,
  DollarSign,
  Settings,
  Megaphone,
  Send,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Notification, NotificationType } from "@/lib/types";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";

const TYPE_ICONS: Record<string, React.ElementType> = {
  policy_expiry: AlertTriangle,
  renewal: CalendarClock,
  assignment: UserPlus,
  attendance: Clock,
  commission: DollarSign,
  system: Settings,
};

function getTypeColor(type: string): string {
  return NOTIFICATION_TYPES.find((t) => t.value === type)?.color || "#6b7280";
}

export default function NotificationsPage() {
  const { user: dbUser } = useAuth();
  const router = useRouter();
  const userId = dbUser?.id;
  const isAdminOrManager = dbUser?.role === "admin" || dbUser?.role === "manager";

  const { data: notifications, isLoading } = useNotifications();
  const { data: unreadCount } = useUnreadCount();

  const [tab, setTab] = useState("all");
  const [processing, setProcessing] = useState<string | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [notiPage, setNotiPage] = useState(1);
  const NOTI_PAGE_SIZE = 15;

  if (!dbUser) return null;

  const unread = (notifications || []).filter((n) => !n.read);
  const read = (notifications || []).filter((n) => n.read);

  const displayed =
    tab === "all"
      ? notifications || []
      : tab === "unread"
        ? unread
        : read;

  const notiTotalPages = Math.max(1, Math.ceil(displayed.length / NOTI_PAGE_SIZE));
  const displayedPage = displayed.slice((notiPage - 1) * NOTI_PAGE_SIZE, notiPage * NOTI_PAGE_SIZE);

  const markAsRead = async (id: string) => {
    try {
      setProcessing(id);
      await notificationService.markAsRead(id);
      invalidateNotifications();
    } catch {
      toast.error("Failed to mark as read");
    } finally {
      setProcessing(null);
    }
  };

  const markAllRead = async () => {
    if (!userId) return;
    try {
      setProcessing("all");
      await notificationService.markAllAsRead(userId);
      toast.success("All notifications marked as read");
      invalidateNotifications();
    } catch {
      toast.error("Failed to mark all as read");
    } finally {
      setProcessing(null);
    }
  };

  const clearAll = async () => {
    if (!userId) return;
    try {
      setProcessing("clear");
      await notificationService.clearAll(userId);
      toast.success("All notifications cleared");
      invalidateNotifications();
      auditLogService.logAction(
        dbUser.uid || dbUser.id, dbUser.name || "", "delete", "notifications",
        "Cleared all notifications"
      ).catch(() => {});
    } catch {
      toast.error("Failed to clear notifications");
    } finally {
      setProcessing(null);
    }
  };

  const deleteOne = async (id: string) => {
    try {
      setProcessing(id);
      await notificationService.delete(id);
      invalidateNotifications();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <motion.div className="space-y-6" {...pageTransition}>
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Alerts control room
            </div>
            <h1 className="text-2xl font-bold text-foreground font-heading uppercase tracking-[0.16em] sm:text-3xl">
              Notifications
            </h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount ? `${unreadCount} unread` : "All caught up"} - {(notifications || []).length} total alerts.
            </p>
          </div>
          <div className="flex items-center gap-2">
          {unread.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-muted"
              onClick={markAllRead}
              disabled={processing === "all"}
            >
              {processing === "all" ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-1.5" />
              )}
              Mark All Read
            </Button>
          )}
          {(notifications || []).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-border text-red-500 hover:bg-red-500/10"
              onClick={() => setClearAllOpen(true)}
              disabled={processing === "clear"}
            >
              {processing === "clear" ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1.5" />
              )}
              Clear All
            </Button>
          )}
          {isAdminOrManager && (
            <motion.div {...hoverLift}>
              <BroadcastNotificationDialog
                senderId={dbUser.id}
                senderName={dbUser.name || dbUser.email}
              />
            </motion.div>
          )}
        </div>
        </div>
      </section>

      {/* Stats */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-3 gap-3"
      >
        {[
          {
            icon: Bell,
            label: "Total",
            value: (notifications || []).length,
            panel: "border-blue-500/30 bg-blue-500/10",
            text: "text-blue-700 dark:text-blue-300",
          },
          {
            icon: Bell,
            label: "Unread",
            value: unread.length,
            panel: "border-amber-500/30 bg-amber-500/10",
            text: "text-amber-700 dark:text-amber-300",
          },
          {
            icon: BellOff,
            label: "Read",
            value: read.length,
            panel: "border-emerald-500/30 bg-emerald-500/10",
            text: "text-emerald-700 dark:text-emerald-300",
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

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setNotiPage(1); }}>
        <TabsList className="border border-border/80 bg-card/80 p-1">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
          >
            All
          </TabsTrigger>
          <TabsTrigger
            value="unread"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
          >
            Unread
            {unread.length > 0 && (
              <Badge className="ml-1.5 h-5 text-xs bg-primary text-primary-foreground">
                {unread.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="read"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
          >
            Read
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !displayed.length ? (
            <Card className="border border-dashed border-border-strong/70 bg-card/85">
              <CardContent className="text-center py-16">
                <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {tab === "unread"
                    ? "No unread notifications"
                    : "No notifications"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {displayedPage.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  processing={processing === n.id}
                  onMarkRead={() => markAsRead(n.id)}
                  onDelete={() => deleteOne(n.id)}
                  onNavigate={
                    n.link ? () => router.push(n.link!) : undefined
                  }
                />
              ))}
            </div>
          )}
          {notiTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-border-strong/60 bg-card/80 p-3">
              <p className="text-sm text-muted-foreground">
                Page {notiPage} of {notiTotalPages} ({displayed.length} notifications)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={notiPage <= 1}
                  onClick={() => setNotiPage((p) => p - 1)}
                  className="border-border text-foreground"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={notiPage >= notiTotalPages}
                  onClick={() => setNotiPage((p) => p + 1)}
                  className="border-border text-foreground"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Clear All AlertDialog */}
      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Notifications</AlertDialogTitle>
            <AlertDialogDescription>
              Delete all notifications? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => { await clearAll(); setClearAllOpen(false); }}>
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

// ---- Notification Card ----

function NotificationCard({
  notification: n,
  processing,
  onMarkRead,
  onDelete,
  onNavigate,
}: {
  notification: Notification;
  processing: boolean;
  onMarkRead: () => void;
  onDelete: () => void;
  onNavigate?: () => void;
}) {
  const color = getTypeColor(n.type);
  const Icon = TYPE_ICONS[n.type] || Bell;

  return (
    <Card
      className={`border-border-strong/70 bg-card/95 transition-colors shadow-[0_8px_20px_rgba(47,62,64,0.04)] ${
        !n.read ? "border-l-2" : ""
      }`}
      style={!n.read ? { borderLeftColor: color } : undefined}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 p-2 rounded-lg"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-foreground text-sm font-medium">
                {n.title}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0"
                style={{
                  borderColor: `${color}40`,
                  color,
                }}
              >
                {NOTIFICATION_TYPES.find((t) => t.value === n.type)?.label ||
                  n.type}
              </Badge>
              {!n.read && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            <p className="text-muted-foreground text-sm">{n.message}</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              {n.createdAt ? new Date(n.createdAt).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }) : ""}
            </p>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {onNavigate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="Go to linked page"
                onClick={onNavigate}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
            {!n.read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-green-400"
                aria-label="Mark as read"
                onClick={onMarkRead}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-400"
              aria-label="Delete notification"
              onClick={onDelete}
              disabled={processing}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Broadcast Notification Dialog (Admin) ----

function BroadcastNotificationDialog({
  senderId,
  senderName,
}: {
  senderId: string;
  senderName: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("system");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);

  const { data: allUsers } = useUsers();

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    setSending(true);
    try {
      // Get all active user IDs (including the sender so admin sees their own broadcast)
      const recipientIds = (allUsers || [])
        .filter((u) => u.status === "active")
        .map((u) => u.id);

      if (recipientIds.length === 0) {
        toast.error("No active users to notify");
        setSending(false);
        return;
      }

      await notificationService.broadcast(recipientIds, {
        title: title.trim(),
        message: message.trim(),
        type,
        ...(link.trim() ? { link: link.trim() } : {}),
      });

      toast.success(`Notification sent to ${recipientIds.length} users`);

      auditLogService
        .logAction(
          senderId,
          senderName,
          "create",
          "notifications",
          `Broadcast notification "${title}" to ${recipientIds.length} users`
        )
        .catch(() => {});

      // Reset form
      setTitle("");
      setMessage("");
      setType("system");
      setLink("");
      setOpen(false);
    } catch (err) {
      console.error("Broadcast failed:", err);
      toast.error("Failed to send broadcast notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Megaphone className="h-4 w-4 mr-1.5" />
          Broadcast
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Broadcast Notification
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Send a notification to all active users.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">
              Title <span className="text-red-400">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Office Closed Tomorrow"
              className="bg-background border-border text-foreground"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">
              Message <span className="text-red-400">*</span>
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your notification message..."
              className="bg-background border-border text-foreground min-h-25"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as NotificationType)}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {NOTIFICATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span style={{ color: t.color }}>{t.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">
              Link (optional)
            </Label>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/dashboard/policies"
              className="bg-background border-border text-foreground"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              Optional dashboard path users will navigate to when clicking.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send to All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

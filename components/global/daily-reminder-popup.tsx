"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { policyService } from "@/lib/services/policy.service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileText, X } from "lucide-react";

/**
 * DailyReminderPopup
 * Shows once per day on first login if the user (employee/manager) uploaded
 * zero policies yesterday. Dismissable once per day — tracked in the database.
 * Admins are excluded.
 */
export function DailyReminderPopup() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [yesterdayCount, setYesterdayCount] = useState(0);
  const [checking, setChecking] = useState(true);

  const checkAndShow = useCallback(async () => {
    if (!user || user.role === "admin") {
      setChecking(false);
      return;
    }

    // Defer to avoid the initial burst of reads during auth hydration
    await new Promise((r) => setTimeout(r, 3000));

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

    const MAX_RETRIES = 2;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // 1. Check if already dismissed today (use sessionStorage in mock mode)
        const dismissKey = `reminder_dismissed_${user.id}_${todayStr}`;
        if (sessionStorage.getItem(dismissKey)) {
          setChecking(false);
          return;
        }

        // 2. Check yesterday's policy uploads
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const dayBefore = new Date(yesterday);
        dayBefore.setHours(0, 0, 0, 0);
        const dayAfter = new Date(yesterday);
        dayAfter.setHours(23, 59, 59, 999);

        // Get policies created by this user yesterday
        const allPolicies = await policyService.getByAssignedTo(user.id);
        const yesterdayPolicies = allPolicies.filter((p) => {
          const createdAt: unknown = p.createdAt;
          if (!createdAt) return false;
          const raw = typeof createdAt === "object" && createdAt !== null && "toDate" in createdAt && typeof (createdAt as any).toDate === "function"
            ? (createdAt as any).toDate()
            : createdAt instanceof Date ? createdAt : new Date(createdAt as string | number);
          const date = raw instanceof Date ? raw : new Date(raw);
          if (isNaN(date.getTime())) return false;
          return date >= dayBefore && date <= dayAfter;
        });

        setYesterdayCount(yesterdayPolicies.length);

        if (yesterdayPolicies.length === 0) {
          setOpen(true);
        }
        break; // Success — exit retry loop
      } catch (error) {
        const msg = (error as Error)?.message || "";
        const isOffline =
          msg.includes("client is offline") || msg.includes("Failed to get document");
        if (isOffline && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
          continue;
        }
        // Non-offline error or retries exhausted — fail quietly
      }
    }
    setChecking(false);
  }, [user]);

  useEffect(() => {
    checkAndShow();
  }, [checkAndShow]);

  const handleDismiss = async () => {
    setOpen(false);

    if (!user) return;

    const todayStr = new Date().toISOString().split("T")[0];

    try {
      // Record dismissal in sessionStorage (mock mode)
      const dismissKey = `reminder_dismissed_${user.id}_${todayStr}`;
      sessionStorage.setItem(dismissKey, "1");
    } catch {
      // Best-effort — dismissal state is tracked locally by the Dialog closing
    }
  };

  // Don't show for admin or while checking
  if (!user || user.role === "admin" || checking) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
            DAILY POLICY REMINDER
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            You did not upload any policies yesterday.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <FileText className="h-8 w-8 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                NO POLICIES UPLOADED YESTERDAY
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please ensure you upload any pending policy documents today.
                Regular uploads help keep our records current and accurate.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            This reminder appears once per day and can be dismissed.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleDismiss}>
            <X className="h-4 w-4 mr-1" />
            DISMISS
          </Button>
          <Button
            size="sm"
            onClick={() => {
              handleDismiss();
              router.push("/dashboard/policies");
            }}
          >
            <FileText className="h-4 w-4 mr-1" />
            GO TO POLICIES
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useAuth } from "@/lib/context/auth-context";
import { useRouter } from "next/navigation";
import { useUnreadNotifications } from "@/lib/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

/**
 * Notification bell icon with unread badge.
 * Uses real-time onSnapshot for instant updates.
 */
export function NotificationBell() {
  const { user: dbUser } = useAuth();
  const router = useRouter();
  const { data: unread } = useUnreadNotifications();
  const count = unread?.length ?? 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative text-muted-foreground hover:text-foreground"
      onClick={() => router.push("/dashboard/notifications")}
      aria-label={count > 0 ? `Notifications (${count} unread)` : "Notifications"}
    >
      <Bell className="h-5 w-5" />
      {!!count && count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}

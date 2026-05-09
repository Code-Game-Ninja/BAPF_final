import useSWR, { mutate } from "swr";
import { notificationService } from "@/lib/services/notification.service";
import { settingsService } from "@/lib/services/settings.service";
import { userService } from "@/lib/services/user.service";
import { Notification, SystemConfig, User } from "@/lib/types";
import { useAuth } from "@/lib/context/auth-context";
import { useCollection } from "./use-supabase-query";
import { useRealtimeSubscription } from "./use-realtime";

// ─── Notification hooks ────────────────────────────────────────────

export function useNotifications() {
  const { user } = useAuth();
  return useCollection<Notification>(
    user ? `notifications-${user.id}` : null,
    "notifications",
    user ? [{ field: "user_id", operator: "==", value: user.id }] : undefined,
    "createdAt",
    "desc"
  );
}

export function useUnreadNotifications() {
  const { user } = useAuth();
  return useCollection<Notification>(
    user ? `notifications-unread-${user.id}` : null,
    "notifications",
    user
      ? [
          { field: "user_id", operator: "==", value: user.id },
          { field: "read", operator: "==", value: false },
        ]
      : undefined,
    "createdAt",
    "desc"
  );
}

export function useUnreadCount() {
  const { user } = useAuth();
  const swr = useSWR<number>(
    user ? `notifications-unread-count-${user.id}` : null,
    () => (user ? notificationService.getUnreadCount(user.id) : 0),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "notifications");
  return swr;
}

export function invalidateNotifications() {
  mutate(
    (key: unknown) => typeof key === "string" && key.startsWith("notification")
  );
}

// ─── Settings hooks ────────────────────────────────────────────────

export function useSettings() {
  const { user } = useAuth();
  const swr = useSWR<SystemConfig[]>(
    user ? "settings" : null,
    () => settingsService.getAll(),
    { revalidateOnFocus: true }
  );
  useRealtimeSubscription(swr, "system_config");
  return swr;
}

export function useSettingsByCategory(category: string | null) {
  const swr = useSWR<SystemConfig[]>(
    category ? `settings-cat-${category}` : null,
    () => (category ? settingsService.getByCategory(category) : []),
    { revalidateOnFocus: true }
  );
  useRealtimeSubscription(swr, "system_config");
  return swr;
}

export function useSettingValue<T = string>(key: string | null) {
  const swr = useSWR<T | null>(
    key ? `setting-val-${key}` : null,
    () => (key ? settingsService.getValue<T>(key) : null),
    { revalidateOnFocus: true }
  );
  useRealtimeSubscription(swr, "system_config");
  return swr;
}

export function invalidateSettings() {
  mutate(
    (key: unknown) => typeof key === "string" && key.startsWith("setting")
  );
}

// ─── User hooks ────────────────────────────────────────────────────

export function useUsers() {
  const { user } = useAuth();
  return useCollection<User>(
    user ? "users" : null,
    "users",
    undefined,
    "name",
    "asc"
  );
}

export function useActiveUsers() {
  const { user } = useAuth();
  return useCollection<User>(
    user ? "users-active" : null,
    "users",
    [{ field: "status", operator: "==", value: "active" }],
    "name",
    "asc"
  );
}

export function useUsersByRole(role: string | null) {
  return useCollection<User>(
    role ? `users-role-${role}` : null,
    "users",
    role ? [{ field: "role", operator: "==", value: role }] : undefined,
    "name",
    "asc"
  );
}

export function useUser(id: string | null) {
  const swr = useSWR<User | null>(
    id ? `user-${id}` : null,
    () => (id ? userService.getById(id) : null),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "users");
  return swr;
}

export function invalidateUsers() {
  mutate(
    (key: unknown) => typeof key === "string" && key.startsWith("user")
  );
}

/**
 * Supabase Notification Service
 */

import { supabase } from "@/lib/supabase/client";
import { Notification } from "@/lib/types";

const TBL = "notifications";

function mapRowToNotification(row: Record<string, unknown>): Notification {
  return {
    ...row,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  } as Notification;
}

export async function createNotification(data: Omit<Notification, "id" | "createdAt" | "updatedAt">): Promise<Notification> {
  const now = new Date().toISOString();
  const { data: row, error } = await supabase
    .from(TBL)
    .insert({ ...data, read: false, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw error;
  return mapRowToNotification(row as Record<string, unknown>);
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from(TBL)
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from(TBL)
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TBL)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function getUserNotifications(userId: string, maxResults = 20): Promise<Notification[]> {
  const { data, error } = await supabase
    .from(TBL)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(maxResults);
  if (error) throw error;
  return (data ?? []).map((d) => mapRowToNotification(d as Record<string, unknown>));
}

export const notificationService = {
  create: createNotification,
  markRead: markNotificationRead,
  markAsRead: markNotificationRead,
  markAllRead,
  markAllAsRead: markAllRead,
  getUnreadCount,
  getUserNotifications,
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from(TBL).delete().eq("id", id);
    if (error) throw error;
  },
  clearAll: async (userId: string): Promise<void> => {
    const { error } = await supabase.from(TBL).delete().eq("user_id", userId);
    if (error) throw error;
  },
  broadcast: async (
    recipientIds: string[],
    data: Omit<Notification, "id" | "user_id" | "read" | "createdAt" | "updatedAt">
  ): Promise<void> => {
    if (recipientIds.length === 0) return;
    const now = new Date().toISOString();
    const { createdAt, updatedAt, ...rest } = data as Record<string, unknown>;
    void createdAt; void updatedAt;
    const rows = recipientIds.map((uid) => ({
      ...rest,
      user_id: uid,
      read: false,
      created_at: now,
      updated_at: now,
    }));
    const { error } = await supabase.from(TBL).insert(rows);
    if (error) throw error;
  },
};

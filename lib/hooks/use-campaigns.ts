import useSWR, { mutate } from "swr";
import { campaignService, archiveService } from "@/lib/services/campaign.service";
import { Campaign, Policy } from "@/lib/types";
import { useAuth } from "@/lib/context/auth-context";
import { useCollection } from "./use-supabase-query";
import { useRealtimeSubscription } from "./use-realtime";

// ─── Campaign hooks ────────────────────────────────────────────────

export function useCampaigns() {
  const { user } = useAuth();
  return useCollection<Campaign>(
    user ? "campaigns" : null,
    "campaigns",
    undefined,
    "createdAt",
    "desc"
  );
}

export function useCampaignsByStatus(status: string | null) {
  const { user } = useAuth();
  return useCollection<Campaign>(
    user && status ? `campaigns-status-${status}` : null,
    "campaigns",
    status ? [{ field: "status", operator: "==", value: status }] : undefined,
    "createdAt",
    "desc"
  );
}

export function useCampaign(id: string | null) {
  const { user } = useAuth();
  const swr = useSWR<Campaign | null>(
    user && id ? `campaign-${id}` : null,
    () => (id ? campaignService.getById(id) : null),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "campaigns", id ? `id=eq.${id}` : undefined);
  return swr;
}

export function useCampaignStats() {
  const { user } = useAuth();
  const swr = useSWR(
    user ? "campaign-stats" : null,
    () => campaignService.getStats(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "campaigns");
  return swr;
}

export function invalidateCampaigns() {
  mutate(
    (key: string) => typeof key === "string" && key.startsWith("campaign"),
    undefined,
    { revalidate: true }
  );
}

// ─── Archive hooks ─────────────────────────────────────────────────

export function useArchives() {
  const { user } = useAuth();
  const swr = useSWR<Policy[]>(
    user ? "archives" : null,
    () => archiveService.getAll(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "policies");
  return swr;
}

export function useArchivedPolicies() {
  const { user } = useAuth();
  const swr = useSWR<Policy[]>(
    user ? "archives-archived" : null,
    () => archiveService.getByStatus("archived"),
    { revalidateOnFocus: true }
  );
  useRealtimeSubscription(swr, "policies");
  return swr;
}

export function useCancelledPolicies() {
  const { user } = useAuth();
  const swr = useSWR<Policy[]>(
    user ? "archives-cancelled" : null,
    () => archiveService.getByStatus("cancelled"),
    { revalidateOnFocus: true }
  );
  useRealtimeSubscription(swr, "policies");
  return swr;
}

export function useExpiredPolicies() {
  const { user } = useAuth();
  const swr = useSWR<Policy[]>(
    user ? "archives-expired" : null,
    () => archiveService.getByStatus("expired"),
    { revalidateOnFocus: true }
  );
  useRealtimeSubscription(swr, "policies");
  return swr;
}

export function useArchiveStats() {
  const { user } = useAuth();
  const swr = useSWR(
    user ? "archive-stats" : null,
    () => archiveService.getStats(),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "policies");
  return swr;
}

export function invalidateArchives() {
  mutate(
    (key: string) =>
      typeof key === "string" && (key.startsWith("archive") || key.startsWith("archives")),
    undefined,
    { revalidate: true }
  );
}

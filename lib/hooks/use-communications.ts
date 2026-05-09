"use client";
import useSWR from "swr";
import { communicationService } from "@/lib/services/communication.service";

export function useCommunicationTemplates(filters?: Parameters<typeof communicationService.listTemplates>[0]) {
  return useSWR(["comm-templates", filters], () => communicationService.listTemplates(filters), { revalidateOnFocus: false });
}

export function useCommunicationTemplate(id: string | null) {
  return useSWR(id ? ["comm-template", id] : null, () => communicationService.getTemplateById(id!), { revalidateOnFocus: false });
}

export function useCommunicationLogs(filters?: Parameters<typeof communicationService.listLogs>[0]) {
  return useSWR(["comm-logs", filters], () => communicationService.listLogs(filters), { revalidateOnFocus: false });
}

export function useCommunicationStats() {
  return useSWR("comm-stats", () => communicationService.getStats(), { revalidateOnFocus: false });
}

"use client";
import useSWR from "swr";
import { proposalService } from "@/lib/services/proposal.service";

export function useProposals(filters?: Parameters<typeof proposalService.list>[0]) {
  return useSWR(["proposals", filters], () => proposalService.list(filters), { revalidateOnFocus: false });
}

export function useProposal(id: string | null) {
  return useSWR(id ? ["proposal", id] : null, () => proposalService.getById(id!), { revalidateOnFocus: false });
}

export function useProposalTimeline(proposalId: string | null) {
  return useSWR(proposalId ? ["proposal-timeline", proposalId] : null, () => proposalService.getTimeline(proposalId!), { revalidateOnFocus: false });
}

export function useProposalStats() {
  return useSWR("proposal-stats", () => proposalService.getStats(), { revalidateOnFocus: false });
}

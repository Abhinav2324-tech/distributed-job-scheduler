import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { WorkerRow } from "../types";

// Workers aren't org-scoped in the schema (shared operational infra, not
// tenant data - see packages/db design notes), so there's no socket room to
// join for them. Plain polling is simpler than reasoning about a global
// broadcast channel, and a worker fleet changes slowly enough that a few
// seconds of staleness is imperceptible.
export function useWorkers(status?: string) {
  return useQuery({
    queryKey: ["workers", status],
    queryFn: () => apiFetch<{ data: WorkerRow[] }>(`/api/workers${status ? `?status=${status}` : ""}`),
    refetchInterval: 4000,
  });
}

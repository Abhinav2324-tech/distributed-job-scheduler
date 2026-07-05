import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WS_EVENTS } from "@jobscheduler/shared";
import { apiFetch } from "../lib/api";
import { useSocketEvent } from "./useSocketEvent";
import type { Overview } from "../types";

export function useOverview() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["overview"],
    queryFn: () => apiFetch<Overview>("/api/overview"),
    // Polling is the resilience fallback; the socket listener below is what
    // makes it feel live. QUEUE_STATS (not JOB_UPDATED) drives invalidation
    // here - it's emitted once per active queue per broadcaster tick rather
    // than once per changed job, which is plenty granular for an aggregate
    // view and avoids a refetch storm when many jobs change at once.
    refetchInterval: 10000,
  });

  useSocketEvent(WS_EVENTS.QUEUE_STATS, () => {
    queryClient.invalidateQueries({ queryKey: ["overview"] });
  });

  return query;
}

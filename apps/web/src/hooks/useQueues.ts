import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { WS_EVENTS } from "@jobscheduler/shared";
import { apiFetch } from "../lib/api";
import { useSocketEvent } from "./useSocketEvent";
import type { Queue } from "../types";

interface QueueStatsEvent {
  queueId: string;
  queued: number;
  running: number;
  failed: number;
  completedLastHour: number;
}

export function useQueues() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["queues"],
    queryFn: () => apiFetch<{ data: Queue[] }>("/api/queues"),
    refetchInterval: 10000,
  });

  // Patches the affected row directly instead of invalidating-and-refetching
  // the whole list - the numbers update live without a network round trip.
  useSocketEvent<QueueStatsEvent>(WS_EVENTS.QUEUE_STATS, (payload) => {
    queryClient.setQueryData<{ data: Queue[] } | undefined>(["queues"], (old) => {
      if (!old) return old;
      return {
        data: old.data.map((q) =>
          q.id === payload.queueId
            ? {
                ...q,
                stats: {
                  completed: q.stats?.completed ?? 0,
                  deadLetter: q.stats?.deadLetter ?? 0,
                  queued: payload.queued,
                  running: payload.running,
                  failed: payload.failed,
                  completedLastHour: payload.completedLastHour,
                },
              }
            : q,
        ),
      };
    });
  });

  return query;
}

export interface CreateQueueInput {
  name: string;
  priority?: number;
  maxConcurrency?: number;
  retryPolicyId?: string;
}

export function useCreateQueue(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQueueInput) =>
      apiFetch<Queue>(`/api/projects/${projectId}/queues`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["queues"] }),
  });
}

export interface UpdateQueueInput {
  priority?: number;
  maxConcurrency?: number;
  retryPolicyId?: string | null;
}

export function useUpdateQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateQueueInput }) =>
      apiFetch<Queue>(`/api/queues/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["queues"] }),
  });
}

export function useSetQueuePaused() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isPaused }: { id: string; isPaused: boolean }) =>
      apiFetch<Queue>(`/api/queues/${id}/${isPaused ? "pause" : "resume"}`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["queues"] }),
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { WS_EVENTS } from "@jobscheduler/shared";
import { apiFetch } from "../lib/api";
import { useSocketEvent } from "./useSocketEvent";
import type { Job, JobWithHistory, PaginationResult } from "../types";

export interface JobFilters {
  status?: string;
  queueId?: string;
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
}

function buildQuery(filters: JobFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.queueId) params.set("queueId", filters.queueId);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params.toString();
}

export function useJobs(filters: JobFilters) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["jobs", filters],
    queryFn: () => apiFetch<PaginationResult<Job>>(`/api/jobs?${buildQuery(filters)}`),
    refetchInterval: 5000,
  });

  useSocketEvent(WS_EVENTS.JOB_UPDATED, () => {
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
  });

  return query;
}

export function useJob(id: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["job", id],
    queryFn: () => apiFetch<JobWithHistory>(`/api/jobs/${id}`),
    enabled: !!id,
  });

  useSocketEvent<{ jobId: string }>(WS_EVENTS.JOB_UPDATED, (payload) => {
    if (payload.jobId === id) {
      queryClient.invalidateQueries({ queryKey: ["job", id] });
    }
  });

  return query;
}

export interface CreateJobInput {
  jobType: string;
  payload?: unknown;
  runAt?: string;
  idempotencyKey?: string;
}

export function useCreateJob(queueId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJobInput) =>
      apiFetch<{ job: Job; deduped: boolean }>(`/api/queues/${queueId}/jobs`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["queues"] });
    },
  });
}

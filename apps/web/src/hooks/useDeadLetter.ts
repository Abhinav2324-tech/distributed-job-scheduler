import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { DeadLetterEntry, Job, PaginationResult } from "../types";

export function useDeadLetterEntries(page = 1) {
  return useQuery({
    queryKey: ["dlq", page],
    queryFn: () => apiFetch<PaginationResult<DeadLetterEntry>>(`/api/dlq?page=${page}`),
    refetchInterval: 8000,
  });
}

export function useRetryDeadLetterEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<Job>(`/api/dlq/${id}/retry`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dlq"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

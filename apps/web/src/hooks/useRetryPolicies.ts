import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { RetryPolicy } from "../types";

export function useRetryPolicies(projectId: string | undefined) {
  return useQuery({
    queryKey: ["retry-policies", projectId],
    queryFn: () => apiFetch<RetryPolicy[]>(`/api/projects/${projectId}/retry-policies`),
    enabled: !!projectId,
  });
}

export interface CreateRetryPolicyInput {
  name: string;
  maxRetries?: number;
  backoffStrategy?: "FIXED" | "LINEAR" | "EXPONENTIAL";
  baseDelaySeconds?: number;
  maxDelaySeconds?: number;
}

export function useCreateRetryPolicy(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRetryPolicyInput) =>
      apiFetch<RetryPolicy>(`/api/projects/${projectId}/retry-policies`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["retry-policies", projectId] }),
  });
}

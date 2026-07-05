import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { PaginationResult, Project } from "../types";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch<PaginationResult<Project>>("/api/projects?pageSize=100"),
  });
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      apiFetch<Project>("/api/projects", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

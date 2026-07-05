import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
});

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  includeArchived: z.coerce.boolean().default(false),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

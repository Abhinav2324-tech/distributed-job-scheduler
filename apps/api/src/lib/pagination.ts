import type { OffsetPaginationResult } from "@jobscheduler/shared";

export function buildPaginationResult<T>(
  data: T[],
  totalItems: number,
  page: number,
  pageSize: number,
): OffsetPaginationResult<T> {
  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  };
}

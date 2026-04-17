import { useQuery, UseQueryOptions } from '@tanstack/react-query';

/**
 * Custom hook for list queries with sensible defaults
 * - Retries only once on error
 * - Caches for 5 minutes
 * - Keeps in memory for 10 minutes
 * - Prevents excessive refetching
 */
export function useListQuery<TData = unknown, TError = unknown>(
  options: Omit<UseQueryOptions<TData, TError>, 'retry' | 'staleTime' | 'gcTime'>
) {
  return useQuery<TData, TError>({
    ...options,
    retry: 1, // Retry only once on error
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  });
}

/**
 * Custom hook for detail queries (single resource)
 * - Retries once on error
 * - Caches for 10 minutes
 * - Keeps in memory for 30 minutes
 */
export function useDetailQuery<TData = unknown, TError = unknown>(
  options: Omit<UseQueryOptions<TData, TError>, 'retry' | 'staleTime' | 'gcTime'>
) {
  return useQuery<TData, TError>({
    ...options,
    retry: 1, // Retry only once on error
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });
}

/**
 * Custom hook for report/stats queries
 * - Retries once on error
 * - Caches for 15 minutes
 * - Keeps in memory for 30 minutes
 */
export function useReportQuery<TData = unknown, TError = unknown>(
  options: Omit<UseQueryOptions<TData, TError>, 'retry' | 'staleTime' | 'gcTime'>
) {
  return useQuery<TData, TError>({
    ...options,
    retry: 1, // Retry only once on error
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });
}

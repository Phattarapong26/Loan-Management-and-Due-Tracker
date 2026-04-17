/**
 * Filter Manager Hook
 * 
 * Custom hook for managing filters with active filter display
 * 
 * Features:
 * - Track active filters
 * - Add/remove filters
 * - Clear all filters
 * - Get active filter count
 * - Implements Property 37: Active Filter Display
 * 
 * @module useFilterManager
 */

import { useState, useCallback, useMemo } from 'react';

export interface Filter {
  /** Unique filter key */
  key: string;
  /** Filter label for display */
  label: string;
  /** Filter value */
  value: string | number | boolean;
  /** Filter category (optional) */
  category?: string;
}

export interface UseFilterManagerReturn {
  /** Active filters */
  filters: Filter[];
  /** Active filter count */
  filterCount: number;
  /** Add a filter */
  addFilter: (filter: Filter) => void;
  /** Remove a filter by key */
  removeFilter: (key: string) => void;
  /** Clear all filters */
  clearAllFilters: () => void;
  /** Check if a filter is active */
  hasFilter: (key: string) => boolean;
  /** Get filter value by key */
  getFilterValue: (key: string) => string | number | boolean | undefined;
  /** Update filter value */
  updateFilter: (key: string, value: string | number | boolean) => void;
  /** Get filters by category */
  getFiltersByCategory: (category: string) => Filter[];
}

/**
 * Hook for managing filters
 * 
 * @example
 * ```tsx
 * const {
 *   filters,
 *   filterCount,
 *   addFilter,
 *   removeFilter,
 *   clearAllFilters
 * } = useFilterManager();
 * 
 * // Add filter
 * addFilter({
 *   key: 'status',
 *   label: 'สถานะ: อนุมัติแล้ว',
 *   value: 'approved',
 *   category: 'status'
 * });
 * 
 * // Display active filters
 * {filters.map(filter => (
 *   <Chip
 *     key={filter.key}
 *     label={filter.label}
 *     onRemove={() => removeFilter(filter.key)}
 *   />
 * ))}
 * ```
 */
export function useFilterManager(): UseFilterManagerReturn {
  const [filters, setFilters] = useState<Filter[]>([]);

  const filterCount = useMemo(() => filters.length, [filters]);

  const addFilter = useCallback((filter: Filter) => {
    setFilters(prev => {
      // Remove existing filter with same key
      const filtered = prev.filter(f => f.key !== filter.key);
      return [...filtered, filter];
    });
  }, []);

  const removeFilter = useCallback((key: string) => {
    setFilters(prev => prev.filter(f => f.key !== key));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters([]);
  }, []);

  const hasFilter = useCallback((key: string) => {
    return filters.some(f => f.key === key);
  }, [filters]);

  const getFilterValue = useCallback((key: string) => {
    const filter = filters.find(f => f.key === key);
    return filter?.value;
  }, [filters]);

  const updateFilter = useCallback((key: string, value: string | number | boolean) => {
    setFilters(prev => prev.map(f => 
      f.key === key ? { ...f, value } : f
    ));
  }, []);

  const getFiltersByCategory = useCallback((category: string) => {
    return filters.filter(f => f.category === category);
  }, [filters]);

  return {
    filters,
    filterCount,
    addFilter,
    removeFilter,
    clearAllFilters,
    hasFilter,
    getFilterValue,
    updateFilter,
    getFiltersByCategory,
  };
}

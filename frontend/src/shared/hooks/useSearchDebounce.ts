/**
 * Search Debounce Hook
 * 
 * Custom hook for debounced search with loading state and request cancellation
 * 
 * Features:
 * - Debounce search input (300ms default)
 * - Show loading indicator during search
 * - Cancel previous requests automatically
 * - Implements Property 34: Search Debouncing
 * - Implements Property 35: Search Loading Indicator
 * 
 * @module useSearchDebounce
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseSearchDebounceOptions {
  /** Debounce delay in milliseconds (default: 300) */
  delay?: number;
  /** Minimum search term length to trigger search (default: 0) */
  minLength?: number;
  /** Callback when search is triggered */
  onSearch?: (searchTerm: string) => void | Promise<void>;
}

export interface UseSearchDebounceReturn {
  /** Current search term */
  searchTerm: string;
  /** Debounced search term (delayed) */
  debouncedSearchTerm: string;
  /** Whether search is in progress */
  isSearching: boolean;
  /** Set search term */
  setSearchTerm: (term: string) => void;
  /** Clear search term */
  clearSearch: () => void;
  /** Manually trigger search */
  triggerSearch: () => void;
}

/**
 * Hook for debounced search with loading state
 * 
 * @example
 * ```tsx
 * const { searchTerm, debouncedSearchTerm, isSearching, setSearchTerm, clearSearch } = useSearchDebounce({
 *   delay: 300,
 *   minLength: 2,
 *   onSearch: async (term) => {
 *     const results = await searchAPI(term);
 *     setResults(results);
 *   }
 * });
 * 
 * return (
 *   <div>
 *     <Input
 *       value={searchTerm}
 *       onChange={(e) => setSearchTerm(e.target.value)}
 *       placeholder="ค้นหา..."
 *     />
 *     {isSearching && <Spinner />}
 *   </div>
 * );
 * ```
 */
export function useSearchDebounce(
  options: UseSearchDebounceOptions = {}
): UseSearchDebounceReturn {
  const {
    delay = 300,
    minLength = 0,
    onSearch,
  } = options;

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Use ref to track abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce effect
  useEffect(() => {
    // Cancel previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Don't search if below minimum length
    if (searchTerm.length > 0 && searchTerm.length < minLength) {
      setIsSearching(false);
      return;
    }

    // Show loading immediately when user types
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchTerm, delay, minLength, debouncedSearchTerm]);

  // Search effect
  useEffect(() => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Don't search if below minimum length
    if (debouncedSearchTerm.length > 0 && debouncedSearchTerm.length < minLength) {
      setIsSearching(false);
      return;
    }

    // Execute search
    const executeSearch = async () => {
      if (!onSearch) {
        setIsSearching(false);
        return;
      }

      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        setIsSearching(true);
        await onSearch(debouncedSearchTerm);
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Search error:', error);
      } finally {
        // Only set loading to false if this is still the current request
        if (abortControllerRef.current === abortController) {
          setIsSearching(false);
        }
      }
    };

    executeSearch();

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedSearchTerm, minLength, onSearch]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setIsSearching(false);
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const triggerSearch = useCallback(() => {
    setDebouncedSearchTerm(searchTerm);
  }, [searchTerm]);

  return {
    searchTerm,
    debouncedSearchTerm,
    isSearching,
    setSearchTerm,
    clearSearch,
    triggerSearch,
  };
}

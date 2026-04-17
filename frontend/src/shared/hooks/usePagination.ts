import { useState, useCallback } from 'react';

interface UsePaginationProps {
  initialPage?: number;
  initialPageSize?: number;
}

interface UsePaginationReturn {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  resetPagination: () => void;
  getPaginationParams: () => { page: number; limit: number };
}

export function usePagination({
  initialPage = 1,
  initialPageSize = 20,
}: UsePaginationProps = {}): UsePaginationReturn {
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize);
    setPageState(1); // Reset to first page when changing page size
  }, []);

  const resetPagination = useCallback(() => {
    setPageState(initialPage);
    setPageSizeState(initialPageSize);
  }, [initialPage, initialPageSize]);

  const getPaginationParams = useCallback(() => {
    return {
      page,
      limit: pageSize,
    };
  }, [page, pageSize]);

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPagination,
    getPaginationParams,
  };
}

/**
 * Filter Chips Component
 * 
 * Display active filters as removable chips with clear all button
 * 
 * Features:
 * - Display active filters as chips
 * - Remove individual filters
 * - Clear all filters button
 * - Active filter count badge
 * - Implements Property 37: Active Filter Display
 * 
 * @module FilterChips
 */

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';

export interface FilterChip {
  /** Unique filter key */
  key: string;
  /** Filter label for display */
  label: string;
  /** Filter category (optional) */
  category?: string;
}

export interface FilterChipsProps {
  /** Active filters to display */
  filters: FilterChip[];
  /** Callback when filter is removed */
  onRemoveFilter: (key: string) => void;
  /** Callback when clear all is clicked */
  onClearAll: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Show filter count badge */
  showCount?: boolean;
}

/**
 * Filter Chips Component
 * 
 * @example
 * ```tsx
 * <FilterChips
 *   filters={[
 *     { key: 'status', label: 'สถานะ: อนุมัติแล้ว' },
 *     { key: 'amount', label: 'วงเงิน: > 1,000,000' }
 *   ]}
 *   onRemoveFilter={(key) => removeFilter(key)}
 *   onClearAll={() => clearAllFilters()}
 *   showCount={true}
 * />
 * ```
 */
export function FilterChips({
  filters,
  onRemoveFilter,
  onClearAll,
  className,
  showCount = true,
}: FilterChipsProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {/* Filter count badge */}
      {showCount && (
        <Badge variant="secondary" className="font-semibold">
          {filters.length} ตัวกรอง
        </Badge>
      )}

      {/* Filter chips */}
      {filters.map((filter) => (
        <div
          key={filter.key}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-900 hover:bg-blue-100 transition-colors"
        >
          <span className="font-medium">{filter.label}</span>
          <button
            type="button"
            onClick={() => onRemoveFilter(filter.key)}
            className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 transition-colors"
            aria-label={`ลบตัวกรอง ${filter.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {/* Clear all button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
      >
        ล้างทั้งหมด
      </Button>
    </div>
  );
}

/**
 * Empty Search Results Component
 * 
 * Display helpful message when search returns no results
 */
export interface EmptySearchResultsProps {
  /** Search term that returned no results */
  searchTerm: string;
  /** Suggested alternative search terms */
  suggestions?: string[];
  /** Additional CSS classes */
  className?: string;
}

export function EmptySearchResults({
  searchTerm,
  suggestions = [],
  className,
}: EmptySearchResultsProps) {
  return (
    <div className={cn('text-center py-12', className)}>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
        <svg
          className="w-8 h-8 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        ไม่พบผลลัพธ์สำหรับ "{searchTerm}"
      </h3>

      <p className="text-sm text-slate-600 mb-4">
        ลองค้นหาด้วยคำอื่น หรือตรวจสอบการสะกดคำ
      </p>

      {suggestions.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-slate-700 mb-3">
            คำแนะนำการค้นหา:
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((suggestion, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-slate-50"
              >
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 text-sm text-slate-500">
        <p className="font-medium mb-2">💡 เคล็ดลับการค้นหา:</p>
        <ul className="space-y-1 text-left max-w-md mx-auto">
          <li>• ใช้คำค้นหาที่สั้นและชัดเจน</li>
          <li>• ลองค้นหาด้วยเลขที่สัญญาหรือรหัสลูกค้า</li>
          <li>• ตรวจสอบการสะกดคำให้ถูกต้อง</li>
          <li>• ลองใช้คำค้นหาที่กว้างขึ้น</li>
        </ul>
      </div>
    </div>
  );
}

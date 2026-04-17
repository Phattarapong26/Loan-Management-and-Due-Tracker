import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

const dateFilters = [
  { label: 'วันนี้', value: 'today' },
  { label: '7 วัน', value: '7days' },
  { label: '15 วัน', value: '15days' },
  { label: '30 วัน', value: '30days' },
  { label: '90 วัน', value: '90days' },
];

interface DateFilterProps {
  value?: string;
  onChange?: (value: string) => void;
}

export function DateFilter({ value = 'today', onChange }: DateFilterProps) {
  const [selected, setSelected] = useState(value);

  const handleClick = (filterValue: string) => {
    setSelected(filterValue);
    onChange?.(filterValue);
  };

  return (
    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg ">
      {dateFilters.map((filter) => (
        <Button
          key={filter.value}
          variant="ghost"
          size="sm"
          onClick={() => handleClick(filter.value)}
          className={cn(
            'h-8 px-3 text-xs font-medium rounded-md transition-all',
            selected === filter.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}

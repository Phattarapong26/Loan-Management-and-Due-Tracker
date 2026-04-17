/**
 * Recharts re-exports
 * Direct imports — recharts needs real component types for React.Children traversal
 */

export {
  LineChart as LazyLineChart,
  Line as LazyLine,
  XAxis as LazyXAxis,
  YAxis as LazyYAxis,
  CartesianGrid as LazyCartesianGrid,
  Tooltip as LazyTooltip,
  ResponsiveContainer as LazyResponsiveContainer,
  AreaChart as LazyAreaChart,
  Area as LazyArea,
  BarChart as LazyBarChart,
  Bar as LazyBar,
  Legend as LazyLegend,
} from 'recharts';

import { Skeleton } from '@/shared/components/ui/skeleton';

export const ChartSkeleton = () => (
  <div className="w-full h-[300px] flex items-center justify-center">
    <Skeleton className="w-full h-full" />
  </div>
);

interface ChartWrapperProps {
  children: React.ReactNode;
}

export const ChartWrapper = ({ children }: ChartWrapperProps) => (
  <>{children}</>
);

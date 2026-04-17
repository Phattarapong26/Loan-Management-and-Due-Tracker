import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/shared/lib/utils';

const data = [
  { quarter: 'Q1', value: 100 },
  { quarter: 'Q2', value: 200 },
  { quarter: 'Q3', value: 260 },
  { quarter: 'Q4', value: 300 },
];

interface OverallSalesChartProps {
  className?: string;
}

export function OverallSalesChart({ className }: OverallSalesChartProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl p-6 animate-scale-in hexagon-pattern h-full flex flex-col border p-4", className)} style={{
      background: 'linear-gradient(135deg, hsl(199, 89%, 48%) 0%, hsl(199, 89%, 40%) 100%)'
    }}>
      <h3 className="text-lg font-semibold text-white mb-4">ยอดขายรวม</h3>
      <div className="flex-1 min-h-[12rem]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis
              dataKey="quarter"
              tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.8)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              }}
              cursor={{ fill: 'rgba(255,255,255,0.1)' }}
            />
            <Bar
              dataKey="value"
              fill="rgba(255,255,255,0.3)"
              radius={[4, 4, 0, 0]}
              label={{
                position: 'top',
                fill: 'white',
                fontSize: 12,
                fontWeight: 500,
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

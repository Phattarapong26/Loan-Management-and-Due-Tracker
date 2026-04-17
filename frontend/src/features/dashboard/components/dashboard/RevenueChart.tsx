import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const data = [
  { month: 'ม.ค.', sales: 180, revenue: 240 },
  { month: 'ก.พ.', sales: 220, revenue: 280 },
  { month: 'มี.ค.', sales: 350, revenue: 380 },
  { month: 'เม.ย.', sales: 290, revenue: 320 },
  { month: 'พ.ค.', sales: 420, revenue: 480 },
  { month: 'มิ.ย.', sales: 380, revenue: 420 },
  { month: 'ก.ค.', sales: 320, revenue: 360 },
  { month: 'ส.ค.', sales: 450, revenue: 520 },
  { month: 'ก.ย.', sales: 520, revenue: 580 },
  { month: 'ต.ค.', sales: 620, revenue: 680 },
];

export function RevenueChart() {
  return (
    <div className="chart-container animate-slide-up rounded-lg border p-4">
      <h3 className="text-lg font-semibold text-primary mb-6">รายได้</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: 'hsl(220, 9%, 46%)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'hsl(220, 9%, 46%)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(220, 13%, 91%)',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px hsl(220 9% 46% / 0.1)',
              }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span style={{ color: 'hsl(220, 9%, 46%)', fontSize: '12px' }}>
                  {value === 'sales' ? 'ยอดขาย' : 'รายได้'}
                </span>
              )}
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSales)"
              dot={{ r: 4, fill: 'hsl(217, 91%, 60%)' }}
              activeDot={{ r: 6, fill: 'hsl(217, 91%, 60%)' }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(199, 89%, 48%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              dot={{ r: 4, fill: 'hsl(199, 89%, 48%)' }}
              activeDot={{ r: 6, fill: 'hsl(199, 89%, 48%)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

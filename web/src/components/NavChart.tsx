import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { NavHistoryRecord } from '../types';
import { formatCurrency, formatChartDate, formatFullDate } from '../lib/format';

interface NavChartProps {
  data: NavHistoryRecord[];
  loading?: boolean;
}

export const NavChart: React.FC<NavChartProps> = ({ data, loading }) => {
  if (data.length === 0 && !loading) {
    return (
      <div className="chart-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-gray-500">データがありません</p>
      </div>
    );
  }

  // Calculate min/max for Y-axis scaling to make chart more readable
  const minNav = Math.min(...data.map(d => d.nav)) * 0.98;
  const maxNav = Math.max(...data.map(d => d.nav)) * 1.02;

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 0, left: 10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorNav" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            tickFormatter={formatChartDate}
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
          />
          <YAxis 
            domain={[minNav, maxNav]} 
            hide={true} 
          />
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="#f1f5f9" 
          />
          <Tooltip
            contentStyle={{ 
              borderRadius: '8px', 
              border: 'none', 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontFamily: 'Inter, sans-serif'
            }}
            labelFormatter={formatFullDate}
            formatter={(value: number) => [
              <span className="font-mono">{formatCurrency(value)}</span>, 
              '基準価額'
            ]}
          />
          <Area
            type="monotone"
            dataKey="nav"
            stroke="#2563eb"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorNav)"
            isAnimationActive={false} // Disable animation for more responsive rendering
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cross,
} from 'recharts';
import type { OrderHistory } from '../types';

interface PopularityChartProps {
  data: OrderHistory[];
}

const CHART_COLOR = '#1E3A5F';

const PopularityChart: React.FC<PopularityChartProps> = ({ data }) => {
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="hour"
            tick={{ fill: '#718096', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
            stroke="#CBD5E0"
            interval={2}
          />
          <YAxis
            tick={{ fill: '#718096', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
            stroke="#CBD5E0"
            allowDecimals={false}
            label={{
              value: '订单数',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#4A5568', fontSize: 12, fontFamily: 'Inter, sans-serif' },
            }}
          />
          <Tooltip
            contentStyle={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
            }}
            labelStyle={{ color: '#2D3748', fontWeight: 600 }}
            formatter={(value: number) => [`${value} 单`, '订单量']}
            cursor={{ stroke: CHART_COLOR, strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Cross stroke={CHART_COLOR} strokeWidth={1} />
          <Line
            type="monotone"
            dataKey="orders"
            stroke={CHART_COLOR}
            strokeWidth={2.5}
            dot={{ r: 3, fill: CHART_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: CHART_COLOR, stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={true}
            animationDuration={200}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PopularityChart;

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';

export interface DayData {
  date: string;
  hue: number | null;
  label?: string;
}

interface TrendChartProps {
  data: DayData[];
}

interface ChartDataPoint {
  date: string;
  displayDate: string;
  hue: number | null;
  color: string;
  label?: string;
}

function hslToString(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (data.hue === null) {
      return (
        <div
          style={{
            background: 'rgba(255,255,255,0.95)',
            padding: '8px 12px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
          }}
        >
          <div style={{ color: '#999' }}>{data.displayDate}</div>
          <div>暂无记录</div>
        </div>
      );
    }
    return (
      <div
        style={{
          background: 'rgba(255,255,255,0.95)',
          padding: '8px 12px',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
        }}
      >
        <div style={{ color: '#666' }}>{data.displayDate}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: hslToString(data.hue, 70, 55),
            }}
          />
          <span>色相 {data.hue}°</span>
        </div>
        {data.label && <div style={{ marginTop: 4, color: '#666' }}>{data.label}</div>}
      </div>
    );
  }
  return null;
};

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (payload.hue === null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={hslToString(payload.hue, 70, 55)}
      stroke="#fff"
      strokeWidth={2}
      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
    />
  );
};

const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  const chartData: ChartDataPoint[] = useMemo(() => {
    return data.map((d) => {
      const dateObj = new Date(d.date);
      const displayDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
      return {
        date: d.date,
        displayDate,
        hue: d.hue,
        color: d.hue !== null ? hslToString(d.hue, 70, 55) : '#ddd',
        label: d.label,
      };
    });
  }, [data]);

  const validHues = data.filter((d) => d.hue !== null).map((d) => d.hue as number);
  const avgHue = validHues.length > 0 ? Math.round(validHues.reduce((a, b) => a + b, 0) / validHues.length) : null;

  return (
    <div style={{ width: '100%', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ height: 240, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
            <defs>
              {chartData.map((d, i) => {
                if (d.hue === null) return null;
                const next = chartData[i + 1];
                if (!next || next.hue === null) return null;
                return (
                  <linearGradient key={i} id={`grad-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={hslToString(d.hue, 70, 55)} />
                    <stop offset="100%" stopColor={hslToString(next.hue, 70, 55)} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
            <XAxis
              dataKey="displayDate"
              tick={{ fill: '#666', fontSize: 12 }}
              axisLine={{ stroke: '#E8E8E8' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 360]}
              ticks={[0, 90, 180, 270, 360]}
              tick={{ fill: '#666', fontSize: 12 }}
              axisLine={{ stroke: '#E8E8E8' }}
              tickLine={false}
              tickFormatter={(v) => `${v}°`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceArea y1={0} y2={60} fill="#FFE0B2" fillOpacity={0.2} />
            <ReferenceArea y1={60} y2={180} fill="#C8E6C9" fillOpacity={0.2} />
            <ReferenceArea y1={180} y2={300} fill="#BBDEFB" fillOpacity={0.2} />
            <ReferenceArea y1={300} y2={360} fill="#F8BBD0" fillOpacity={0.2} />
            {chartData.map((d, i) => {
              if (i === 0 || d.hue === null) return null;
              const prev = chartData[i - 1];
              if (prev.hue === null) return null;
              return (
                <Line
                  key={`line-${i}`}
                  data={[prev, d]}
                  type="monotone"
                  dataKey="hue"
                  stroke={`url(#grad-${i - 1})`}
                  strokeWidth={3}
                  dot={false}
                  activeDot={false}
                />
              );
            })}
            <Line
              type="monotone"
              dataKey="hue"
              stroke="transparent"
              strokeWidth={3}
              dot={<CustomDot />}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          marginTop: 16,
          padding: 16,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          gap: 24,
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>本周平均色相</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {avgHue !== null ? (
              <>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: hslToString(avgHue, 70, 55),
                  }}
                />
                <span style={{ fontSize: 18, fontWeight: 600 }}>{avgHue}°</span>
              </>
            ) : (
              <span style={{ fontSize: 14, color: '#999' }}>暂无数据</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendChart;

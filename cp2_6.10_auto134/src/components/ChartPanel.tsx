import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Transaction, PIE_COLORS } from '../types';
import {
  MonthlySummary,
  getMonthlySummary,
  getCategorySummary,
  getTotalExpense
} from '../dataStore';

interface ChartPanelProps {
  transactions: Transaction[];
}

const MONTH_NAMES = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月'
];

const ChartPanel: React.FC<ChartPanelProps> = ({ transactions }) => {
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = React.useState<number | undefined>(
    new Date().getMonth() + 1
  );

  const monthlyData = useMemo<MonthlySummary[]>(
    () => getMonthlySummary(transactions, currentYear),
    [transactions, currentYear]
  );

  const chartData = useMemo(() => {
    return monthlyData.map(m => ({
      name: MONTH_NAMES[m.month - 1],
      支出: Math.round(m.expense * 100) / 100,
      收入: Math.round(m.income * 100) / 100
    }));
  }, [monthlyData]);

  const yAxisMax = useMemo(() => {
    const maxVal = Math.max(
      ...monthlyData.map(m => Math.max(m.income, m.expense)),
      0
    );
    return Math.ceil(maxVal * 1.2);
  }, [monthlyData]);

  const categoryData = useMemo(
    () => getCategorySummary(transactions, currentYear, selectedMonth),
    [transactions, currentYear, selectedMonth]
  );

  const totalExpense = useMemo(
    () => getTotalExpense(transactions, currentYear, selectedMonth),
    [transactions, currentYear, selectedMonth]
  );

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent
  }: any) => {
    if (!percent || percent < 0.03) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <>
      <div className="chart-section">
        <h2>月度收支趋势</h2>
        <div className="chart-container">
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, yAxisMax || 100]} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => `￥${value.toFixed(2)}`}
              />
              <Legend />
              <Bar dataKey="支出" fill="#3498db" radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey="收入"
                stroke="#2ecc71"
                strokeWidth={3}
                dot={{ fill: '#2ecc71', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="pie-section">
        <div className="pie-header">
          <h2 style={{ marginBottom: 0 }}>分类消费统计</h2>
          <select
            value={selectedMonth ?? 'all'}
            onChange={e => {
              const v = e.target.value;
              setSelectedMonth(v === 'all' ? undefined : parseInt(v, 10));
            }}
          >
            <option value="all">全年</option>
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="pie-container">
          {categoryData.length === 0 ? (
            <div className="empty-state">暂无支出数据</div>
          ) : (
            <>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="amount"
                      nameKey="category"
                      labelLine={false}
                      label={renderCustomLabel}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `￥${value.toFixed(2)}`,
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="pie-total">
                <div className="label">
                  {selectedMonth
                    ? `${currentYear}年${selectedMonth}月总支出`
                    : `${currentYear}年总支出`}
                </div>
                <div className="amount">￥{totalExpense.toFixed(2)}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ChartPanel;

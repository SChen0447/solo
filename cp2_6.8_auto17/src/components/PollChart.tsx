import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { PollOption } from '@/utils/api'

interface PollChartProps {
  options: PollOption[]
  winningOptionId?: string
}

const COLORS = ['#2B6CB0', '#3182CE', '#4299E1', '#63B3ED', '#90CDF4', '#BEE3F8', '#2C5282', '#2A4365']

export default function PollChart({ options, winningOptionId }: PollChartProps) {
  const totalVotes = options.reduce((sum, opt) => sum + opt.votes, 0)

  const pieData = options.map((opt) => ({
    name: opt.text,
    value: opt.votes,
    percentage: totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(1) : '0.0',
    id: opt.id,
  }))

  const barData = options.map((opt) => ({
    name: opt.text.length > 10 ? opt.text.substring(0, 10) + '...' : opt.text,
    fullName: opt.text,
    votes: opt.votes,
    id: opt.id,
  }))

  const renderCustomLabel = ({ name, percentage, cx, cy, midAngle, innerRadius, outerRadius }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    if (totalVotes === 0) return null

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${percentage}%`}
      </text>
    )
  }

  return (
    <div className="charts-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <div className="chart-card" style={cardStyle}>
        <h3 style={chartTitleStyle}>投票占比</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                innerRadius={60}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke={entry.id === winningOptionId ? '#F6AD55' : 'transparent'}
                    strokeWidth={entry.id === winningOptionId ? 3 : 0}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value} 票 (${totalVotes > 0 ? ((value / totalVotes) * 100).toFixed(1) : 0}%)`,
                  name,
                ]}
                contentStyle={tooltipStyle}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card" style={cardStyle}>
        <h3 style={chartTitleStyle}>票数统计</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number, name: string, props: any) => [
                  `${value} 票`,
                  props.payload.fullName || name,
                ]}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="votes" animationBegin={0} animationDuration={800} animationEasing="ease-out" radius={[0, 4, 4, 0]}>
                {barData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.id === winningOptionId ? '#F6AD55' : COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(43, 108, 176, 0.1)',
}

const chartTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#2D3748',
  margin: '0 0 16px 0',
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #E2E8F0',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
}

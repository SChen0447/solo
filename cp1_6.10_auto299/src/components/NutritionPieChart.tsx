import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface Nutrition {
  protein: number
  carbs: number
  fat: number
  vitamins: number
}

interface Props {
  nutrition: Nutrition
}

const COLORS = {
  protein: '#FF6384',
  carbs: '#36A2EB',
  fat: '#FFCE56',
  vitamins: '#4BC0C0'
}

const LABELS = {
  protein: '蛋白质',
  carbs: '碳水',
  fat: '脂肪',
  vitamins: '维生素'
}

const NutritionPieChart: React.FC<Props> = ({ nutrition }) => {
  const data = useMemo(() => [
    { key: 'protein', name: LABELS.protein, value: nutrition.protein, color: COLORS.protein },
    { key: 'carbs', name: LABELS.carbs, value: nutrition.carbs, color: COLORS.carbs },
    { key: 'fat', name: LABELS.fat, value: nutrition.fat, color: COLORS.fat },
    { key: 'vitamins', name: LABELS.vitamins, value: nutrition.vitamins, color: COLORS.vitamins }
  ], [nutrition])

  const total = useMemo(
    () => nutrition.protein + nutrition.carbs + nutrition.fat + nutrition.vitamins,
    [nutrition]
  )

  const kcal = useMemo(
    () => Math.round(nutrition.protein * 4 + nutrition.carbs * 4 + nutrition.fat * 9),
    [nutrition]
  )

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
      return (
        <div style={{
          background: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: '13px'
        }}>
          <div style={{ fontWeight: 600, color: item.color }}>{item.name}</div>
          <div style={{ color: '#666' }}>{item.value}g · {pct}%</div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="nutrition-section">
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={105}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
              isAnimationActive={true}
              animationDuration={600}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="chart-center-text">
          <div className="estimate-label">估算</div>
          <div className="kcal-text">卡路里：约{kcal} kcal</div>
        </div>
      </div>
      <div className="legend-container">
        {data.map((d, i) => (
          <div key={i} className="legend-item">
            <span className="legend-color" style={{ background: d.color }} />
            <span>{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default NutritionPieChart

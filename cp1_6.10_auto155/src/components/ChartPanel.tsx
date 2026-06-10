import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
} from 'recharts';
import { RecipeIngredient } from '../types';
import { calculateRadarScores } from '../utils/storage';

interface ChartPanelProps {
  ingredients: RecipeIngredient[];
}

export default function ChartPanel({ ingredients }: ChartPanelProps) {
  const pieData = useMemo(() => {
    const total = ingredients.reduce((sum, ri) => sum + ri.weight, 0);
    return ingredients.map((ri) => ({
      name: ri.ingredient.name,
      value: total > 0 ? ri.weight : 0,
      color: ri.ingredient.color,
      type: ri.ingredient.type,
    }));
  }, [ingredients]);

  const radarData = useMemo(() => calculateRadarScores(ingredients), [ingredients]);

  const totalCount = ingredients.length;

  const pieCenterLabel = useMemo(() => {
    if (totalCount === 0) return { text: '0', sub: '种成分' };
    return { text: String(totalCount), sub: '种成分' };
  }, [totalCount]);

  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        height: '100%',
        background: '#fff8eb',
        borderRadius: 12,
        padding: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'all 0.3s ease-in-out',
      }}
    >
      <div
        style={{
          flex: 1,
          position: 'relative',
          minWidth: 0,
          transition: 'all 0.25s ease-in-out',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            fontWeight: 600,
            fontSize: 13,
            color: '#5d4037',
            marginBottom: 4,
          }}
        >
          配方比例
        </div>
        <ResponsiveContainer width="100%" height="85%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={120}
              dataKey="value"
              strokeWidth={0}
              isAnimationActive
              animationDuration={300}
              animationEasing="ease-in-out"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [`${value}%`, name]}
              contentStyle={{
                background: '#fff8eb',
                border: '1px solid #e0cbb5',
                borderRadius: 8,
                fontSize: 12,
                color: '#5d4037',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: '#5d4037' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -60%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#e67e22',
              lineHeight: 1,
            }}
          >
            {pieCenterLabel.text}
          </div>
          <div style={{ fontSize: 11, color: '#8d6e63', marginTop: 2 }}>
            {pieCenterLabel.sub}
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          transition: 'all 0.25s ease-in-out',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            fontWeight: 600,
            fontSize: 13,
            color: '#5d4037',
            marginBottom: 4,
          }}
        >
          香气特征
        </div>
        <ResponsiveContainer width="100%" height="90%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid
              stroke="#d5c4a1"
              strokeDasharray="3 3"
            />
            <PolarAngleAxis
              dataKey="label"
              tick={{ fill: '#5d4037', fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: '#a1887f', fontSize: 9 }}
              axisLine={false}
              tickCount={5}
            />
            <Radar
              name="特征值"
              dataKey="value"
              stroke="#e67e22"
              fill="#e67e22"
              fillOpacity={0.35}
              strokeWidth={2}
              isAnimationActive
              animationDuration={300}
              animationEasing="ease-in-out"
            />
            <Tooltip
              formatter={(value: number) => [`${value}/100`, '强度']}
              contentStyle={{
                background: '#fff8eb',
                border: '1px solid #e0cbb5',
                borderRadius: 8,
                fontSize: 12,
                color: '#5d4037',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

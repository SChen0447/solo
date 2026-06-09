import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions
} from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';
import { useMemo } from 'react';
import type { Nutrition } from '../types';
import { DAILY_RECOMMENDED, NUTRITION_COLORS } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend
);

interface NutritionCardProps {
  nutrition: Nutrition;
  servings: number;
  onServingsChange: (servings: number) => void;
}

export default function NutritionCard({ nutrition, servings, onServingsChange }: NutritionCardProps) {
  const scaledNutrition = useMemo(() => ({
    calories: Math.round(nutrition.calories * servings * 10) / 10,
    protein: Math.round(nutrition.protein * servings * 10) / 10,
    fat: Math.round(nutrition.fat * servings * 10) / 10,
    carbs: Math.round(nutrition.carbs * servings * 10) / 10
  }), [nutrition, servings]);

  const percentages = useMemo(() => ({
    calories: Math.min(Math.round((scaledNutrition.calories / DAILY_RECOMMENDED.calories) * 100), 200),
    protein: Math.min(Math.round((scaledNutrition.protein / DAILY_RECOMMENDED.protein) * 100), 200),
    fat: Math.min(Math.round((scaledNutrition.fat / DAILY_RECOMMENDED.fat) * 100), 200),
    carbs: Math.min(Math.round((scaledNutrition.carbs / DAILY_RECOMMENDED.carbs) * 100), 200)
  }), [scaledNutrition]);

  const barData = useMemo(() => ({
    labels: ['热量', '蛋白质', '脂肪', '碳水化合物'],
    datasets: [{
      data: [scaledNutrition.calories, scaledNutrition.protein, scaledNutrition.fat, scaledNutrition.carbs],
      backgroundColor: [
        NUTRITION_COLORS.calories,
        NUTRITION_COLORS.protein,
        NUTRITION_COLORS.fat,
        NUTRITION_COLORS.carbs
      ],
      borderRadius: 6,
      borderSkipped: false
    }]
  }), [scaledNutrition]);

  const barOptions: ChartOptions<'bar'> = useMemo(() => ({
    indexAxis: 'x' as const,
    responsive: true,
    maintainAspectRatio: true,
    animation: {
      duration: 800,
      easing: 'easeOutCubic'
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(42, 42, 62, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 12 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
        beginAtZero: true
      }
    }
  }), []);

  const radarData = useMemo(() => ({
    labels: ['热量', '蛋白质', '脂肪', '碳水化合物'],
    datasets: [{
      label: '营养覆盖度',
      data: [percentages.calories, percentages.protein, percentages.fat, percentages.carbs],
      backgroundColor: 'rgba(138, 43, 226, 0.2)',
      borderColor: '#8A2BE2',
      borderWidth: 2,
      pointBackgroundColor: '#8A2BE2',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  }), [percentages]);

  const radarOptions: ChartOptions<'radar'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(42, 42, 62, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.parsed.r}%`
        }
      }
    },
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          color: 'rgba(255,255,255,0.4)',
          backdropColor: 'transparent',
          font: { size: 10 },
          stepSize: 25
        },
        grid: { color: 'rgba(255,255,255,0.1)' },
        angleLines: { color: 'rgba(255,255,255,0.1)' },
        pointLabels: {
          color: 'rgba(255,255,255,0.8)',
          font: { size: 12 }
        }
      }
    }
  }), []);

  const nutritionItems = [
    { key: 'calories', label: '热量', value: scaledNutrition.calories, unit: '千卡', color: NUTRITION_COLORS.calories, daily: DAILY_RECOMMENDED.calories },
    { key: 'protein', label: '蛋白质', value: scaledNutrition.protein, unit: 'g', color: NUTRITION_COLORS.protein, daily: DAILY_RECOMMENDED.protein },
    { key: 'fat', label: '脂肪', value: scaledNutrition.fat, unit: 'g', color: NUTRITION_COLORS.fat, daily: DAILY_RECOMMENDED.fat },
    { key: 'carbs', label: '碳水化合物', value: scaledNutrition.carbs, unit: 'g', color: NUTRITION_COLORS.carbs, daily: DAILY_RECOMMENDED.carbs }
  ] as const;

  return (
    <div className="nutrition-card">
      <div className="nutrition-header">
        <h3>营养成分分析</h3>
        <div className="servings-control">
          <span className="servings-label">份数</span>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={servings}
            onChange={(e) => onServingsChange(Number(e.target.value))}
            className="servings-slider"
          />
          <span className="servings-value">{servings}</span>
        </div>
      </div>

      <div className="nutrition-content">
        <div className="percentages-column">
          {nutritionItems.map((item) => (
            <div key={item.key} className="percentage-item">
              <div className="percentage-label" style={{ color: item.color }}>
                {item.label}
              </div>
              <div className="percentage-value">
                {Math.round((item.value / item.daily) * 100)}%
              </div>
              <div className="percentage-sub">
                {item.value}{item.unit} / {item.daily}{item.unit}
              </div>
            </div>
          ))}
        </div>

        <div className="chart-column bar-chart-wrapper">
          <Bar data={barData} options={barOptions} />
        </div>

        <div className="chart-column radar-chart-wrapper">
          <div className="radar-title">每日推荐覆盖度</div>
          <Radar data={radarData} options={radarOptions} />
        </div>
      </div>
    </div>
  );
}

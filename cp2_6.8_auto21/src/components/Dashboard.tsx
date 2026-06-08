import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'

interface DistributionItem {
  value: string
  count: number
  percentage: number
}

interface QuestionDistribution {
  question: string
  type: 'single' | 'multiple'
  distribution: DistributionItem[]
}

interface DashboardProps {
  distributions: QuestionDistribution[]
  questions: string[]
  total: number
  filterQuestion: string
  filterValue: string
  onFilterChange: (question: string, value: string) => void
  onClearFilter: () => void
  loading: boolean
}

const COLORS = [
  '#667eea',
  '#764ba2',
  '#f093fb',
  '#f5576c',
  '#4facfe',
  '#00f2fe',
  '#43e97b',
  '#38f9d7',
  '#fa709a',
  '#fee140',
  '#a8edea',
  '#fed6e3',
  '#d299c2',
  '#fef9d7',
  '#89f7fe',
  '#66a6ff'
]

function Dashboard({
  distributions,
  questions,
  total,
  filterQuestion,
  filterValue,
  onFilterChange,
  onClearFilter,
  loading
}: DashboardProps) {
  const getFilterValues = useMemo(() => {
    if (!filterQuestion) return []
    const dist = distributions.find(d => d.question === filterQuestion)
    return dist ? dist.distribution.map(d => d.value) : []
  }, [filterQuestion, distributions])

  const getChartOption = (item: QuestionDistribution): EChartsOption => {
    const data = item.distribution.map((d, i) => ({
      name: d.value,
      value: d.count
    }))

    if (item.type === 'single' && item.distribution.length <= 8) {
      return {
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            const percent = ((params.value / total) * 100).toFixed(1)
            return `${params.name}<br/>数量: ${params.value}<br/>占比: ${percent}%`
          },
          backgroundColor: 'rgba(26, 26, 46, 0.9)',
          borderColor: 'rgba(102, 126, 234, 0.3)',
          textStyle: { color: '#e0e0e0' }
        },
        legend: {
          type: 'scroll',
          orient: 'vertical',
          right: 10,
          top: 'center',
          textStyle: { color: '#c0c0c0', fontSize: 12 },
          itemWidth: 14,
          itemHeight: 14
        },
        series: [
          {
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['35%', '50%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 6,
              borderColor: '#1a1a2e',
              borderWidth: 2
            },
            label: {
              show: false
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 14,
                fontWeight: 'bold',
                color: '#e0e0e0'
              },
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            labelLine: {
              show: false
            },
            data,
            color: COLORS,
            animationDuration: 500,
            animationEasing: 'cubicOut'
          }
        ]
      }
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(26, 26, 46, 0.9)',
        borderColor: 'rgba(102, 126, 234, 0.3)',
        textStyle: { color: '#e0e0e0' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: item.distribution.map(d => d.value),
        axisLabel: {
          color: '#8892b0',
          fontSize: 11,
          interval: 0,
          rotate: item.distribution.length > 6 ? 30 : 0
        },
        axisLine: { lineStyle: { color: 'rgba(102, 126, 234, 0.3)' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#8892b0', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(102, 126, 234, 0.1)' } }
      },
      series: [
        {
          type: 'bar',
          data: item.distribution.map((d, i) => ({
            value: d.count,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: COLORS[i % COLORS.length] },
                  { offset: 1, color: COLORS[(i + 1) % COLORS.length] }
                ]
              },
              borderRadius: [4, 4, 0, 0]
            }
          })),
          barWidth: '50%',
          animationDuration: 500,
          animationEasing: 'cubicOut'
        }
      ]
    }
  }

  return (
    <div>
      <div className="filter-panel">
        <h3>🔍 筛选条件</h3>
        <div className="filter-controls">
          <div className="filter-group">
            <label>选择问题</label>
            <select
              value={filterQuestion}
              onChange={(e) => {
                const q = e.target.value
                onFilterChange(q, '')
              }}
            >
              <option value="">-- 选择筛选问题 --</option>
              {questions.map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
          {filterQuestion && (
            <div className="filter-group">
              <label>选择答案</label>
              <select
                value={filterValue}
                onChange={(e) => {
                  onFilterChange(filterQuestion, e.target.value)
                }}
              >
                <option value="">-- 全部 --</option>
                {getFilterValues.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          )}
          {filterQuestion && filterValue && (
            <button className="clear-filter-btn" onClick={onClearFilter}>
              清除筛选
            </button>
          )}
        </div>
        {filterQuestion && filterValue && (
          <div style={{ marginTop: '12px', color: '#a5b4fc', fontSize: '13px' }}>
            当前筛选：{filterQuestion} = {filterValue}（共 {total} 条记录）
          </div>
        )}
      </div>

      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#8892b0'
        }}>
          加载中...
        </div>
      )}

      <div className="charts-grid">
        {distributions.map((item) => (
          <div key={item.question} className="chart-card">
            <h3>
              {item.type === 'multiple' ? '☑️ ' : '◉ '}
              {item.question}
              <span style={{
                fontSize: '12px',
                color: '#8892b0',
                marginLeft: '8px',
                fontWeight: 'normal'
              }}>
                ({item.type === 'multiple' ? '多选' : '单选'})
              </span>
            </h3>
            <div className="chart-container">
              <ReactECharts
                option={getChartOption(item)}
                style={{ width: '100%', height: '100%' }}
                notMerge={false}
                lazyUpdate={true}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard

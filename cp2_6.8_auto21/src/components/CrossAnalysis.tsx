import { useState, useEffect, useCallback, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'

interface CrossAnalysisResult {
  question1: string
  question2: string
  values1: string[]
  values2: string[]
  data: number[][]
  totals: {
    row: number[]
    col: number[]
    grand: number
  }
}

interface CrossAnalysisProps {
  questions: string[]
}

function CrossAnalysis({ questions }: CrossAnalysisProps) {
  const [q1, setQ1] = useState<string>(questions[0] || '')
  const [q2, setQ2] = useState<string>(questions[1] || '')
  const [result, setResult] = useState<CrossAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCrossData = useCallback(async () => {
    if (!q1 || !q2 || q1 === q2) {
      setResult(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({ q1, q2 })
      const res = await fetch(`/api/cross?${params.toString()}`)

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || '获取交叉分析数据失败')
      }

      const data: CrossAnalysisResult = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }, [q1, q2])

  useEffect(() => {
    if (questions.length >= 2 && !q1 && !q2) {
      setQ1(questions[0])
      setQ2(questions[1] || questions[0])
    }
  }, [questions, q1, q2])

  useEffect(() => {
    if (q1 && q2 && q1 !== q2) {
      fetchCrossData()
    }
  }, [q1, q2, fetchCrossData])

  const heatmapOption = useMemo((): EChartsOption => {
    if (!result) return {}

    const maxValue = Math.max(...result.data.flat(), 1)

    const heatmapData: [number, number, number][] = []
    result.data.forEach((row, y) => {
      row.forEach((val, x) => {
        heatmapData.push([x, y, val])
      })
    })

    return {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const x = params.data[0]
          const y = params.data[1]
          const val = params.data[2]
          const rowTotal = result.totals.row[y]
          const percent = rowTotal > 0 ? ((val / rowTotal) * 100).toFixed(1) : 0
          return `${result.question2}: ${result.values2[y]}<br/>
                  ${result.question1}: ${result.values1[x]}<br/>
                  数量: ${val}<br/>
                  行占比: ${percent}%`
        },
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        borderColor: 'rgba(102, 126, 234, 0.3)',
        textStyle: { color: '#e0e0e0' }
      },
      grid: {
        left: '15%',
        right: '10%',
        top: '10%',
        bottom: '25%'
      },
      xAxis: {
        type: 'category',
        data: result.values1,
        splitArea: { show: true },
        axisLabel: {
          color: '#8892b0',
          fontSize: 11,
          interval: 0,
          rotate: result.values1.length > 6 ? 30 : 0
        },
        axisLine: { lineStyle: { color: 'rgba(102, 126, 234, 0.3)' } }
      },
      yAxis: {
        type: 'category',
        data: result.values2,
        splitArea: { show: true },
        axisLabel: {
          color: '#8892b0',
          fontSize: 11
        },
        axisLine: { lineStyle: { color: 'rgba(102, 126, 234, 0.3)' } }
      },
      visualMap: {
        min: 0,
        max: maxValue,
        calculable: true,
        orient: 'vertical',
        right: '2%',
        top: 'center',
        textStyle: { color: '#8892b0', fontSize: 11 },
        inRange: {
          color: [
            '#e0f2fe',
            '#bae6fd',
            '#7dd3fc',
            '#38bdf8',
            '#0ea5e9',
            '#ef4444',
            '#b91c1c'
          ]
        }
      },
      series: [
        {
          name: '交叉统计',
          type: 'heatmap',
          data: heatmapData,
          label: {
            show: true,
            color: '#1a1a2e',
            fontSize: 11,
            fontWeight: 500
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          animationDuration: 500,
          animationEasing: 'cubicOut'
        }
      ]
    }
  }, [result])

  const handleSwap = () => {
    const temp = q1
    setQ1(q2)
    setQ2(temp)
  }

  return (
    <div className="cross-analysis-section">
      <h2>🔀 交叉分析</h2>

      <div className="cross-controls">
        <div className="filter-group">
          <label>问题 1（X轴）</label>
          <select value={q1} onChange={(e) => setQ1(e.target.value)}>
            {questions.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSwap}
          style={{
            padding: '8px 16px',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '8px',
            background: 'rgba(102, 126, 234, 0.1)',
            color: '#a5b4fc',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
            height: 'fit-content'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)'
            e.currentTarget.style.boxShadow = '0 0 15px rgba(102, 126, 234, 0.3)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          ⇄ 交换
        </button>

        <div className="filter-group">
          <label>问题 2（Y轴）</label>
          <select value={q2} onChange={(e) => setQ2(e.target.value)}>
            {questions.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#f87171',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          color: '#8892b0'
        }}>
          加载中...
        </div>
      )}

      {!loading && result && (
        <>
          <div className="heatmap-container">
            <ReactECharts
              option={heatmapOption}
              style={{ width: '100%', height: '100%' }}
              notMerge={true}
              lazyUpdate={false}
            />
          </div>

          <div style={{ marginTop: '24px' }}>
            <h3 style={{
              color: '#e0e0e0',
              marginBottom: '16px',
              fontSize: '16px',
              fontWeight: 600
            }}>
              📋 交叉透视表
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="cross-table">
                <thead>
                  <tr>
                    <th>{result.question2} \\ {result.question1}</th>
                    {result.values1.map(v => (
                      <th key={v}>{v}</th>
                    ))}
                    <th style={{ background: 'rgba(118, 75, 162, 0.3)' }}>合计</th>
                  </tr>
                </thead>
                <tbody>
                  {result.values2.map((v2, i) => (
                    <tr key={v2}>
                      <td style={{ fontWeight: 500, color: '#e0e0e0' }}>{v2}</td>
                      {result.values1.map((_, j) => (
                        <td key={j}>{result.data[i][j]}</td>
                      ))}
                      <td style={{
                        fontWeight: 600,
                        color: '#a5b4fc',
                        background: 'rgba(102, 126, 234, 0.1)'
                      }}>
                        {result.totals.row[i]}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{
                      fontWeight: 600,
                      color: '#e0e0e0',
                      background: 'rgba(118, 75, 162, 0.3)'
                    }}>
                      合计
                    </td>
                    {result.totals.col.map((val, i) => (
                      <td key={i} style={{
                        fontWeight: 600,
                        color: '#a5b4fc',
                        background: 'rgba(102, 126, 234, 0.1)'
                      }}>
                        {val}
                      </td>
                    ))}
                    <td style={{
                      fontWeight: 700,
                      color: '#fff',
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)'
                    }}>
                      {result.totals.grand}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && !result && q1 === q2 && (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h2>请选择两个不同的问题</h2>
          <p>交叉分析需要选择两个不同的问题进行对比</p>
        </div>
      )}
    </div>
  )
}

export default CrossAnalysis

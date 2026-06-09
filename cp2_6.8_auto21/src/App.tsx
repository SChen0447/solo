import { useState, useCallback, useRef, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import CrossAnalysis from './components/CrossAnalysis'

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

interface SurveyData {
  total: number
  questions: string[]
  distributions: QuestionDistribution[]
}

interface UploadResponse {
  success: boolean
  surveyId: string
  total: number
  questions: string[]
  distributions: QuestionDistribution[]
}

type TabType = 'dashboard' | 'cross'

function App() {
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [isDragging, setIsDragging] = useState(false)
  const [filterQuestion, setFilterQuestion] = useState<string>('')
  const [filterValue, setFilterValue] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchSurveyData = useCallback(async (fq?: string, fv?: string) => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (fq && fv) {
        params.append('filterQuestion', fq)
        params.append('filterValue', fv)
      }
      const res = await fetch(`/api/survey?${params.toString()}`)
      if (!res.ok) throw new Error('获取数据失败')
      const data = await res.json()
      setSurveyData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('请上传CSV格式的文件')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || '上传失败')
      }

      const data: UploadResponse = await res.json()
      setSurveyData({
        total: data.total,
        questions: data.questions,
        distributions: data.distributions
      })
      setFilterQuestion('')
      setFilterValue('')
      setActiveTab('dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFilterChange = useCallback((question: string, value: string) => {
    setFilterQuestion(question)
    setFilterValue(value)
    if (question && value) {
      fetchSurveyData(question, value)
    } else {
      fetchSurveyData()
    }
  }, [fetchSurveyData])

  const clearFilter = useCallback(() => {
    setFilterQuestion('')
    setFilterValue('')
    fetchSurveyData()
  }, [fetchSurveyData])

  useEffect(() => {
    fetchSurveyData()
  }, [fetchSurveyData])

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>📊 问卷数据可视化看板</h1>
        <p>上传CSV问卷数据，自动生成交互式统计图表</p>
      </header>

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

      {!surveyData ? (
        <div className="upload-section">
          <div
            className={`upload-box ${isDragging ? 'dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadClick}
          >
            <div className="upload-icon">📁</div>
            <h3>点击或拖拽上传CSV文件</h3>
            <p>第一行为问题，之后每行为一份答卷</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="stats-overview">
            <div className="stat-card">
              <div className="stat-value">{surveyData.total}</div>
              <div className="stat-label">总答卷数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{surveyData.questions.length}</div>
              <div className="stat-label">问题数量</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {surveyData.distributions.filter(d => d.type === 'single').length}
              </div>
              <div className="stat-label">单选题</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {surveyData.distributions.filter(d => d.type === 'multiple').length}
              </div>
              <div className="stat-label">多选题</div>
            </div>
          </div>

          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              📈 统计看板
            </button>
            <button
              className={`tab-btn ${activeTab === 'cross' ? 'active' : ''}`}
              onClick={() => setActiveTab('cross')}
            >
              🔀 交叉分析
            </button>
          </div>

          {activeTab === 'dashboard' && (
            <Dashboard
              distributions={surveyData.distributions}
              questions={surveyData.questions}
              total={surveyData.total}
              filterQuestion={filterQuestion}
              filterValue={filterValue}
              onFilterChange={handleFilterChange}
              onClearFilter={clearFilter}
              loading={loading}
            />
          )}

          {activeTab === 'cross' && (
            <CrossAnalysis questions={surveyData.questions} />
          )}

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <button
              onClick={handleUploadClick}
              style={{
                padding: '10px 24px',
                border: '1px solid rgba(102, 126, 234, 0.3)',
                borderRadius: '8px',
                background: 'rgba(102, 126, 234, 0.1)',
                color: '#a5b4fc',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
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
              🔄 重新上传文件
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default App

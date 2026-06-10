import { useState, useEffect, useCallback, useRef } from 'react'
import { storage, Article, MoodType } from './IndexedDBStorage'
import ArticleEditor from './components/ArticleEditor'
import CalendarView from './components/CalendarView'

const MOOD_LABELS: Record<MoodType, string> = {
  sunny: '晴',
  cloudy: '阴',
  rainy: '雨',
  snowy: '雪',
  thunder: '雷电'
}

const MOOD_ICONS: Record<MoodType, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  snowy: '❄️',
  thunder: '⚡'
}

const EmptyCloud = () => (
  <svg
    className="cloud-svg"
    viewBox="0 0 100 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M20 60C10 60 5 52 5 45C5 38 12 32 20 32C22 22 30 15 40 15C52 15 62 25 63 35C65 34 68 33 71 33C80 33 88 40 88 48C88 56 80 62 72 62H20Z"
      fill="#E3F2FD"
      stroke="#90CAF9"
      strokeWidth="2"
    />
    <ellipse
      className="cloud-eye cloud-eye-left"
      cx="38"
      cy="40"
      rx="3"
      ry="4"
      fill="#2C3E50"
    />
    <ellipse
      className="cloud-eye cloud-eye-right"
      cx="58"
      cy="40"
      rx="3"
      ry="4"
      fill="#2C3E50"
    />
    <path
      d="M40 50Q48 56 56 50"
      stroke="#2C3E50"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
)

function App() {
  const [articles, setArticles] = useState<Article[]>([])
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [moodFilter, setMoodFilter] = useState<MoodType | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadArticles = useCallback(async () => {
    try {
      const data = await storage.getArticles()
      setArticles(data)
    } catch (err) {
      console.error('加载文章失败', err)
    }
  }, [])

  useEffect(() => {
    loadArticles()
  }, [loadArticles])

  useEffect(() => {
    const filtered = articles.filter((article) => {
      const matchKeyword =
        !searchKeyword ||
        article.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        article.content.toLowerCase().includes(searchKeyword.toLowerCase())
      const matchMood = !moodFilter || article.mood === moodFilter
      return matchKeyword && matchMood
    })
    setFilteredArticles(filtered)
  }, [articles, searchKeyword, moodFilter])

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(''), 2500)
  }

  const handleSave = async (data: {
    title: string
    content: string
    mood: MoodType
    rating: number
  }) => {
    const now = new Date().toISOString()
    await storage.addArticle({
      ...data,
      createdAt: now,
      updatedAt: now
    })
    await loadArticles()
    showToast('保存成功 ✓')
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = await storage.getArticles()
      const jsonStr = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const today = new Date()
      const dateStr = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      a.href = url
      a.download = `blog_export_${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('导出成功 ✓')
    } catch (err) {
      console.error(err)
      showToast('导出失败')
    } finally {
      setTimeout(() => setIsExporting(false), 800)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileImport = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as Article[]
      if (!Array.isArray(data)) throw new Error('格式错误')
      await storage.importArticles(data)
      await loadArticles()
      showToast(`成功导入 ${data.length} 篇文章`)
    } catch (err) {
      console.error(err)
      showToast('导入失败，请检查文件格式')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileImport(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.endsWith('.json')) {
      handleFileImport(file)
    } else {
      showToast('请拖入 JSON 文件')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  return (
    <div className="app-container">
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="菜单"
      >
        ☰
      </button>

      <div
        className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="搜索文章标题或内容..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <div className="mood-filter">
            <button
              className={`mood-filter-btn ${
                moodFilter === null ? 'active' : ''
              }`}
              style={{ background: '#f8f9fa', fontSize: '12px' }}
              onClick={() => setMoodFilter(null)}
              title="全部"
            >
              全部
            </button>
            {(Object.keys(MOOD_LABELS) as MoodType[]).map((m) => (
              <button
                key={m}
                className={`mood-filter-btn ${
                  moodFilter === m ? 'active' : ''
                }`}
                style={{
                  background:
                    m === 'sunny'
                      ? '#fff9c4'
                      : m === 'cloudy'
                      ? '#eceff1'
                      : m === 'rainy'
                      ? '#bbdefb'
                      : m === 'snowy'
                      ? '#e3f2fd'
                      : '#d1c4e9'
                }}
                onClick={() => setMoodFilter(m)}
                title={MOOD_LABELS[m]}
              >
                {MOOD_ICONS[m]}
              </button>
            ))}
          </div>
        </div>

        {filteredArticles.length > 0 ? (
          <div className="calendar-wrapper">
            <CalendarView articles={filteredArticles} />
          </div>
        ) : (
          <div className="empty-state">
            <EmptyCloud />
            <div className="empty-state-text">
              暂无文章
              <br />
              开始记录你的第一篇心情吧 ✍️
            </div>
          </div>
        )}
      </aside>

      <main className="editor-container">
        <div className="editor-card">
          <ArticleEditor onSave={handleSave} />
          <div
            className="footer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="footer-left">
              <button
                className={`export-btn ${isExporting ? 'downloading' : ''}`}
                onClick={handleExport}
              >
                {isExporting ? '导出中...' : '📥 导出 JSON'}
              </button>
              <button
                className={`import-btn ${isDragOver ? 'drag-over' : ''}`}
                onClick={handleImportClick}
              >
                {isDragOver ? '松开导入' : '📤 导入 JSON'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
            <div style={{ fontSize: '12px', color: '#95a5a6' }}>
              共 {articles.length} 篇文章 · 数据存储在本地浏览器
            </div>
          </div>
        </div>
      </main>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  )
}

export default App

import { useRef, useState, useEffect } from 'react'
import { MoodType } from '../IndexedDBStorage'

interface Props {
  onSave: (data: {
    title: string
    content: string
    mood: MoodType
    rating: number
  }) => void
}

const MOODS: { type: MoodType; icon: string; label: string }[] = [
  { type: 'sunny', icon: '☀️', label: '晴天' },
  { type: 'cloudy', icon: '☁️', label: '阴天' },
  { type: 'rainy', icon: '🌧️', label: '雨天' },
  { type: 'snowy', icon: '❄️', label: '雪天' },
  { type: 'thunder', icon: '⚡', label: '雷电' }
]

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36]
const FONT_FAMILIES = [
  { value: 'SimSun, serif', label: '宋体' },
  { value: '"Microsoft YaHei", sans-serif', label: '微软雅黑' },
  { value: 'KaiTi, serif', label: '楷体' }
]
const LINE_HEIGHTS = [1.2, 1.4, 1.6, 1.8, 2.0]

function ArticleEditor({ onSave }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState('')
  const [mood, setMood] = useState<MoodType>('sunny')
  const [rating, setRating] = useState(3)
  const [hoverRating, setHoverRating] = useState(0)
  const [fontSize, setFontSize] = useState(16)
  const [fontFamily, setFontFamily] = useState('"Microsoft YaHei", sans-serif')
  const [lineHeight, setLineHeight] = useState(1.6)
  const [activeFormats, setActiveFormats] = useState<{
    bold: boolean
    italic: boolean
    underline: boolean
  }>({ bold: false, italic: false, underline: false })

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    updateActiveFormats()
  }

  const updateActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline')
    })
  }

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.style.fontSize = `${fontSize}px`
      editorRef.current.style.fontFamily = fontFamily
      editorRef.current.style.lineHeight = String(lineHeight)
    }
  }, [fontSize, fontFamily, lineHeight])

  const getContentText = () => {
    return editorRef.current?.innerText || ''
  }

  const getContentHTML = () => {
    return editorRef.current?.innerHTML || ''
  }

  const handleSave = () => {
    const content = getContentText()
    if (!title.trim() && !content.trim()) {
      alert('请输入标题或内容')
      return
    }
    onSave({
      title: title.trim() || content.slice(0, 20),
      content: getContentHTML(),
      mood,
      rating
    })
    setTitle('')
    if (editorRef.current) editorRef.current.innerHTML = ''
    setMood('sunny')
    setRating(3)
  }

  return (
    <>
      <div className="editor-toolbar">
        <button
          className={`toolbar-btn bold ${activeFormats.bold ? 'active' : ''}`}
          onClick={() => execCommand('bold')}
          title="加粗"
        >
          B
        </button>
        <button
          className={`toolbar-btn italic ${
            activeFormats.italic ? 'active' : ''
          }`}
          onClick={() => execCommand('italic')}
          title="斜体"
        >
          I
        </button>
        <button
          className={`toolbar-btn underline ${
            activeFormats.underline ? 'active' : ''
          }`}
          onClick={() => execCommand('underline')}
          title="下划线"
        >
          U
        </button>

        <div className="toolbar-divider" />

        <select
          className="toolbar-select"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          title="字号"
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}px
            </option>
          ))}
        </select>

        <select
          className="toolbar-select"
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          title="字体"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          className="toolbar-select"
          value={lineHeight}
          onChange={(e) => setLineHeight(Number(e.target.value))}
          title="行间距"
        >
          {LINE_HEIGHTS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>

      <input
        type="text"
        className="title-input"
        placeholder="今天的标题..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div
        ref={editorRef}
        className="content-editor"
        contentEditable
        data-placeholder="写下今天的心情和故事..."
        onInput={updateActiveFormats}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        suppressContentEditableWarning
      />

      <div className="mood-section">
        <div className="mood-section-title">今日天气心情</div>
        <div className="mood-buttons">
          {MOODS.map((m) => (
            <button
              key={m.type}
              className={`mood-btn ${m.type} ${
                mood === m.type ? 'selected' : ''
              }`}
              onClick={() => setMood(m.type)}
              title={m.label}
            >
              {m.icon}
            </button>
          ))}
        </div>

        <div className="mood-section-title">心情评分</div>
        <div className="rating-stars">
          {[1, 2, 3, 4, 5].map((n) => {
            const isFilled = (hoverRating || rating) >= n
            return (
              <span
                key={n}
                className={`star ${isFilled ? 'filled' : ''}`}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
              >
                ★
              </span>
            )
          })}
        </div>

        <button className="save-btn" onClick={handleSave}>
          💾 保存文章
        </button>
      </div>
    </>
  )
}

export default ArticleEditor

import type { Star, Line, ConstellationRecord } from './storage'
import {
  loadHistory,
  addRecord,
  generateId
} from './storage'
import {
  generateStars,
  renderFrame,
  findNearestStar,
  findNearestLine,
  addLine,
  removeLine,
  getCanvasCoords,
  type CanvasMode
} from './starCanvas'

const canvas = document.getElementById('starCanvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement
const eraseBtn = document.getElementById('eraseBtn') as HTMLButtonElement
const textInput = document.getElementById('textInput') as HTMLTextAreaElement
const publishBtn = document.getElementById('publishBtn') as HTMLButtonElement
const historyList = document.getElementById('historyList') as HTMLDivElement
const toast = document.getElementById('toast') as HTMLDivElement

let currentMode: CanvasMode = 'idle'
let stars: Star[] = generateStars()
let lines: Line[] = []
let currentText = ''
let history: ConstellationRecord[] = loadHistory()
let selectedStar: number | null = null

function setMode(mode: CanvasMode): void {
  currentMode = mode
  selectedStar = null

  if (mode === 'connect') {
    canvas.classList.add('mode-connect')
    canvas.classList.remove('mode-erase')
    connectBtn.classList.add('active')
    eraseBtn.classList.remove('active')
  } else if (mode === 'erase') {
    canvas.classList.add('mode-erase')
    canvas.classList.remove('mode-connect')
    eraseBtn.classList.add('active')
    connectBtn.classList.remove('active')
  } else {
    canvas.classList.remove('mode-connect', 'mode-erase')
    connectBtn.classList.remove('active')
    eraseBtn.classList.remove('active')
  }
}

function toggleMode(mode: CanvasMode): void {
  if (currentMode === mode) {
    setMode('idle')
  } else {
    setMode(mode)
  }
}

connectBtn.addEventListener('click', () => toggleMode('connect'))
eraseBtn.addEventListener('click', () => toggleMode('erase'))

canvas.addEventListener('click', (e) => {
  const now = performance.now()
  const { x, y } = getCanvasCoords(canvas, e.clientX, e.clientY)

  if (currentMode === 'connect') {
    const starIdx = findNearestStar(stars, x, y)
    if (starIdx === -1) {
      selectedStar = null
      return
    }
    if (selectedStar === null) {
      selectedStar = starIdx
    } else {
      lines = addLine(lines, selectedStar, starIdx, now)
      selectedStar = starIdx
    }
  } else if (currentMode === 'erase') {
    const lineIdx = findNearestLine(stars, lines, x, y)
    if (lineIdx !== -1) {
      lines = removeLine(lines, lineIdx)
    }
  }
})

textInput.addEventListener('input', () => {
  currentText = textInput.value
})

function showToast(message: string): void {
  toast.textContent = message
  toast.classList.add('show')
  setTimeout(() => {
    toast.classList.remove('show')
  }, 1500)
}

function generateThumbnail(): string {
  const tmpCanvas = document.createElement('canvas')
  tmpCanvas.width = 640
  tmpCanvas.height = 480
  const tmpCtx = tmpCanvas.getContext('2d')!
  renderFrame(tmpCtx, stars, lines, performance.now())
  return tmpCanvas.toDataURL('image/png')
}

publishBtn.addEventListener('click', () => {
  if (lines.length === 0 && currentText.trim() === '') {
    showToast('请先绘制连线或输入文字')
    return
  }
  const record: ConstellationRecord = {
    id: generateId(),
    stars: JSON.parse(JSON.stringify(stars)),
    lines: lines.map((l) => ({ ...l, fadeIn: false })),
    text: currentText,
    thumbnail: generateThumbnail(),
    timestamp: Date.now()
  }
  history = addRecord(record)
  renderHistory()
  showToast('发布成功！')
})

function restoreRecord(record: ConstellationRecord): void {
  stars = JSON.parse(JSON.stringify(record.stars))
  lines = record.lines.map((l) => ({ ...l, fadeIn: false }))
  currentText = record.text
  textInput.value = record.text
  selectedStar = null
}

async function shareRecord(record: ConstellationRecord): Promise<void> {
  const shareData = {
    thumbnail: record.thumbnail,
    text: record.text,
    timestamp: record.timestamp
  }
  const json = JSON.stringify(shareData)
  try {
    await navigator.clipboard.writeText(json)
    showToast('已复制到剪贴板')
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = json
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    showToast('已复制到剪贴板')
  }
}

function renderHistory(): void {
  historyList.innerHTML = ''
  if (history.length === 0) {
    const empty = document.createElement('div')
    empty.style.cssText = 'color:#6a6a8a;font-size:14px;padding:20px;'
    empty.textContent = '暂无历史记录，快来创造你的第一个星座故事吧！'
    historyList.appendChild(empty)
    return
  }

  for (const record of history) {
    const card = document.createElement('div')
    card.className = 'history-card'

    const thumb = document.createElement('img')
    thumb.className = 'card-thumbnail'
    thumb.src = record.thumbnail
    thumb.alt = '星座缩略图'

    const text = document.createElement('div')
    text.className = 'card-text'
    text.textContent = record.text || '(未添加文字)'

    const shareBtn = document.createElement('button')
    shareBtn.className = 'share-btn'
    shareBtn.title = '分享'
    shareBtn.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
      </svg>
    `
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      shareRecord(record)
    })

    card.appendChild(thumb)
    card.appendChild(text)
    card.appendChild(shareBtn)

    card.addEventListener('click', () => {
      restoreRecord(record)
    })

    historyList.appendChild(card)
  }
}

let lastTime = performance.now()
function animationLoop(time: number): void {
  const delta = time - lastTime
  if (delta >= 33) {
    renderFrame(ctx, stars, lines, time)
    lastTime = time
  }
  requestAnimationFrame(animationLoop)
}

function init(): void {
  setMode('idle')
  renderHistory()
  requestAnimationFrame(animationLoop)
}

init()

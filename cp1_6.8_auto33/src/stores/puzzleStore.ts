import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { convertImageToPixelPuzzle, exportGridToPng } from '@/utils/pixelConverter'

export interface HistoryCell {
  x: number
  y: number
  prevColor: string | null
  newColor: string | null
}

export interface HistoryAction {
  type: 'fill' | 'clear' | 'batch'
  cells: HistoryCell[]
  timestamp: number
}

export interface PixelCell {
  x: number
  y: number
  referenceColor: string
  filledColor: string | null
  isFilled: boolean
  isAnimating?: boolean
  animationDelay?: number
}

export type GridData = PixelCell[][]

export const usePuzzleStore = defineStore('puzzle', () => {
  const grid = ref<GridData>([])
  const gridSize = ref<number>(32)
  const selectedColor = ref<string | null>(null)
  const palette = ref<string[]>([])
  const customColors = ref<string[]>([])
  
  const zoom = ref<number>(1)
  const panX = ref<number>(0)
  const panY = ref<number>(0)
  
  const theme = ref<'light' | 'dark'>('light')
  const isSpacePressed = ref<boolean>(false)
  
  const past = ref<HistoryAction[]>([])
  const future = ref<HistoryAction[]>([])
  
  const isExporting = ref<boolean>(false)
  const exportProgress = ref<number>(0)
  
  const hasImage = ref<boolean>(false)
  const statusMessage = ref<string>('欢迎使用像素艺术拼图工具')
  
  const hoveredCell = ref<{ x: number; y: number } | null>(null)
  const selectedCellInfo = ref<{ x: number; y: number } | null>(null)

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  const filledCount = computed(() => {
    let count = 0
    for (const row of grid.value) {
      for (const cell of row) {
        if (cell.isFilled) count++
      }
    }
    return count
  })

  const totalCells = computed(() => gridSize.value * gridSize.value)

  const allPaletteColors = computed(() => [...palette.value, ...customColors.value])

  function initEmptyGrid(size: number) {
    const newGrid: GridData = []
    for (let y = 0; y < size; y++) {
      const row: PixelCell[] = []
      for (let x = 0; x < size; x++) {
        row.push({
          x,
          y,
          referenceColor: '#FFFFFF',
          filledColor: null,
          isFilled: false
        })
      }
      newGrid.push(row)
    }
    grid.value = newGrid
    gridSize.value = size
    past.value = []
    future.value = []
  }

  async function loadImage(file: File, size: number): Promise<void> {
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('图片大小不能超过10MB')
    }

    statusMessage.value = '正在处理图片...'
    
    try {
      const result = await convertImageToPixelPuzzle(file, size, 16)
      
      const newGrid: GridData = []
      for (let y = 0; y < result.grid.height; y++) {
        const row: PixelCell[] = []
        for (let x = 0; x < result.grid.width; x++) {
          row.push({
            x,
            y,
            referenceColor: result.grid.colors[y][x],
            filledColor: null,
            isFilled: false
          })
        }
        newGrid.push(row)
      }
      
      grid.value = newGrid
      gridSize.value = size
      palette.value = result.palette
      hasImage.value = true
      past.value = []
      future.value = []
      selectedColor.value = result.palette[0] || null
      
      zoom.value = 1
      panX.value = 0
      panY.value = 0
      
      statusMessage.value = '图片转换完成，开始填色吧！'
    } catch (error) {
      statusMessage.value = '图片处理失败'
      throw error
    }
  }

  function fillCell(x: number, y: number, color: string): boolean {
    if (!grid.value[y] || !grid.value[y][x]) return false
    
    const cell = grid.value[y][x]
    if (cell.filledColor === color) {
      return false
    }

    const prevColor = cell.filledColor
    
    cell.filledColor = color
    cell.isFilled = true
    cell.isAnimating = true
    
    setTimeout(() => {
      cell.isAnimating = false
    }, 200)

    const action: HistoryAction = {
      type: 'fill',
      cells: [{ x, y, prevColor, newColor: color }],
      timestamp: Date.now()
    }
    
    past.value.push(action)
    future.value = []
    
    return true
  }

  function fillCells(cells: { x: number; y: number }[], color: string): HistoryCell[] {
    const changedCells: HistoryCell[] = []
    
    for (const { x, y } of cells) {
      if (!grid.value[y] || !grid.value[y][x]) continue
      
      const cell = grid.value[y][x]
      if (cell.filledColor === color) continue

      const prevColor = cell.filledColor
      
      cell.filledColor = color
      cell.isFilled = true
      cell.isAnimating = true
      
      changedCells.push({ x, y, prevColor, newColor: color })
    }

    if (changedCells.length > 0) {
      const action: HistoryAction = {
        type: 'batch',
        cells: changedCells,
        timestamp: Date.now()
      }
      
      past.value.push(action)
      future.value = []
      
      setTimeout(() => {
        for (const { x, y } of changedCells) {
          if (grid.value[y] && grid.value[y][x]) {
            grid.value[y][x].isAnimating = false
          }
        }
      }, 200)
    }

    return changedCells
  }

  function undo() {
    if (past.value.length === 0) return
    
    const action = past.value.pop()!
    future.value.push(action)
    
    const cells = [...action.cells].reverse()
    
    cells.forEach((cell, index) => {
      setTimeout(() => {
        if (grid.value[cell.y] && grid.value[cell.y][cell.x]) {
          grid.value[cell.y][cell.x].filledColor = cell.prevColor
          grid.value[cell.y][cell.x].isFilled = cell.prevColor !== null
          grid.value[cell.y][cell.x].isAnimating = true
          
          setTimeout(() => {
            if (grid.value[cell.y] && grid.value[cell.y][cell.x]) {
              grid.value[cell.y][cell.x].isAnimating = false
            }
          }, 200)
        }
      }, index * 50)
    })
    
    statusMessage.value = `撤销了 ${cells.length} 个格子`
  }

  function redo() {
    if (future.value.length === 0) return
    
    const action = future.value.pop()!
    past.value.push(action)
    
    action.cells.forEach((cell, index) => {
      setTimeout(() => {
        if (grid.value[cell.y] && grid.value[cell.y][cell.x]) {
          grid.value[cell.y][cell.x].filledColor = cell.newColor
          grid.value[cell.y][cell.x].isFilled = cell.newColor !== null
          grid.value[cell.y][cell.x].isAnimating = true
          
          setTimeout(() => {
            if (grid.value[cell.y] && grid.value[cell.y][cell.x]) {
              grid.value[cell.y][cell.x].isAnimating = false
            }
          }, 200)
        }
      }, index * 50)
    })
    
    statusMessage.value = `重做了 ${action.cells.length} 个格子`
  }

  function clearAll() {
    const changedCells: HistoryCell[] = []
    
    for (let y = 0; y < grid.value.length; y++) {
      for (let x = 0; x < grid.value[y].length; x++) {
        const cell = grid.value[y][x]
        if (cell.isFilled) {
          changedCells.push({
            x,
            y,
            prevColor: cell.filledColor,
            newColor: null
          })
          cell.filledColor = null
          cell.isFilled = false
        }
      }
    }
    
    if (changedCells.length > 0) {
      const action: HistoryAction = {
        type: 'clear',
        cells: changedCells,
        timestamp: Date.now()
      }
      past.value.push(action)
      future.value = []
      statusMessage.value = `清除了 ${changedCells.length} 个格子`
    }
  }

  function setZoom(newZoom: number) {
    zoom.value = Math.max(0.5, Math.min(4, newZoom))
  }

  function setPan(x: number, y: number) {
    panX.value = x
    panY.value = y
  }

  function setSelectedColor(color: string | null) {
    selectedColor.value = color
  }

  function addCustomColor(color: string) {
    if (!customColors.value.includes(color) && !palette.value.includes(color)) {
      customColors.value.push(color)
    }
  }

  function setTheme(newTheme: 'light' | 'dark') {
    theme.value = newTheme
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('pixel-puzzle-theme', newTheme)
  }

  function toggleTheme() {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('pixel-puzzle-theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
    }
  }

  function setGridSize(size: number) {
    if (size < 8 || size > 64 || size % 2 !== 0) return
    gridSize.value = size
    if (hasImage.value) {
      statusMessage.value = '请重新上传图片以应用新的网格尺寸'
    }
  }

  async function exportImage(): Promise<string> {
    isExporting.value = true
    exportProgress.value = 0
    
    return new Promise((resolve) => {
      const colors: string[][] = []
      const totalCells = gridSize.value * gridSize.value
      let processed = 0
      
      for (let y = 0; y < gridSize.value; y++) {
        const row: string[] = []
        for (let x = 0; x < gridSize.value; x++) {
          const cell = grid.value[y]?.[x]
          row.push(cell?.filledColor || cell?.referenceColor || '#FFFFFF')
          
          processed++
          if (processed % Math.floor(totalCells / 10) === 0) {
            exportProgress.value = Math.min(90, (processed / totalCells) * 100)
          }
        }
        colors.push(row)
      }
      
      setTimeout(() => {
        const dataUrl = exportGridToPng(colors, 10)
        exportProgress.value = 100
        
        setTimeout(() => {
          isExporting.value = false
          exportProgress.value = 0
          statusMessage.value = '导出成功！'
          resolve(dataUrl)
        }, 500)
      }, 100)
    })
  }

  function setStatusMessage(msg: string) {
    statusMessage.value = msg
  }

  function setHoveredCell(cell: { x: number; y: number } | null) {
    hoveredCell.value = cell
  }

  function setSelectedCellInfo(cell: { x: number; y: number } | null) {
    selectedCellInfo.value = cell
  }

  function playBeep() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return
      
      const audioContext = new AudioContextClass()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (e) {
      // ignore
    }
  }

  initEmptyGrid(32)

  return {
    grid,
    gridSize,
    selectedColor,
    palette,
    customColors,
    allPaletteColors,
    zoom,
    panX,
    panY,
    theme,
    isSpacePressed,
    past,
    future,
    isExporting,
    exportProgress,
    hasImage,
    statusMessage,
    hoveredCell,
    selectedCellInfo,
    canUndo,
    canRedo,
    filledCount,
    totalCells,
    initEmptyGrid,
    loadImage,
    fillCell,
    fillCells,
    undo,
    redo,
    clearAll,
    setZoom,
    setPan,
    setSelectedColor,
    addCustomColor,
    setTheme,
    toggleTheme,
    initTheme,
    setGridSize,
    exportImage,
    setStatusMessage,
    setHoveredCell,
    setSelectedCellInfo,
    playBeep
  }
})

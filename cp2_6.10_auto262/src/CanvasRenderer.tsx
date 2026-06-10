import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { saveAs } from 'file-saver'
import {
  FormState,
  CanvasSize,
  CANVAS_SIZES,
  GRADIENT_PRESETS
} from './types'

export interface CanvasRendererHandle {
  getThumbnail: () => string
  getCanvasBlob: (sizeId: CanvasSize['id']) => Promise<Blob | null>
}

interface CanvasRendererProps {
  formState: FormState
  onExportComplete: (thumbnail: string) => void
}

const drawBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  formState: FormState,
  bgImage?: HTMLImageElement | null
) => {
  if (formState.backgroundType === 'image' && bgImage && formState.backgroundImage) {
    const imgRatio = bgImage.width / bgImage.height
    const canvasRatio = width / height
    let drawW = width
    let drawH = height
    let drawX = 0
    let drawY = 0
    if (imgRatio > canvasRatio) {
      drawW = height * imgRatio
      drawX = (width - drawW) / 2
    } else {
      drawH = width / imgRatio
      drawY = (height - drawH) / 2
    }
    ctx.drawImage(bgImage, drawX, drawY, drawW, drawH)
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, 'rgba(0,0,0,0.1)')
    gradient.addColorStop(1, 'rgba(0,0,0,0.45)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  } else {
    const preset = GRADIENT_PRESETS.find((g) => g.id === formState.gradientId) || GRADIENT_PRESETS[0]
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    preset.colors.forEach((color, idx) => {
      gradient.addColorStop(idx / (preset.colors.length - 1), color)
    })
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }
}

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const lines: string[] = []
  const paragraphs = text.split('\n')
  for (const para of paragraphs) {
    const words = para.split('')
    let current = ''
    for (const char of words) {
      const test = current + char
      if (ctx.measureText(test).width > maxWidth && current !== '') {
        lines.push(current)
        current = char
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

const drawText = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  formState: FormState
) => {
  const { title, subtitle, guest, date, textStyle } = formState
  const scale = Math.min(width / 1080, height / 1080)
  const baseFontSize = textStyle.fontSize * scale
  const centerX = width / 2 + textStyle.offsetX * scale
  const centerY = height / 2 + textStyle.offsetY * scale

  ctx.fillStyle = textStyle.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const titleFontSize = baseFontSize * 1.4
  ctx.font = `700 ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  const titleMaxWidth = width * 0.75
  const titleLines = wrapText(ctx, title, titleMaxWidth).slice(0, 3)

  const subtitleFontSize = baseFontSize * 0.85
  const guestFontSize = baseFontSize * 0.75
  const dateFontSize = baseFontSize * 0.65

  const lineHeight = titleFontSize * 1.3
  const subtitleLineHeight = subtitleFontSize * 1.4
  const gap = baseFontSize * 0.6

  const totalHeight =
    titleLines.length * lineHeight +
    (subtitle ? subtitleLineHeight + gap : 0) +
    (guest ? guestFontSize + gap * 0.7 : 0) +
    (date ? dateFontSize + gap * 0.5 : 0)

  let cursorY = centerY - totalHeight / 2 + lineHeight / 2

  titleLines.forEach((line) => {
    ctx.fillText(line, centerX, cursorY)
    cursorY += lineHeight
  })

  if (subtitle) {
    ctx.font = `400 ${subtitleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.globalAlpha = 0.85
    const subLines = wrapText(ctx, subtitle, width * 0.7).slice(0, 2)
    subLines.forEach((line) => {
      ctx.fillText(line, centerX, cursorY)
      cursorY += subtitleLineHeight
    })
    ctx.globalAlpha = 1
    cursorY += gap * 0.3
  }

  if (guest) {
    ctx.font = `600 ${guestFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.fillText(guest, centerX, cursorY)
    cursorY += guestFontSize + gap * 0.7
  }

  if (date) {
    ctx.font = `400 ${dateFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.globalAlpha = 0.7
    ctx.fillText(date, centerX, cursorY)
    ctx.globalAlpha = 1
  }
}

interface SingleCardProps {
  size: CanvasSize
  formState: FormState
  bgImage: HTMLImageElement | null
  onExportClick: (sizeId: CanvasSize['id']) => void
  getCanvasRef: (sizeId: CanvasSize['id'], ref: HTMLCanvasElement | null) => void
}

const SingleCard: React.FC<SingleCardProps> = ({
  size,
  formState,
  bgImage,
  onExportClick,
  getCanvasRef
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const displayWidth = size.id === 'story' ? 180 : size.id === 'banner' ? 320 : 240
  const displayHeight =
    size.id === 'story' ? 320 : size.id === 'banner' ? 180 : 240

  useEffect(() => {
    getCanvasRef(size.id, canvasRef.current)
  }, [size.id, getCanvasRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = size.width
    canvas.height = size.height
    drawBackground(ctx, size.width, size.height, formState, bgImage)
    drawText(ctx, size.width, size.height, formState)
  }, [size, formState, bgImage])

  return (
    <div style={styles.cardWrapper}>
      <div style={styles.cardHeader}>
        <span style={styles.cardSize}>{size.ratio}</span>
        <span style={styles.cardPixel}>{size.width}×{size.height}</span>
      </div>
      <div style={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          style={{
            width: displayWidth,
            height: displayHeight,
            borderRadius: 2,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            display: 'block'
          }}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onExportClick(size.id)}
          style={styles.exportBtn}
        >
          导出
        </motion.button>
      </div>
    </div>
  )
}

const CanvasRenderer: React.FC<CanvasRendererProps> = ({ formState, onExportComplete }) => {
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map())
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [exportModal, setExportModal] = useState<{
    open: boolean
    targetSize: CanvasSize['id']
  }>({ open: false, targetSize: 'square' })
  const [selectedSizes, setSelectedSizes] = useState<Set<CanvasSize['id']>>(new Set(['square']))
  const [exportProgress, setExportProgress] = useState<number>(0)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (!formState.backgroundImage) {
      setBgImage(null)
      return
    }
    const img = new Image()
    img.onload = () => setBgImage(img)
    img.src = formState.backgroundImage
  }, [formState.backgroundImage])

  const getCanvasRef = useCallback((sizeId: string, ref: HTMLCanvasElement | null) => {
    if (ref) {
      canvasRefs.current.set(sizeId, ref)
    } else {
      canvasRefs.current.delete(sizeId)
    }
  }, [])

  const handleExportClick = (sizeId: CanvasSize['id']) => {
    setSelectedSizes(new Set([sizeId]))
    setExportModal({ open: true, targetSize: sizeId })
  }

  const toggleSize = (sizeId: CanvasSize['id']) => {
    setSelectedSizes((prev) => {
      const next = new Set(prev)
      if (next.has(sizeId)) next.delete(sizeId)
      else next.add(sizeId)
      return next
    })
  }

  const selectAll = () => {
    setSelectedSizes(new Set(CANVAS_SIZES.map((s) => s.id)))
  }

  const generateThumbnail = useCallback((): string => {
    const square = canvasRefs.current.get('square')
    if (!square) return ''
    const tmp = document.createElement('canvas')
    tmp.width = 48
    tmp.height = 48
    const ctx = tmp.getContext('2d')
    if (!ctx) return ''
    ctx.drawImage(square, 0, 0, 48, 48)
    return tmp.toDataURL('image/png')
  }, [])

  const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
    new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))

  const getSafeFilename = (size: CanvasSize): string => {
    const dateStr = formState.date.replace(/[年月]/g, '-').replace(/日/g, '') || 'undated'
    const titleStr = (formState.title || 'podcast').slice(0, 20).replace(/[\\/:*?"<>|]/g, '_')
    return `${titleStr}_${dateStr}_${size.ratio.replace(':', 'x')}.png`
  }

  const runExport = async () => {
    if (selectedSizes.size === 0) return
    setIsExporting(true)
    setExportProgress(0)
    const total = selectedSizes.size
    let done = 0
    const sizesArr = CANVAS_SIZES.filter((s) => selectedSizes.has(s.id))
    for (const size of sizesArr) {
      const canvas = canvasRefs.current.get(size.id)
      if (!canvas) continue
      const blob = await canvasToBlob(canvas)
      if (blob) {
        saveAs(blob, getSafeFilename(size))
      }
      done += 1
      setExportProgress(Math.round((done / total) * 100))
      await new Promise((r) => setTimeout(r, 200))
    }
    await new Promise((r) => setTimeout(r, 300))
    const thumb = generateThumbnail()
    onExportComplete(thumb)
    setIsExporting(false)
    setExportModal({ open: false, targetSize: 'square' })
    setExportProgress(0)
  }

  const memoizedCards = useMemo(
    () =>
      CANVAS_SIZES.map((size) => (
        <SingleCard
          key={size.id}
          size={size}
          formState={formState}
          bgImage={bgImage}
          onExportClick={handleExportClick}
          getCanvasRef={getCanvasRef}
        />
      )),
    [formState, bgImage, getCanvasRef]
  )

  return (
    <>
      <div style={styles.wrapper}>
        <div style={styles.cardsRow}>{memoizedCards}</div>
      </div>
      <AnimatePresence>
        {exportModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalBackdrop}
            onClick={() => !isExporting && setExportModal({ open: false, targetSize: 'square' })}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              style={styles.modal}
            >
              <div style={styles.modalTitle}>选择导出尺寸</div>
              <div style={styles.modalBody}>
                <button onClick={selectAll} style={styles.selectAllBtn}>
                  全选
                </button>
                <div style={styles.sizeList}>
                  {CANVAS_SIZES.map((size) => {
                    const checked = selectedSizes.has(size.id)
                    return (
                      <label key={size.id} style={styles.sizeOption}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSize(size.id)}
                          disabled={isExporting}
                          style={{ accentColor: '#3b82f6' }}
                        />
                        <span style={styles.sizeLabel}>{size.name} {size.ratio}</span>
                        <span style={styles.sizePixel}>{size.width}×{size.height}</span>
                      </label>
                    )
                  })}
                </div>
                {isExporting && (
                  <div style={styles.progressWrap}>
                    <div style={styles.progressBarBg}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${exportProgress}%` }}
                        transition={{ ease: 'linear', duration: 0.2 }}
                        style={styles.progressBarFill}
                      />
                    </div>
                    <div style={styles.progressText}>{exportProgress}%</div>
                  </div>
                )}
              </div>
              <div style={styles.modalFooter}>
                <button
                  onClick={() => setExportModal({ open: false, targetSize: 'square' })}
                  disabled={isExporting}
                  style={styles.cancelBtn}
                >
                  取消
                </button>
                <motion.button
                  whileHover={{ scale: isExporting ? 1 : 1.02 }}
                  whileTap={{ scale: isExporting ? 1 : 0.98 }}
                  onClick={runExport}
                  disabled={isExporting || selectedSizes.size === 0}
                  style={styles.confirmBtn}
                >
                  {isExporting ? '导出中…' : `导出 ${selectedSizes.size} 张`}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    padding: 32,
    overflow: 'auto'
  },
  cardsRow: {
    display: 'flex',
    gap: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  cardWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10
  },
  cardHeader: {
    display: 'flex',
    gap: 8,
    alignItems: 'baseline'
  },
  cardSize: {
    fontSize: 13,
    fontWeight: 600,
    color: '#2d2d2d'
  },
  cardPixel: {
    fontSize: 11,
    color: '#666'
  },
  canvasContainer: {
    position: 'relative'
  },
  exportBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: 'rgba(59,130,246,0.9)',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    backdropFilter: 'blur(4px)'
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  modal: {
    width: 380,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 24,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#2d2d2d',
    marginBottom: 16
  },
  modalBody: {
    marginBottom: 20
  },
  selectAllBtn: {
    padding: '4px 12px',
    fontSize: 12,
    color: '#3b82f6',
    backgroundColor: 'transparent',
    border: '1px solid #3b82f6',
    borderRadius: 4,
    cursor: 'pointer',
    marginBottom: 12
  },
  sizeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  sizeOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    border: '1px solid #eee',
    borderRadius: 6,
    cursor: 'pointer'
  },
  sizeLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: '#2d2d2d',
    flex: 1
  },
  sizePixel: {
    fontSize: 12,
    color: '#888'
  },
  progressWrap: {
    marginTop: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3
  },
  progressText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: 600,
    minWidth: 40,
    textAlign: 'right'
  },
  modalFooter: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end'
  },
  cancelBtn: {
    padding: '8px 16px',
    fontSize: 13,
    color: '#666',
    backgroundColor: '#f5f5f5',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer'
  },
  confirmBtn: {
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer'
  }
}

export default CanvasRenderer

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Annotation, AnnotationCategory, ImageInfo, ToolbarState } from '../types'
import '../styles/CanvasPanel.css'

interface CanvasPanelProps {
  annotations: Annotation[]
  selectedId: string | null
  toolbarState: ToolbarState
  imageInfo: ImageInfo | null
  onAnnotationsChange: (annotations: Annotation[]) => void
  onSelectAnnotation: (id: string | null) => void
  onImageUpload: (imageInfo: ImageInfo) => void
  flashingId: string | null
}

type DragMode = 'none' | 'create' | 'move' | 'resize'

const CanvasPanel: React.FC<CanvasPanelProps> = ({
  annotations,
  selectedId,
  toolbarState,
  imageInfo,
  onAnnotationsChange,
  onSelectAnnotation,
  onImageUpload,
  flashingId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 })
  const [imageScale, setImageScale] = useState(1)
  
  const [dragMode, setDragMode] = useState<DragMode>('none')
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [tempAnnotation, setTempAnnotation] = useState<Annotation | null>(null)
  const [originalAnnotation, setOriginalAnnotation] = useState<Annotation | null>(null)
  
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [pendingAnnotation, setPendingAnnotation] = useState<Annotation | null>(null)
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [annotationToDelete, setAnnotationToDelete] = useState<string | null>(null)
  
  const [isFlashing, setIsFlashing] = useState(false)

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setCanvasSize({
          width: rect.width,
          height: rect.height,
        })
      }
    }
    
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    if (imageInfo && imageInfo.width > 0 && imageInfo.height > 0) {
      const scaleX = canvasSize.width / imageInfo.width
      const scaleY = canvasSize.height / imageInfo.height
      const scale = Math.min(scaleX, scaleY, 1)
      
      setImageScale(scale)
      setImageOffset({
        x: (canvasSize.width - imageInfo.width * scale) / 2,
        y: (canvasSize.height - imageInfo.height * scale) / 2,
      })
    }
  }, [imageInfo, canvasSize])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    if (imageInfo && imageInfo.url) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(
          img,
          imageOffset.x,
          imageOffset.y,
          imageInfo.width * imageScale,
          imageInfo.height * imageScale
        )
        drawAnnotations(ctx)
      }
      img.src = imageInfo.url
    } else {
      drawAnnotations(ctx)
    }
  }, [annotations, selectedId, imageInfo, imageOffset, imageScale, canvasSize, tempAnnotation, isFlashing])

  const drawAnnotations = (ctx: CanvasRenderingContext2D) => {
    const allAnnotations = tempAnnotation 
      ? [...annotations, tempAnnotation] 
      : annotations
    
    allAnnotations.forEach((ann) => {
      const isSelected = ann.id === selectedId
      const isFlashingAnn = ann.id === flashingId && isFlashing
      
      const x = imageOffset.x + ann.x * imageScale
      const y = imageOffset.y + ann.y * imageScale
      const w = ann.width * imageScale
      const h = ann.height * imageScale
      
      ctx.save()
      
      const radius = 4
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, radius)
      
      const strokeColor = isFlashingAnn ? '#facc15' : ann.color
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = isSelected ? 2.5 : 2
      ctx.stroke()
      
      ctx.fillStyle = isFlashingAnn 
        ? 'rgba(250, 204, 21, 0.15)' 
        : `${ann.color}15`
      ctx.fill()
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, radius)
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = isSelected ? 2.5 : 2
      ctx.stroke()
      
      ctx.restore()
      
      if (ann.comment) {
        drawCategoryIcon(ctx, x, y - 10, ann.category, ann.color)
      }
      
      if (isSelected) {
        drawResizeHandles(ctx, x, y, w, h)
      }
    })
  }

  const drawCategoryIcon = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    category: AnnotationCategory,
    color: string
  ) => {
    const size = 18
    ctx.save()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 11px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    let icon = ''
    if (category === 'problem') icon = '!'
    else if (category === 'suggestion') icon = '💡'
    else if (category === 'confirmation') icon = '✓'
    
    ctx.fillText(icon, x, y)
    ctx.restore()
  }

  const drawResizeHandles = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const handleSize = 8
    ctx.fillStyle = '#38bdf8'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    
    const corners = [
      { x: x, y: y },
      { x: x + w, y: y },
      { x: x, y: y + h },
      { x: x + w, y: y + h },
    ]
    
    corners.forEach((corner) => {
      ctx.fillRect(
        corner.x - handleSize / 2,
        corner.y - handleSize / 2,
        handleSize,
        handleSize
      )
      ctx.strokeRect(
        corner.x - handleSize / 2,
        corner.y - handleSize / 2,
        handleSize,
        handleSize
      )
    })
  }

  const getCanvasCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const getImageCoords = (canvasX: number, canvasY: number) => {
    return {
      x: (canvasX - imageOffset.x) / imageScale,
      y: (canvasY - imageOffset.y) / imageScale,
    }
  }

  const hitTestAnnotation = (x: number, y: number): Annotation | null => {
    const imgCoords = getImageCoords(x, y)
    
    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i]
      if (
        imgCoords.x >= ann.x &&
        imgCoords.x <= ann.x + ann.width &&
        imgCoords.y >= ann.y &&
        imgCoords.y <= ann.y + ann.height
      ) {
        return ann
      }
    }
    return null
  }

  const hitTestResizeHandle = (x: number, y: number): boolean => {
    if (!selectedId) return false
    
    const selected = annotations.find((a) => a.id === selectedId)
    if (!selected) return false
    
    const imgCoords = getImageCoords(x, y)
    const handleSize = 12 / imageScale
    
    const bottomRightX = selected.x + selected.width
    const bottomRightY = selected.y + selected.height
    
    return (
      Math.abs(imgCoords.x - bottomRightX) <= handleSize &&
      Math.abs(imgCoords.y - bottomRightY) <= handleSize
    )
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    
    const coords = getCanvasCoords(e)
    
    if (hitTestResizeHandle(coords.x, coords.y)) {
      const selected = annotations.find((a) => a.id === selectedId)
      if (selected) {
        setDragMode('resize')
        setDragStart(coords)
        setOriginalAnnotation({ ...selected })
      }
      return
    }
    
    const hit = hitTestAnnotation(coords.x, coords.y)
    if (hit) {
      onSelectAnnotation(hit.id)
      setDragMode('move')
      setDragStart(coords)
      setOriginalAnnotation({ ...hit })
      return
    }
    
    if (!imageInfo) return
    
    const imgCoords = getImageCoords(coords.x, coords.y)
    
    if (
      imgCoords.x < 0 ||
      imgCoords.y < 0 ||
      imgCoords.x > imageInfo.width ||
      imgCoords.y > imageInfo.height
    ) {
      onSelectAnnotation(null)
      return
    }
    
    const newAnnotation: Annotation = {
      id: uuidv4(),
      x: imgCoords.x,
      y: imgCoords.y,
      width: 0,
      height: 0,
      color: toolbarState.color,
      category: toolbarState.category,
      comment: '',
      createdAt: Date.now(),
    }
    
    setDragMode('create')
    setDragStart(coords)
    setTempAnnotation(newAnnotation)
    onSelectAnnotation(newAnnotation.id)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragMode === 'none') return
    
    const coords = getCanvasCoords(e)
    const dx = (coords.x - dragStart.x) / imageScale
    const dy = (coords.y - dragStart.y) / imageScale
    
    if (dragMode === 'create' && tempAnnotation) {
      const startImgCoords = getImageCoords(dragStart.x, dragStart.y)
      const newX = Math.min(startImgCoords.x, startImgCoords.x + dx)
      const newY = Math.min(startImgCoords.y, startImgCoords.y + dy)
      const newW = Math.abs(dx)
      const newH = Math.abs(dy)
      
      setTempAnnotation({
        ...tempAnnotation,
        x: Math.max(0, newX),
        y: Math.max(0, newY),
        width: Math.min(newW, imageInfo ? imageInfo.width - newX : newW),
        height: Math.min(newH, imageInfo ? imageInfo.height - newY : newH),
      })
    } else if (dragMode === 'move' && originalAnnotation) {
      const updated = annotations.map((ann) =>
        ann.id === selectedId
          ? {
              ...ann,
              x: Math.max(0, Math.min(
                originalAnnotation.x + dx,
                (imageInfo?.width || 0) - ann.width
              )),
              y: Math.max(0, Math.min(
                originalAnnotation.y + dy,
                (imageInfo?.height || 0) - ann.height
              )),
            }
          : ann
      )
      onAnnotationsChange(updated)
    } else if (dragMode === 'resize' && originalAnnotation) {
      const updated = annotations.map((ann) =>
        ann.id === selectedId
          ? {
              ...ann,
              width: Math.max(10, originalAnnotation.width + dx),
              height: Math.max(10, originalAnnotation.height + dy),
            }
          : ann
      )
      onAnnotationsChange(updated)
    }
  }

  const handleMouseUp = () => {
    if (dragMode === 'create' && tempAnnotation) {
      if (tempAnnotation.width > 5 && tempAnnotation.height > 5) {
        setPendingAnnotation(tempAnnotation)
        setCommentText('')
        setShowCommentInput(true)
      } else {
        const newAnnotations = annotations.filter((a) => a.id !== tempAnnotation.id)
        onAnnotationsChange(newAnnotations)
        onSelectAnnotation(null)
      }
    }
    
    setDragMode('none')
    setTempAnnotation(null)
    setOriginalAnnotation(null)
  }

  const handleSubmitComment = () => {
    if (pendingAnnotation && commentText.trim()) {
      const newAnnotation = {
        ...pendingAnnotation,
        comment: commentText.trim(),
      }
      onAnnotationsChange([...annotations, newAnnotation])
      onSelectAnnotation(newAnnotation.id)
    } else if (pendingAnnotation) {
      onSelectAnnotation(null)
    }
    
    setShowCommentInput(false)
    setPendingAnnotation(null)
    setCommentText('')
  }

  const handleCancelComment = () => {
    if (pendingAnnotation) {
      const newAnnotations = annotations.filter((a) => a.id !== pendingAnnotation.id)
      onAnnotationsChange(newAnnotations)
    }
    onSelectAnnotation(null)
    setShowCommentInput(false)
    setPendingAnnotation(null)
    setCommentText('')
  }

  const handleDeleteClick = (id: string) => {
    setAnnotationToDelete(id)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (annotationToDelete) {
      const newAnnotations = annotations.filter((a) => a.id !== annotationToDelete)
      onAnnotationsChange(newAnnotations)
      if (selectedId === annotationToDelete) {
        onSelectAnnotation(null)
      }
    }
    setShowDeleteConfirm(false)
    setAnnotationToDelete(null)
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setAnnotationToDelete(null)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedId) {
        handleDeleteClick(selectedId)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId])

  useEffect(() => {
    if (flashingId) {
      let count = 0
      const flashInterval = setInterval(() => {
        setIsFlashing((prev) => !prev)
        count++
        if (count >= 4) {
          clearInterval(flashInterval)
          setIsFlashing(false)
        }
      }, 300)
      
      return () => clearInterval(flashInterval)
    }
  }, [flashingId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB')
      return
    }
    
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件（PNG/JPG）')
      return
    }
    
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      onImageUpload({
        file,
        url,
        width: img.width,
        height: img.height,
        name: file.name,
      })
    }
    img.src = url
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const getCommentInputPosition = () => {
    if (!pendingAnnotation) return { left: 0, top: 0 }
    
    const x = imageOffset.x + pendingAnnotation.x * imageScale
    const y = imageOffset.y + (pendingAnnotation.y + pendingAnnotation.height) * imageScale
    
    return {
      left: Math.min(x, canvasSize.width - 280),
      top: y + 10,
    }
  }

  const selectedAnnotation = annotations.find((a) => a.id === selectedId)

  return (
    <div className="canvas-panel" ref={containerRef}>
      <div className="canvas-header">
        {imageInfo ? (
          <div className="image-info">
            <span className="image-name">{imageInfo.name}</span>
            <span className="image-size">
              {imageInfo.width} × {imageInfo.height}px
            </span>
          </div>
        ) : (
          <button className="upload-btn" onClick={handleUploadClick}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            上传设计图
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
      
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height - 40}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="design-canvas"
        />
        
        {showCommentInput && pendingAnnotation && (
          <div
            className="comment-input-popup"
            style={{
              left: getCommentInputPosition().left,
              top: getCommentInputPosition().top,
            }}
          >
            <div className="comment-input-header">
              <span className="comment-input-title">添加评论</span>
              <div
                className="comment-category-badge"
                style={{ backgroundColor: pendingAnnotation.color }}
              >
                {pendingAnnotation.category === 'problem' && '问题'}
                {pendingAnnotation.category === 'suggestion' && '建议'}
                {pendingAnnotation.category === 'confirmation' && '确认'}
              </div>
            </div>
            <textarea
              className="comment-textarea"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="输入你的评论..."
              autoFocus
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmitComment()
                }
                if (e.key === 'Escape') {
                  handleCancelComment()
                }
              }}
            />
            <div className="comment-input-actions">
              <button className="btn-cancel" onClick={handleCancelComment}>
                取消
              </button>
              <button
                className="btn-submit"
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
              >
                提交
              </button>
            </div>
          </div>
        )}
        
        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={cancelDelete}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">确认删除</h3>
              <p className="modal-message">确定要删除这个标注吗？此操作不可撤销。</p>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={cancelDelete}>
                  取消
                </button>
                <button className="btn-delete" onClick={confirmDelete}>
                  删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="status-bar">
        <span className="status-item">
          标注总数: {annotations.length}
        </span>
        {selectedAnnotation && (
          <span className="status-item">
            选中: X={Math.round(selectedAnnotation.x)}, Y={Math.round(selectedAnnotation.y)}, 
            W={Math.round(selectedAnnotation.width)}, H={Math.round(selectedAnnotation.height)}
          </span>
        )}
      </div>
    </div>
  )
}

export default CanvasPanel

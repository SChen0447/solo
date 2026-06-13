import { useState, useRef } from 'react'
import type { Plant, StageType } from '../types'
import { STAGE_LABELS, STAGE_COLORS } from '../types'
import { uploadPlant } from '../services/api'
import './PlantUploader.css'

interface PlantUploaderProps {
  plants: Plant[]
  selectedPlants: string[]
  onPlantUploaded: (plant: Plant) => void
  onPlantSelect: (plantId: string) => void
  isLoading: boolean
}

function PlantUploader({
  plants,
  selectedPlants,
  onPlantUploaded,
  onPlantSelect,
  isLoading
}: PlantUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [plantName, setPlantName] = useState('')
  const [plantStage, setPlantStage] = useState<StageType>('mature')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (file: File) => {
    if (!file) return

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('请上传 JPG 或 PNG 格式的图片')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB')
      return
    }

    const name = plantName.trim() || `植物_${Date.now().toString().slice(-6)}`

    setUploading(true)
    try {
      const newPlant = await uploadPlant(file, name, plantStage)
      onPlantUploaded(newPlant)
      setPlantName('')
    } catch (error) {
      console.error('Upload failed:', error)
      alert('上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileChange(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileChange(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    const ripple = document.createElement('span')
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2

    ripple.style.width = ripple.style.height = size + 'px'
    ripple.style.left = x + 'px'
    ripple.style.top = y + 'px'
    ripple.classList.add('ripple')

    button.appendChild(ripple)
    setTimeout(() => ripple.remove(), 400)
  }

  return (
    <div className="plant-uploader">
      <h2 className="section-title">🌱 我的植物画廊</h2>

      <div
        className={`upload-area ${dragOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
        {uploading ? (
          <div className="uploading-spinner">
            <div className="spinner"></div>
            <p>上传中...</p>
          </div>
        ) : (
          <>
            <div className="upload-icon">📷</div>
            <p className="upload-text">点击或拖拽图片到这里上传</p>
            <p className="upload-hint">支持 JPG / PNG，最大 5MB</p>
          </>
        )}
      </div>

      <div className="plant-options">
        <input
          type="text"
          className="name-input"
          placeholder="给植物起个名字（最多10字）"
          value={plantName}
          onChange={(e) => setPlantName(e.target.value.slice(0, 10))}
          maxLength={10}
        />
        <div className="stage-selector">
          <span className="stage-label">阶段：</span>
          {(Object.keys(STAGE_LABELS) as StageType[]).map((stage) => (
            <button
              key={stage}
              className={`stage-btn ${plantStage === stage ? 'active' : ''}`}
              onClick={(e) => {
                createRipple(e)
                setPlantStage(stage)
              }}
              style={{ '--stage-color': STAGE_COLORS[stage] } as React.CSSProperties}
            >
              <span
                className="stage-dot"
                style={{ backgroundColor: STAGE_COLORS[stage] }}
              />
              {STAGE_LABELS[stage]}
            </button>
          ))}
        </div>
      </div>

      <div className="gallery-section">
        <h3 className="gallery-title">已上传植物 ({plants.length})</h3>
        {isLoading ? (
          <div className="loading-placeholder">加载中...</div>
        ) : plants.length === 0 ? (
          <div className="empty-gallery">
            <p>还没有上传植物哦~</p>
            <p className="hint">上传你的第一株盆栽开始杂交吧！</p>
          </div>
        ) : (
          <div className="plant-gallery">
            {plants.map((plant) => (
              <div
                key={plant.id}
                className={`plant-card ${
                  selectedPlants.includes(plant.id) ? 'selected' : ''
                }`}
                onClick={() => onPlantSelect(plant.id)}
              >
                <div className="plant-image-wrapper">
                  <img
                    src={plant.thumbnailUrl}
                    alt={plant.name}
                    loading="lazy"
                    className="plant-thumbnail"
                  />
                </div>
                <div className="plant-info">
                  <span className="plant-name" title={plant.name}>
                    {plant.name}
                  </span>
                  <span
                    className="plant-stage-dot"
                    style={{ backgroundColor: STAGE_COLORS[plant.stage as StageType] }}
                    title={STAGE_LABELS[plant.stage as StageType]}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PlantUploader

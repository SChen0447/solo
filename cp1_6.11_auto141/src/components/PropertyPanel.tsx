import { useSnapshot } from 'valtio'
import { 
  appState, 
  updateFlowerStemHeight, 
  updateFlowerRotation, 
  removeFlower,
  selectFlower 
} from '@/store/appState'
import { getFlowerById } from '@/data/flowerCatalog'
import './PropertyPanel.css'

const PropertyPanel = () => {
  const snap = useSnapshot(appState)

  const selectedFlower = snap.flowers.find(f => f.id === snap.selectedFlowerId)
  const flowerData = selectedFlower ? getFlowerById(selectedFlower.flowerType) : null

  const handleStemHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!snap.selectedFlowerId) return
    updateFlowerStemHeight(snap.selectedFlowerId, Number(e.target.value))
  }

  const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!snap.selectedFlowerId) return
    updateFlowerRotation(snap.selectedFlowerId, Number(e.target.value))
  }

  const handleRemove = () => {
    if (!snap.selectedFlowerId) return
    removeFlower(snap.selectedFlowerId)
  }

  const handleClose = () => {
    selectFlower(null)
  }

  if (!selectedFlower || !flowerData) {
    return null
  }

  return (
    <div className="property-panel">
      <div className="property-header">
        <div className="property-title-row">
          <div 
            className="property-flower-color"
            style={{ backgroundColor: flowerData.color }}
          />
          <h3 className="property-title">{flowerData.name}</h3>
        </div>
        <button className="close-btn" onClick={handleClose}>×</button>
      </div>

      <div className="property-content">
        <div className="property-item">
          <div className="property-label-row">
            <label className="property-label">花茎高度</label>
            <span className="property-value">{selectedFlower.stemHeight} cm</span>
          </div>
          <input
            type="range"
            min={flowerData.stemMin}
            max={flowerData.stemMax}
            step={1}
            value={selectedFlower.stemHeight}
            onChange={handleStemHeightChange}
            className="property-slider"
          />
        </div>

        <div className="property-item">
          <div className="property-label-row">
            <label className="property-label">旋转角度</label>
            <span className="property-value">{selectedFlower.rotation}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            step={5}
            value={selectedFlower.rotation}
            onChange={handleRotationChange}
            className="property-slider"
          />
        </div>

        <button className="remove-btn" onClick={handleRemove}>
          移除花朵
        </button>
      </div>
    </div>
  )
}

export default PropertyPanel

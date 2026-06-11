import { useSnapshot } from 'valtio'
import { flowerCatalog } from '@/data/flowerCatalog'
import { addFlower, appState } from '@/store/appState'
import './FlowerPanel.css'

const FlowerPanel = () => {
  const snap = useSnapshot(appState)

  const handleFlowerClick = (flowerId: string) => {
    addFlower(flowerId)
  }

  const selectedFlowerTypes = new Set(snap.flowers.map(f => f.flowerType))

  return (
    <div className="flower-panel">
      <h2 className="panel-title">花材选择</h2>
      <p className="panel-subtitle">点击花材添加到花瓶中</p>
      <div className="flower-grid">
        {flowerCatalog.map(flower => (
          <div
            key={flower.id}
            className={`flower-card ${selectedFlowerTypes.has(flower.id) ? 'selected' : ''}`}
            onClick={() => handleFlowerClick(flower.id)}
          >
            <div 
              className="flower-color-preview"
              style={{ backgroundColor: flower.color }}
            />
            <div className="flower-info">
              <span className="flower-name">{flower.name}</span>
              <span className="flower-meaning">{flower.meaning}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FlowerPanel

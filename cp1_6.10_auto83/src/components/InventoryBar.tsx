import './InventoryBar.css'

interface InventoryBarProps {
  remaining: number
  soldCount: number
  isSoldOut: boolean
}

const TOTAL_STOCK = 100

export default function InventoryBar({ remaining, soldCount, isSoldOut }: InventoryBarProps) {
  const percentage = (soldCount / TOTAL_STOCK) * 100

  return (
    <div className="inventory-container">
      <div className="inventory-progress-bar">
        <div
          className="inventory-progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="inventory-text">
        {isSoldOut ? (
          <span className="sold-out-text">已售罄</span>
        ) : (
          <span>已售{soldCount}件，剩余{remaining}件</span>
        )}
      </div>
    </div>
  )
}

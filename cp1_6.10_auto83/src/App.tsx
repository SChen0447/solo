import { useState, useMemo } from 'react'
import { useCountdown } from '@/hooks/useCountdown'
import { useInventory } from '@/hooks/useInventory'
import ProductCarousel from '@/components/ProductCarousel'
import CountdownTimer from '@/components/CountdownTimer'
import InventoryBar from '@/components/InventoryBar'
import PaymentModal from '@/components/PaymentModal'
import './App.css'

export default function App() {
  const targetDate = useMemo(() => {
    const date = new Date()
    date.setHours(date.getHours() + 2)
    date.setMinutes(date.getMinutes() + 30)
    return date
  }, [])

  const { hours, minutes, seconds, isExpired } = useCountdown(targetDate)
  const { remaining, soldCount, isSoldOut, decreaseStock } = useInventory()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleBuyClick = () => {
    if (!isExpired && !isSoldOut) {
      setIsModalOpen(true)
    }
  }

  const handlePaymentSuccess = () => {
    decreaseStock(1)
  }

  const showActionButton = !isExpired
  const isButtonDisabled = isExpired || isSoldOut

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🔥 限时抢购</h1>
        <p className="app-subtitle">超值特惠，先到先得！</p>
      </header>

      <main className="app-main">
        <section className="carousel-section">
          <ProductCarousel isExpired={isExpired} />
        </section>

        <section className="countdown-section">
          <CountdownTimer
            hours={hours}
            minutes={minutes}
            seconds={seconds}
            isExpired={isExpired}
          />
        </section>

        <section className="inventory-section">
          <InventoryBar
            remaining={remaining}
            soldCount={soldCount}
            isSoldOut={isSoldOut}
          />
        </section>

        <section className="action-section">
          {showActionButton && (
            <button
              className={`action-btn ${isButtonDisabled ? 'disabled' : ''}`}
              onClick={handleBuyClick}
              disabled={isButtonDisabled}
            >
              {isSoldOut ? '已售罄' : '立即抢购'}
            </button>
          )}
        </section>
      </main>

      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  )
}

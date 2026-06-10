import { useState, useEffect, useCallback } from 'react'
import type { Order } from './data'
import { getOrders, getOrderById } from './data'
import { v4 as uuidv4 } from 'uuid'
import OrderList from './components/OrderList'
import OrderDetail from './components/OrderDetail'
import QuoteModal from './components/QuoteModal'
import './App.css'

type View = 'list' | 'detail'

function App() {
  const [view, setView] = useState<View>('list')
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showQuoteModal, setShowQuoteModal] = useState(false)

  useEffect(() => {
    setOrders(getOrders())
  }, [])

  const handleSelectOrder = useCallback((orderId: string) => {
    const orderDetail = getOrderById(orderId)
    if (orderDetail) {
      setSelectedOrder(orderDetail)
      setView('detail')
    }
  }, [])

  const handleBackToList = useCallback(() => {
    setView('list')
    setSelectedOrder(null)
  }, [])

  const handleAddOrder = useCallback((order: Order) => {
    setOrders(prev => [order, ...prev])
  }, [])

  const handleUpdateOrder = useCallback((updatedOrder: Order) => {
    setSelectedOrder(updatedOrder)
    setOrders(prev =>
      prev.map(o => {
        if (o.id === updatedOrder.id) {
          return {
            ...updatedOrder,
            rawMaterials: undefined,
            procedures: undefined
          }
        }
        return o
      })
    )
  }, [])

  const handleDeleteOrder = useCallback((orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId))
  }, [])

  const handleDuplicateOrder = useCallback((order: Order) => {
    const duplicated: Order = {
      ...order,
      id: uuidv4(),
      customerName: order.customerName + ' (副本)',
      workName: order.workName + ' (副本)',
      status: 'pending'
    }
    setOrders(prev => [duplicated, ...prev])
  }, [])

  const handleGenerateQuote = useCallback(() => {
    setShowQuoteModal(true)
  }, [])

  const handleCloseQuote = useCallback(() => {
    setShowQuoteModal(false)
  }, [])

  return (
    <div className="app-container">
      {view === 'list' && (
        <OrderList
          orders={orders}
          onSelectOrder={handleSelectOrder}
          onAddOrder={handleAddOrder}
          onUpdateOrder={handleUpdateOrder}
          onDeleteOrder={handleDeleteOrder}
          onDuplicateOrder={handleDuplicateOrder}
        />
      )}

      {view === 'detail' && selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          onBack={handleBackToList}
          onUpdate={handleUpdateOrder}
          onGenerateQuote={handleGenerateQuote}
        />
      )}

      {showQuoteModal && selectedOrder && (
        <QuoteModal
          order={selectedOrder}
          onClose={handleCloseQuote}
        />
      )}
    </div>
  )
}

export default App

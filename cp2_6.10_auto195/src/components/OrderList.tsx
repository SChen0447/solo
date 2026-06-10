import { useState } from 'react'
import type { Order, OrderStatus } from '../data'
import { v4 as uuidv4 } from 'uuid'
import './OrderList.css'

interface OrderListProps {
  orders: Order[]
  onSelectOrder: (orderId: string) => void
  onAddOrder: (order: Order) => void
  onUpdateOrder: (order: Order) => void
  onDeleteOrder: (orderId: string) => void
  onDuplicateOrder: (order: Order) => void
}

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  in_progress: { label: '进行中', color: '#f4a261' },
  pending: { label: '待确认', color: '#e76f51' },
  completed: { label: '已完成', color: '#2a9d8f' }
}

function OrderList({
  orders,
  onSelectOrder,
  onAddOrder,
  onUpdateOrder,
  onDeleteOrder,
  onDuplicateOrder
}: OrderListProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)

  const handleMenuClick = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenuId(activeMenuId === orderId ? null : orderId)
  }

  const handleEdit = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingOrder({ ...order })
    setShowEditModal(true)
    setActiveMenuId(null)
  }

  const handleDelete = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('确定要删除这个订单吗？')) {
      onDeleteOrder(orderId)
    }
    setActiveMenuId(null)
  }

  const handleDuplicate = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation()
    onDuplicateOrder(order)
    setActiveMenuId(null)
  }

  const handleAddClick = () => {
    const newOrder: Order = {
      id: uuidv4(),
      customerName: '',
      workName: '',
      status: 'pending',
      deadline: new Date().toISOString().split('T')[0],
      estimatedPrice: 0,
      rawMaterials: [],
      procedures: []
    }
    setEditingOrder(newOrder)
    setShowEditModal(true)
  }

  const handleSaveEdit = () => {
    if (!editingOrder) return
    if (!editingOrder.customerName.trim() || !editingOrder.workName.trim()) {
      alert('请填写客户名和作品名')
      return
    }
    if (orders.find(o => o.id === editingOrder.id)) {
      onUpdateOrder(editingOrder)
    } else {
      onAddOrder(editingOrder)
    }
    setShowEditModal(false)
    setEditingOrder(null)
  }

  const handleCancelEdit = () => {
    setShowEditModal(false)
    setEditingOrder(null)
  }

  return (
    <div className="order-list-container">
      <header className="order-list-header">
        <h1>匠心手作 · 订单管理</h1>
        <p className="subtitle">用手艺记录每一份温暖</p>
      </header>

      <div className="order-grid">
        {orders.map(order => {
          const status = statusConfig[order.status]
          return (
            <div
              key={order.id}
              className="order-card"
              onClick={() => onSelectOrder(order.id)}
            >
              <div className="card-menu-wrapper">
                <button
                  className="card-menu-btn"
                  onClick={(e) => handleMenuClick(order.id, e)}
                >
                  <span></span>
                  <span></span>
                  <span></span>
                </button>
                {activeMenuId === order.id && (
                  <div className="card-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => handleEdit(order, e)}>✏️ 编辑</button>
                    <button onClick={(e) => handleDelete(order.id, e)}>🗑️ 删除</button>
                    <button onClick={(e) => handleDuplicate(order, e)}>📋 复制</button>
                  </div>
                )}
              </div>

              <div
                className="status-badge"
                style={{ backgroundColor: status.color }}
              >
                {status.label}
              </div>

              <h3 className="customer-name">{order.customerName}</h3>
              <p className="work-name">{order.workName}</p>

              <div className="card-footer">
                <span className="deadline">📅 {order.deadline}</span>
                <span className="price">¥{order.estimatedPrice.toFixed(2)}</span>
              </div>
            </div>
          )
        })}
      </div>

      <button className="floating-add-btn" onClick={handleAddClick}>
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      {showEditModal && editingOrder && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{orders.find(o => o.id === editingOrder.id) ? '编辑订单' : '新建订单'}</h2>

            <div className="form-group">
              <label>客户名</label>
              <input
                type="text"
                value={editingOrder.customerName}
                onChange={(e) => setEditingOrder({ ...editingOrder, customerName: e.target.value })}
                placeholder="请输入客户姓名"
              />
            </div>

            <div className="form-group">
              <label>作品名</label>
              <input
                type="text"
                value={editingOrder.workName}
                onChange={(e) => setEditingOrder({ ...editingOrder, workName: e.target.value })}
                placeholder="请输入作品名称"
              />
            </div>

            <div className="form-group">
              <label>状态</label>
              <select
                value={editingOrder.status}
                onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value as OrderStatus })}
              >
                <option value="pending">待确认</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
              </select>
            </div>

            <div className="form-group">
              <label>截止日期</label>
              <input
                type="date"
                value={editingOrder.deadline}
                onChange={(e) => setEditingOrder({ ...editingOrder, deadline: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>预估总价</label>
              <input
                type="number"
                value={editingOrder.estimatedPrice}
                onChange={(e) => setEditingOrder({ ...editingOrder, estimatedPrice: Number(e.target.value) })}
                min="0"
                step="0.01"
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={handleCancelEdit}>取消</button>
              <button className="btn-save" onClick={handleSaveEdit}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderList

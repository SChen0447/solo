import { useState, useEffect } from 'react'
import type { Order, RawMaterial, Procedure } from '../data'
import { calculateCost, type CostResult } from '../PriceCalculator'
import { v4 as uuidv4 } from 'uuid'
import './OrderDetail.css'

interface OrderDetailProps {
  order: Order
  onBack: () => void
  onUpdate: (order: Order) => void
  onGenerateQuote: () => void
}

function OrderDetail({ order, onBack, onUpdate, onGenerateQuote }: OrderDetailProps) {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>(order.rawMaterials || [])
  const [procedures, setProcedures] = useState<Procedure[]>(order.procedures || [])
  const [cost, setCost] = useState<CostResult>(calculateCost([], []))

  useEffect(() => {
    setCost(calculateCost(rawMaterials, procedures))
  }, [rawMaterials, procedures])

  useEffect(() => {
    onUpdate({
      ...order,
      rawMaterials,
      procedures,
      estimatedPrice: cost.suggestedPrice
    })
  }, [rawMaterials, procedures, cost.suggestedPrice])

  const updateRawMaterial = (id: string, field: keyof RawMaterial, value: string | number) => {
    setRawMaterials(prev =>
      prev.map(mat =>
        mat.id === id ? { ...mat, [field]: value } : mat
      )
    )
  }

  const addRawMaterial = () => {
    const newMat: RawMaterial = {
      id: uuidv4(),
      name: '',
      unitPrice: 0,
      quantity: 0
    }
    setRawMaterials(prev => [...prev, newMat])
  }

  const removeRawMaterial = (id: string) => {
    setRawMaterials(prev => prev.filter(mat => mat.id !== id))
  }

  const calculateDuration = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    let duration = (endH * 60 + endM) - (startH * 60 + startM)
    if (duration < 0) duration += 24 * 60
    return duration
  }

  const updateProcedure = (id: string, field: keyof Procedure, value: string | number) => {
    setProcedures(prev =>
      prev.map(proc => {
        if (proc.id !== id) return proc
        const updated = { ...proc, [field]: value }
        if (field === 'startTime' || field === 'endTime') {
          const start = field === 'startTime' ? String(value) : proc.startTime
          const end = field === 'endTime' ? String(value) : proc.endTime
          updated.duration = calculateDuration(start, end)
        }
        return updated
      })
    )
  }

  const addProcedure = () => {
    const newProc: Procedure = {
      id: uuidv4(),
      name: '',
      startTime: '09:00',
      endTime: '10:00',
      duration: 60,
      proficiencyCoefficient: 1.0
    }
    setProcedures(prev => [...prev, newProc])
  }

  const removeProcedure = (id: string) => {
    setProcedures(prev => prev.filter(proc => proc.id !== id))
  }

  return (
    <div className="order-detail-container">
      <header className="detail-header">
        <button className="back-btn" onClick={onBack}>
          ← 返回订单列表
        </button>
        <div className="order-title-info">
          <h1>{order.workName}</h1>
          <p>客户：{order.customerName} · 截止：{order.deadline}</p>
        </div>
      </header>

      <div className="detail-content">
        <div className="raw-materials-section">
          <div className="section-header">
            <h2>原料清单</h2>
            <button className="add-btn-sm" onClick={addRawMaterial}>+ 添加原料</button>
          </div>

          <div className="table-header-row mat-header">
            <span>原料名称</span>
            <span>单价</span>
            <span>用量</span>
            <span>小计</span>
            <span></span>
          </div>

          <div className="table-body">
            {rawMaterials.map((mat, index) => (
              <div
                key={mat.id}
                className={`table-row mat-row ${index % 2 === 0 ? 'row-light' : 'row-dark'}`}
              >
                <input
                  type="text"
                  value={mat.name}
                  onChange={(e) => updateRawMaterial(mat.id, 'name', e.target.value)}
                  placeholder="原料名"
                  className="cell-input name-input"
                />
                <input
                  type="number"
                  value={mat.unitPrice}
                  onChange={(e) => updateRawMaterial(mat.id, 'unitPrice', Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className="cell-input num-input"
                />
                <input
                  type="number"
                  value={mat.quantity}
                  onChange={(e) => updateRawMaterial(mat.id, 'quantity', Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className="cell-input num-input"
                />
                <span className="cell-value subtotal">
                  ¥{(mat.unitPrice * mat.quantity).toFixed(2)}
                </span>
                <button
                  className="delete-btn-small"
                  onClick={() => removeRawMaterial(mat.id)}
                  title="删除"
                >
                  ×
                </button>
              </div>
            ))}
            {rawMaterials.length === 0 && (
              <div className="empty-state">暂无原料记录，点击上方按钮添加</div>
            )}
          </div>
        </div>

        <div className="procedures-section">
          <div className="section-header">
            <h2>工时刻录</h2>
            <button className="add-procedure-btn" onClick={addProcedure}>+ 添加工序</button>
          </div>

          <div className="table-header-row proc-header">
            <span>工序名</span>
            <span>开始</span>
            <span>结束</span>
            <span>耗时(分)</span>
            <span>熟练度</span>
            <span></span>
          </div>

          <div className="table-body">
            {procedures.map((proc, index) => (
              <div
                key={proc.id}
                className={`table-row proc-row ${index % 2 === 0 ? 'row-light' : 'row-dark'}`}
              >
                <input
                  type="text"
                  value={proc.name}
                  onChange={(e) => updateProcedure(proc.id, 'name', e.target.value)}
                  placeholder="工序名"
                  className="cell-input name-input"
                />
                <input
                  type="time"
                  value={proc.startTime}
                  onChange={(e) => updateProcedure(proc.id, 'startTime', e.target.value)}
                  className="cell-input time-input"
                />
                <input
                  type="time"
                  value={proc.endTime}
                  onChange={(e) => updateProcedure(proc.id, 'endTime', e.target.value)}
                  className="cell-input time-input"
                />
                <span className="cell-value duration">{proc.duration}</span>
                <input
                  type="number"
                  value={proc.proficiencyCoefficient}
                  onChange={(e) => updateProcedure(proc.id, 'proficiencyCoefficient', Number(e.target.value))}
                  min="0.1"
                  max="3"
                  step="0.1"
                  className="cell-input coeff-input"
                />
                <button
                  className="delete-proc-btn"
                  onClick={() => removeProcedure(proc.id)}
                  title="删除"
                >
                  ×
                </button>
              </div>
            ))}
            {procedures.length === 0 && (
              <div className="empty-state">暂无工序记录，点击上方按钮添加</div>
            )}
          </div>
        </div>
      </div>

      <div className="cost-footer">
        <div className="cost-left">
          <div className="cost-item">
            <span className="cost-label">原料成本</span>
            <span className="cost-value animate-number">¥{cost.rawMaterialCost.toFixed(2)}</span>
          </div>
          <div className="cost-divider"></div>
          <div className="cost-item">
            <span className="cost-label">工时成本</span>
            <span className="cost-value animate-number">¥{cost.laborCost.toFixed(2)}</span>
          </div>
          <div className="cost-divider"></div>
          <div className="cost-item">
            <span className="cost-label">总成本</span>
            <span className="cost-value total animate-number">¥{cost.totalCost.toFixed(2)}</span>
          </div>
        </div>
        <div className="cost-right">
          <div className="suggested-price">
            <span className="price-label">建议报价</span>
            <span className="price-value animate-number">¥{cost.suggestedPrice.toFixed(2)}</span>
          </div>
          <button className="generate-quote-btn" onClick={onGenerateQuote}>
            生成报价单
          </button>
        </div>
      </div>
    </div>
  )
}

export default OrderDetail

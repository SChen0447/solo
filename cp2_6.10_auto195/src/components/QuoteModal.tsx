import type { Order } from '../data'
import { calculateCost, getProfitMargin, getHourlyWageRate, getStudioName } from '../PriceCalculator'
import './QuoteModal.css'

interface QuoteModalProps {
  order: Order
  onClose: () => void
}

function QuoteModal({ order, onClose }: QuoteModalProps) {
  const rawMaterials = order.rawMaterials || []
  const procedures = order.procedures || []
  const cost = calculateCost(rawMaterials, procedures)
  const profitMargin = getProfitMargin()
  const hourlyRate = getHourlyWageRate()
  const studioName = getStudioName()

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="quote-overlay" onClick={onClose}>
      <div className="quote-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quote-content">
          <div className="quote-studio-name">{studioName}</div>

          <div className="quote-title">报 价 单</div>

          <div className="quote-info-row">
            <div className="quote-info-item">
              <span className="info-label">客户：</span>
              <span className="info-value">{order.customerName}</span>
            </div>
            <div className="quote-info-item">
              <span className="info-label">作品：</span>
              <span className="info-value">{order.workName}</span>
            </div>
          </div>

          <div className="quote-section">
            <h3>一、原料明细</h3>
            <table className="quote-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>原料名称</th>
                  <th>单价（元）</th>
                  <th>用量</th>
                  <th>小计（元）</th>
                </tr>
              </thead>
              <tbody>
                {rawMaterials.map((mat, idx) => (
                  <tr key={mat.id}>
                    <td>{idx + 1}</td>
                    <td>{mat.name || '-'}</td>
                    <td>{mat.unitPrice.toFixed(2)}</td>
                    <td>{mat.quantity}</td>
                    <td>{(mat.unitPrice * mat.quantity).toFixed(2)}</td>
                  </tr>
                ))}
                {rawMaterials.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-cell">暂无原料记录</td>
                  </tr>
                )}
                <tr className="total-row">
                  <td colSpan={4} className="total-label">原料成本合计</td>
                  <td className="total-value">¥{cost.rawMaterialCost.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="quote-section">
            <h3>二、工时明细</h3>
            <table className="quote-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>工序名称</th>
                  <th>耗时（分钟）</th>
                  <th>熟练度系数</th>
                  <th>工时成本（元）</th>
                </tr>
              </thead>
              <tbody>
                {procedures.map((proc, idx) => (
                  <tr key={proc.id}>
                    <td>{idx + 1}</td>
                    <td>{proc.name || '-'}</td>
                    <td>{proc.duration}</td>
                    <td>{proc.proficiencyCoefficient.toFixed(1)}</td>
                    <td>{((proc.duration / 60) * hourlyRate * proc.proficiencyCoefficient).toFixed(2)}</td>
                  </tr>
                ))}
                {procedures.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-cell">暂无工序记录</td>
                  </tr>
                )}
                <tr className="total-row">
                  <td colSpan={4} className="total-label">工时成本合计</td>
                  <td className="total-value">¥{cost.laborCost.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="quote-summary">
            <div className="summary-row">
              <span className="summary-label">总成本：</span>
              <span className="summary-value">¥{cost.totalCost.toFixed(2)}</span>
            </div>
            <div className="summary-note">
              利润率说明：报价按总成本 × {profitMargin} 倍计算（含材料损耗、设备折旧、运营成本及合理利润）
            </div>
            <div className="summary-row suggested">
              <span className="summary-label">建议报价：</span>
              <span className="summary-price">¥{cost.suggestedPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="quote-footer">
            <div className="quote-date">生成日期：{today}</div>
            <div className="quote-stamp">{studioName}</div>
          </div>
        </div>

        <div className="quote-actions no-print">
          <button className="quote-btn-close" onClick={onClose}>关闭</button>
          <button className="quote-btn-print" onClick={handlePrint}>打印</button>
        </div>
      </div>
    </div>
  )
}

export default QuoteModal

import { useState, useEffect } from 'react'
import './PaymentModal.css'

type PaymentMethod = 'alipay' | 'wechat' | null
type PaymentStatus = 'form' | 'loading' | 'success'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onPaymentSuccess: () => void
}

export default function PaymentModal({ isOpen, onClose, onPaymentSuccess }: PaymentModalProps) {
  const [phone, setPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null)
  const [phoneError, setPhoneError] = useState('')
  const [status, setStatus] = useState<PaymentStatus>('form')

  useEffect(() => {
    if (!isOpen) {
      setPhone('')
      setPaymentMethod(null)
      setPhoneError('')
      setStatus('form')
    }
  }, [isOpen])

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        onPaymentSuccess()
        onClose()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [status, onClose, onPaymentSuccess])

  const validatePhone = (value: string): boolean => {
    const phoneRegex = /^1\d{10}$/
    if (!phoneRegex.test(value)) {
      setPhoneError('请输入正确的11位手机号码')
      return false
    }
    setPhoneError('')
    return true
  }

  const handleConfirmPayment = () => {
    if (!validatePhone(phone)) return
    if (!paymentMethod) return

    setStatus('loading')
    setTimeout(() => {
      setStatus('success')
    }, 3000)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {status === 'form' && (
          <>
            <h2 className="modal-title">确认订单</h2>
            <div className="modal-field">
              <label className="field-label">手机号</label>
              <input
                type="tel"
                className="field-input"
                placeholder="请输入11位手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={11}
              />
              {phoneError && <span className="field-error">{phoneError}</span>}
            </div>
            <div className="modal-field">
              <label className="field-label">支付方式</label>
              <div className="payment-options">
                <div
                  className={`payment-option ${paymentMethod === 'alipay' ? 'selected alipay' : ''}`}
                  onClick={() => setPaymentMethod('alipay')}
                >
                  <span className="payment-icon">💳</span>
                  <span>支付宝</span>
                </div>
                <div
                  className={`payment-option ${paymentMethod === 'wechat' ? 'selected wechat' : ''}`}
                  onClick={() => setPaymentMethod('wechat')}
                >
                  <span className="payment-icon">💬</span>
                  <span>微信支付</span>
                </div>
              </div>
            </div>
            <button
              className="confirm-btn"
              onClick={handleConfirmPayment}
              disabled={!phone || !paymentMethod}
            >
              确认支付
            </button>
          </>
        )}
        {status === 'loading' && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">支付处理中...</p>
          </div>
        )}
        {status === 'success' && (
          <div className="success-container">
            <div className="success-icon">✓</div>
            <p className="success-text">支付成功</p>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { ShoppingCart, Calendar, User, Phone, AlertCircle, Check } from 'lucide-react';
import { createOrder } from '../api/bakeryApi.js';

const OrderForm = ({ recipes, onOrderCreated }) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 7), 'yyyy-MM-dd');

  const [formData, setFormData] = useState({
    recipeId: recipes[0]?.id || '',
    quantity: 1,
    pickupDate: today,
    customerName: '',
    customerPhone: '',
  });
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);

  const selectedRecipe = recipes.find((r) => r.id === formData.recipeId);
  const maxQuantity = 100;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 0 : value,
    }));
    setErrors([]);
  };

  const validateForm = () => {
    const newErrors = [];
    if (!formData.recipeId) newErrors.push('请选择产品');
    if (!formData.quantity || formData.quantity < 1) newErrors.push('请输入有效数量');
    if (formData.quantity > maxQuantity) newErrors.push(`数量不能超过 ${maxQuantity}`);
    if (!formData.pickupDate) newErrors.push('请选择取货日期');
    if (formData.pickupDate < today) newErrors.push('取货日期不能早于今天');
    if (formData.pickupDate > maxDate) newErrors.push('取货日期最多只能预订7天后');
    if (!formData.customerName.trim()) newErrors.push('请输入客户姓名');
    if (!formData.customerPhone.trim()) newErrors.push('请输入联系电话');
    if (!/^1[3-9]\d{9}$/.test(formData.customerPhone)) newErrors.push('请输入有效的手机号码');
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
      return;
    }

    setSubmitting(true);
    setErrors([]);

    try {
      const result = await createOrder(formData);
      if (result.ok) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2500);
        setFormData({
          recipeId: recipes[0]?.id || '',
          quantity: 1,
          pickupDate: today,
          customerName: '',
          customerPhone: '',
        });
        onOrderCreated?.();
      } else {
        setErrors([result.data.error, ...result.data.shortages.map(
          (s) => `${s.name}：需要 ${s.needed}${s.unit}，仅有 ${s.available}${s.unit}`
        )]);
        setShakeForm(true);
        setTimeout(() => setShakeForm(false), 500);
      }
    } catch (err) {
      setErrors(['提交失败，请稍后重试']);
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`order-form-container ${shakeForm ? 'shake' : ''}`}>
      {showSuccess && (
        <div className="success-animation">
          <div className="bird">🐦</div>
          <div className="success-message">
            <Check size={20} />
            订单提交成功！
          </div>
        </div>
      )}

      <h2 className="form-title">
        <ShoppingCart size={20} />
        创建预订订单
      </h2>

      {errors.length > 0 && (
        <div className="form-errors">
          {errors.map((error, i) => (
            <div key={i} className="error-item">
              <AlertCircle size={14} />
              {error}
            </div>
          ))}
        </div>
      )}

      <form className="order-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">
            <ShoppingCart size={14} />
            选择产品
          </label>
          <select
            name="recipeId"
            value={formData.recipeId}
            onChange={handleChange}
            className="form-input"
          >
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} - ¥{r.sellingPrice}/个
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              <ShoppingCart size={14} />
              数量
            </label>
            <input
              type="number"
              name="quantity"
              min="1"
              max={maxQuantity}
              value={formData.quantity}
              onChange={handleChange}
              className="form-input"
            />
            <span className="form-hint">最多可订 {maxQuantity} 个</span>
          </div>

          <div className="form-group">
            <label className="form-label">
              <Calendar size={14} />
              取货日期
            </label>
            <input
              type="date"
              name="pickupDate"
              min={today}
              max={maxDate}
              value={formData.pickupDate}
              onChange={handleChange}
              className="form-input"
            />
            <span className="form-hint">可预订今日起7天内</span>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              <User size={14} />
              客户姓名
            </label>
            <input
              type="text"
              name="customerName"
              placeholder="请输入姓名"
              value={formData.customerName}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Phone size={14} />
              联系电话
            </label>
            <input
              type="tel"
              name="customerPhone"
              placeholder="请输入手机号"
              value={formData.customerPhone}
              onChange={handleChange}
              className="form-input"
            />
          </div>
        </div>

        {selectedRecipe && (
          <div className="order-summary">
            <span>订单金额：</span>
            <span className="summary-amount">
              ¥{(selectedRecipe.sellingPrice * formData.quantity).toFixed(2)}
            </span>
          </div>
        )}

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? '提交中...' : '提交订单'}
          <span className="ripple" />
        </button>
      </form>
    </div>
  );
};

export default OrderForm;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SignupFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; readerId: string; phone: string }) => Promise<void>;
}

interface FormErrors {
  name?: string;
  readerId?: string;
  phone?: string;
}

const SignupForm: React.FC<SignupFormProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [readerId, setReaderId] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const validateName = (val: string): string | undefined => {
    if (!val) return '请输入姓名';
    if (!/^[\u4e00-\u9fa5]{2,10}$/.test(val)) return '姓名必须是2-10个汉字';
    return undefined;
  };

  const validateReaderId = (val: string): string | undefined => {
    if (!val) return '请输入读者证号';
    if (!/^\d{8}$/.test(val)) return '读者证号必须是8位数字';
    return undefined;
  };

  const validatePhone = (val: string): string | undefined => {
    if (!val) return '请输入联系电话';
    if (!/^1\d{10}$/.test(val)) return '手机号必须是11位数字';
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: FormErrors = {
      name: validateName(name),
      readerId: validateReaderId(readerId),
      phone: validatePhone(phone)
    };
    setErrors(newErrors);

    if (Object.values(newErrors).some((v) => v !== undefined)) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({ name, readerId, phone });
      setName('');
      setReaderId('');
      setPhone('');
      setErrors({});
      onClose();
    } catch {
      // 错误在父组件处理
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: -20 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <h2 className="modal-title">活动报名</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">姓名</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({ ...errors, name: validateName(e.target.value) });
                  }}
                  placeholder="请输入2-10个汉字"
                />
                {errors.name && <div className="form-error">{errors.name}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">读者证号</label>
                <input
                  type="text"
                  className="form-input"
                  value={readerId}
                  onChange={(e) => {
                    setReaderId(e.target.value);
                    if (errors.readerId) setErrors({ ...errors, readerId: validateReaderId(e.target.value) });
                  }}
                  placeholder="请输入8位数字"
                />
                {errors.readerId && <div className="form-error">{errors.readerId}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">联系电话</label>
                <input
                  type="text"
                  className="form-input"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors({ ...errors, phone: validatePhone(e.target.value) });
                  }}
                  placeholder="请输入11位手机号"
                />
                {errors.phone && <div className="form-error">{errors.phone}</div>}
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-back" onClick={onClose} disabled={submitting}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? '提交中...' : '确认报名'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SignupForm;

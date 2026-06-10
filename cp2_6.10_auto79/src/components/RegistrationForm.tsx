import React, { useState } from 'react';

interface RegistrationFormProps {
  activityId: string;
  capacity: number;
  registeredCount: number;
  onSubmit: (data: { name: string; email: string; count: number }) => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ capacity, registeredCount, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    count: 1,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const remaining = capacity - registeredCount;
  const isFull = remaining <= 0;

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入姓名';
    }

    if (!formData.email.trim()) {
      newErrors.email = '请输入邮箱';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }

    if (formData.count < 1) {
      newErrors.count = '参加人数至少1人';
    } else if (formData.count > remaining) {
      newErrors.count = `剩余名额不足，还剩${remaining}个名额`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isFull) return;

    setIsAnimating(true);
    setIsSubmitting(true);

    setTimeout(() => {
      onSubmit({
        name: formData.name,
        email: formData.email,
        count: formData.count,
      });
      setFormData({ name: '', email: '', count: 1 });
      setErrors({});
      setIsSubmitting(false);
      setIsAnimating(false);
      setSuccessMessage('报名成功！');
      setTimeout(() => setSuccessMessage(''), 2000);
    }, 300);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
    background: 'rgba(255,255,255,0.8)',
  };

  return (
    <div>
      <h3 style={{ fontSize: '16px', marginBottom: '16px', color: '#1f2937' }}>
        {isFull ? '活动已满员' : '快速报名'}
      </h3>

      {successMessage && (
        <div
          style={{
            padding: '10px 16px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid #10B981',
            borderRadius: '8px',
            color: '#059669',
            fontSize: '14px',
            marginBottom: '16px',
          }}
        >
          {successMessage}
        </div>
      )}

      {!isFull && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#374151' }}>
              姓名
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入您的姓名"
              style={inputStyle}
              onMouseEnter={(e) => {
                (e.target as HTMLInputElement).style.transform = 'translateY(-2px)';
                (e.target as HTMLInputElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLInputElement).style.transform = 'translateY(0)';
                (e.target as HTMLInputElement).style.boxShadow = 'none';
              }}
              onMouseDown={(e) => {
                (e.target as HTMLInputElement).style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                (e.target as HTMLInputElement).style.transform = 'translateY(-2px)';
              }}
            />
            {errors.name && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.name}</p>}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#374151' }}>
              邮箱
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="example@email.com"
              style={inputStyle}
              onMouseEnter={(e) => {
                (e.target as HTMLInputElement).style.transform = 'translateY(-2px)';
                (e.target as HTMLInputElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLInputElement).style.transform = 'translateY(0)';
                (e.target as HTMLInputElement).style.boxShadow = 'none';
              }}
              onMouseDown={(e) => {
                (e.target as HTMLInputElement).style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                (e.target as HTMLInputElement).style.transform = 'translateY(-2px)';
              }}
            />
            {errors.email && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.email}</p>}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#374151' }}>
              参加人数 (剩余{remaining}个名额)
            </label>
            <input
              type="number"
              min={1}
              max={remaining}
              value={formData.count}
              onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) || 1 })}
              style={inputStyle}
              onMouseEnter={(e) => {
                (e.target as HTMLInputElement).style.transform = 'translateY(-2px)';
                (e.target as HTMLInputElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLInputElement).style.transform = 'translateY(0)';
                (e.target as HTMLInputElement).style.boxShadow = 'none';
              }}
              onMouseDown={(e) => {
                (e.target as HTMLInputElement).style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                (e.target as HTMLInputElement).style.transform = 'translateY(-2px)';
              }}
            />
            {errors.count && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.count}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #10B981 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: isAnimating ? 'scale(0.95)' : 'scale(1)',
              animation: isAnimating ? 'bounce 0.3s ease' : 'none',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.target as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
            }}
            onMouseDown={(e) => {
              if (!isSubmitting) {
                (e.target as HTMLButtonElement).style.transform = 'scale(0.97)';
              }
            }}
            onMouseUp={(e) => {
              if (!isSubmitting) {
                (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
              }
            }}
          >
            提交报名
          </button>
        </form>
      )}
    </div>
  );
};

export default RegistrationForm;

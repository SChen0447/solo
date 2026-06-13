import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

interface AuthModalProps {
  mode: 'login' | 'register';
  onClose: () => void;
  onSwitchMode: () => void;
}

export default function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
  const [username, setUsername] = useState('');
  const { login, register } = useAuthStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    if (mode === 'login') {
      login(username);
    } else {
      register(username);
    }
    onClose();
  };

  return (
    <>
      <div className="auth-overlay" onClick={onClose}>
        <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
          <button className="auth-close" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>

          <h2 className="auth-title">
            {mode === 'login' ? '欢迎回来' : '加入画廊'}
          </h2>
          <p className="auth-subtitle">
            {mode === 'login' ? '登录以继续你的艺术之旅' : '创建账户，收藏你喜爱的画作'}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              className="auth-input"
              autoFocus
            />
            <button type="submit" className="auth-submit">
              {mode === 'login' ? '登 录' : '注 册'}
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'login' ? '还没有账户？' : '已有账户？'}
            <button onClick={onSwitchMode} className="auth-switch-btn">
              {mode === 'login' ? '立即注册' : '返回登录'}
            </button>
          </p>
        </div>
      </div>

      <style>{`
        .auth-overlay {
          position: fixed;
          inset: 0;
          background: rgba(61, 53, 41, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          animation: fadeInUp 0.2s ease;
        }

        .auth-modal {
          position: relative;
          width: 90%;
          max-width: 400px;
          background: var(--color-bg);
          border-radius: 16px;
          padding: 40px 32px 32px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(201, 185, 154, 0.4);
        }

        .auth-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-light);
        }

        .auth-close:hover {
          background: rgba(201, 185, 154, 0.2);
          color: var(--color-text);
        }

        .auth-title {
          font-size: 1.75rem;
          color: var(--color-text);
          margin-bottom: 8px;
          text-align: center;
        }

        .auth-subtitle {
          font-size: 0.9rem;
          color: var(--color-text-light);
          text-align: center;
          margin-bottom: 28px;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .auth-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--color-text-light);
          margin-top: 8px;
        }

        .auth-input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid var(--color-bronze);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.5);
          font-size: 1rem;
          font-family: inherit;
          color: var(--color-text);
          outline: none;
          transition: var(--transition-base);
        }

        .auth-input:focus {
          border-color: var(--color-gold);
          background: white;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
        }

        .auth-input::placeholder {
          color: var(--color-bronze);
        }

        .auth-submit {
          margin-top: 20px;
          padding: 14px;
          background: linear-gradient(135deg, var(--color-gold), var(--color-gold-light));
          color: white;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: 4px;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.35);
        }

        .auth-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(212, 175, 55, 0.45);
        }

        .auth-switch {
          margin-top: 20px;
          text-align: center;
          font-size: 0.9rem;
          color: var(--color-text-light);
        }

        .auth-switch-btn {
          color: var(--color-gold);
          font-weight: 500;
          margin-left: 4px;
        }

        .auth-switch-btn:hover {
          text-decoration: underline;
        }
      `}</style>
    </>
  );
}

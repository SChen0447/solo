import { useState } from 'react';
import type { UserCard } from '@/types';
import { copyToClipboard, createToast } from '@/utils';
import { ToastContainer } from './Toast';
import type { Toast } from '@/types';

interface BusinessCardProps {
  user: UserCard;
  isContact?: boolean;
  onExchange?: () => void;
  showExchange?: boolean;
  compact?: boolean;
}

export default function BusinessCard({ user, isContact, onExchange, showExchange, compact }: BusinessCardProps) {
  const [toast, setToast] = useState<Toast | null>(null);

  const handleCopy = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setToast(createToast(`${label}已复制`));
    }
  };

  return (
    <>
      <div
        className="card business-card"
        style={{
          background: `linear-gradient(135deg, rgba(58, 134, 255, 0.1), rgba(157, 78, 221, 0.1))`,
          position: 'relative',
          padding: compact ? '16px' : '24px'
        }}
      >
        {isContact && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              fontSize: '24px',
              animation: 'bounce 1.5s ease-in-out infinite'
            }}
          >
            🤝
          </div>
        )}

        <div className="flex gap-md" style={{ alignItems: compact ? 'center' : 'flex-start' }}>
          <img
            src={user.avatar}
            alt={user.name}
            style={{
              width: compact ? '50px' : '70px',
              height: compact ? '50px' : '70px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid var(--glass-border)',
              flexShrink: 0
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: compact ? '16px' : '20px', fontWeight: '700', marginBottom: '4px' }}>
              {user.name}
              <span style={{ marginLeft: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                {user.gender === 'male' ? '♂' : '♀'}
              </span>
            </div>
            <div style={{ fontSize: compact ? '13px' : '14px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
              {user.position}
            </div>
            <div style={{ fontSize: compact ? '12px' : '13px', color: 'var(--text-muted)' }}>
              {user.company}
            </div>
          </div>
        </div>

        {!compact && (
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
            <div
              className="flex-between"
              style={{
                padding: '10px 12px',
                background: 'var(--glass-bg)',
                borderRadius: '8px',
                marginBottom: '8px',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
              onClick={() => handleCopy(user.email, '邮箱')}
            >
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>📧 邮箱</span>
              <span style={{ fontSize: '13px' }}>{user.email}</span>
            </div>
            <div
              className="flex-between"
              style={{
                padding: '10px 12px',
                background: 'var(--glass-bg)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
              onClick={() => handleCopy(user.phone, '手机号')}
            >
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>📱 手机</span>
              <span style={{ fontSize: '13px' }}>{user.phone}</span>
            </div>
          </div>
        )}

        {showExchange && onExchange && !isContact && (
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: compact ? '12px' : '20px' }}
            onClick={onExchange}
          >
            🤝 交换名片
          </button>
        )}
      </div>
      <ToastContainer toast={toast} />
    </>
  );
}

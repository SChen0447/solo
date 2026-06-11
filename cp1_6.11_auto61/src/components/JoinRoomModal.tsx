import React, { useState, useEffect, useRef } from 'react';
import { X, Users, Sparkles, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinSuccess: (roomId: string) => void;
}

const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  onJoinSuccess,
}) => {
  const [roomId, setRoomId] = useState('DEMO');
  const [nickname, setNickname] = useState('');
  const { joinRoom, loading } = useStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim() || !nickname.trim() || loading) return;

    await joinRoom(roomId.trim().toUpperCase(), nickname.trim());
    const { user } = useStore.getState();
    if (user) {
      onClose();
      onJoinSuccess(roomId.trim().toUpperCase());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" ref={modalRef} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="header-icon">
            <Users size={28} />
          </div>
          <h2 className="modal-title">
            <Sparkles size={20} className="title-sparkle" />
            加入比赛房间
          </h2>
          <p className="modal-subtitle">
            输入房间号和昵称，开始你的投资之旅
          </p>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">房间号</label>
            <input
              ref={inputRef}
              type="text"
              className="form-input"
              placeholder="例如：DEMO, FRIENDS2024"
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              maxLength={20}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label className="form-label">你的昵称</label>
            <input
              type="text"
              className="form-input"
              placeholder="给自己取个响亮的名字"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={16}
              autoComplete="off"
            />
          </div>

          <div className="form-info">
            <div className="info-row">
              <span className="info-label">初始资金</span>
              <span className="info-value">$100,000.00</span>
            </div>
            <div className="info-row">
              <span className="info-label">比赛房间</span>
              <span className="info-value">{roomId.toUpperCase() || '-'}</span>
            </div>
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={!roomId.trim() || !nickname.trim() || loading}
          >
            <span>{loading ? '加入中...' : '立即加入'}</span>
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.65);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
            animation: fadeIn 0.2s ease-out;
          }
          .modal-container {
            position: relative;
            background: linear-gradient(145deg, rgba(26, 34, 54, 0.95) 0%, rgba(17, 24, 39, 0.98) 100%);
            border: 1px solid rgba(0, 212, 255, 0.2);
            border-radius: var(--radius-xl);
            padding: 36px 32px;
            width: 100%;
            max-width: 420px;
            box-shadow: 
              0 24px 64px rgba(0, 0, 0, 0.5),
              0 0 0 1px rgba(255, 255, 255, 0.03) inset,
              0 0 80px rgba(0, 212, 255, 0.08);
            animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .modal-close {
            position: absolute;
            top: 16px;
            right: 16px;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
            transition: all var(--transition-fast);
          }
          .modal-close:hover {
            background: var(--bg-card-hover);
            color: var(--text-primary);
          }
          .modal-header {
            text-align: center;
            margin-bottom: 28px;
          }
          .header-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 16px;
            border-radius: 18px;
            background: linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 255, 136, 0.15) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--accent-blue);
            box-shadow: 0 8px 32px rgba(0, 212, 255, 0.2);
          }
          .modal-title {
            font-size: 22px;
            font-weight: 800;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 8px;
          }
          .title-sparkle {
            color: var(--accent-green);
          }
          .modal-subtitle {
            font-size: 14px;
            color: var(--text-secondary);
          }
          .modal-form {
            display: flex;
            flex-direction: column;
            gap: 18px;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .form-label {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary);
            padding-left: 4px;
          }
          .form-input {
            padding: 12px 16px;
            font-size: 15px;
            border-radius: var(--radius-md);
            background: var(--bg-secondary);
            border: 1.5px solid var(--border-color);
            transition: all var(--transition-fast);
          }
          .form-input::placeholder {
            color: var(--text-muted);
          }
          .form-input:focus {
            border-color: var(--accent-blue);
            box-shadow: 
              0 0 0 3px var(--accent-blue-glow),
              0 0 20px rgba(0, 212, 255, 0.15);
            transform: translateY(-1px);
          }
          .form-info {
            background: var(--bg-secondary);
            border-radius: var(--radius-md);
            padding: 14px 18px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 4px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
          }
          .info-label { color: var(--text-muted); }
          .info-value {
            font-weight: 700;
            color: var(--accent-green);
          }
          .submit-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 14px 24px;
            font-size: 15px;
            font-weight: 700;
            color: var(--bg-primary);
            background: linear-gradient(135deg, var(--accent-blue) 0%, #00ff88 100%);
            border-radius: var(--radius-md);
            margin-top: 6px;
            box-shadow: 0 8px 24px rgba(0, 212, 255, 0.3);
          }
          .submit-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(0, 212, 255, 0.4);
          }
          .submit-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          @media (max-width: 768px) {
            .modal-container {
              padding: 28px 20px;
              border-radius: var(--radius-lg);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default JoinRoomModal;

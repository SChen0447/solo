import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import './LoginModal.scss';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [nickname, setNickname] = useState('');
  const { login } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      login(nickname.trim());
      setNickname('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>欢迎来到食光·旬味</h2>
          <p className="modal-subtitle">输入昵称开始探索美食之旅</p>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="nickname">昵称</label>
            <input
              ref={inputRef}
              id="nickname"
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="请输入您的昵称"
              maxLength={20}
            />
          </div>
          
          <button 
            type="submit" 
            className="submit-btn"
            disabled={!nickname.trim()}
          >
            开始探索
          </button>
        </form>
        
        <div className="modal-footer">
          <span className="footer-icon">🥗</span>
          <span>发现四季时令美食</span>
          <span className="footer-icon">🍜</span>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;

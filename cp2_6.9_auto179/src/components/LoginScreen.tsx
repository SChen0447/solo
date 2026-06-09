import React from 'react';
import { useApp } from '../App';

const LoginScreen: React.FC = () => {
  const { login } = useApp();

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-icon">🎵</div>
        <h1 className="login-title">巡演管理器</h1>
        <p className="login-subtitle">独立音乐人的巡演日程与歌单管理工具</p>
        <button className="btn-primary login-btn" onClick={login}>
          进入系统
        </button>
        <div className="login-features">
          <div className="feature-item">
            <span className="feature-icon">🗺️</span>
            <span>智能路线规划</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎸</span>
            <span>歌单拖拽编排</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">👥</span>
            <span>乐队实时协作</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

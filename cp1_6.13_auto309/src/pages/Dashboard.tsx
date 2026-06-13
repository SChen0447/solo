import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CapsuleList from '../components/CapsuleList';
import { User, CapsuleData } from '../types';
import { capsuleApi } from '../utils/api';

interface DashboardProps {
  user: User | null;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [capsules, setCapsules] = useState<CapsuleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, unlocked: 0, locked: 0 });

  useEffect(() => {
    loadCapsules();
  }, [user]);

  const loadCapsules = async () => {
    if (!user) return;
    try {
      const response = await capsuleApi.getByUserId(user.id);
      const capsuleList = response.capsules || [];
      setCapsules(capsuleList.slice(0, 20));

      const now = new Date();
      const unlockedCount = capsuleList.filter(c => new Date(c.unlockDate) <= now).length;
      setStats({
        total: capsuleList.length,
        unlocked: unlockedCount,
        locked: capsuleList.length - unlockedCount
      });
    } catch (err) {
      console.error('加载胶囊失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapsuleClick = (capsuleId: string) => {
    navigate(`/capsule/${capsuleId}`);
  };

  const handleCreate = () => {
    navigate('/create');
  };

  const handleRefresh = () => {
    setIsLoading(true);
    loadCapsules();
  };

  return (
    <div className="dashboard-page">
      <Navbar user={user} onLogout={onLogout} />
      <div className="stars-bg"></div>

      <div className="dashboard-content">
        <aside className="sidebar glass-panel">
          <div className="sidebar-header">
            <h2 className="sidebar-title">时光收藏</h2>
            <p className="sidebar-subtitle">封存此刻的记忆</p>
          </div>

          <div className="stats-card">
            <div className="stat-item">
              <div className="stat-value stat-total">{stats.total}</div>
              <div className="stat-label">总胶囊数</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-value stat-locked">{stats.locked}</div>
              <div className="stat-label">封存中</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-value stat-unlocked">{stats.unlocked}</div>
              <div className="stat-label">已解锁</div>
            </div>
          </div>

          <button className="btn btn-primary btn-block btn-create-sidebar" onClick={handleCreate}>
            <span className="btn-icon-large">✦</span>
            创建新胶囊
          </button>

          <div className="sidebar-actions">
            <button className="btn btn-ghost btn-block" onClick={handleRefresh}>
              ↻ 刷新列表
            </button>
          </div>

          <div className="sidebar-tips">
            <h4 className="tips-title">使用指南</h4>
            <ul className="tips-list">
              <li>点击右侧琥珀查看详情</li>
              <li>设置解锁日期封存记忆</li>
              <li>到期后琥珀会自动裂开</li>
              <li>最多展示20个最新胶囊</li>
            </ul>
          </div>
        </aside>

        <main className="main-area">
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p className="loading-text">加载时光胶囊中...</p>
            </div>
          ) : capsules.length === 0 ? (
            <div className="empty-state">
              <div className="empty-amber">
                <div className="amber-placeholder">
                  <div className="amber-glow"></div>
                </div>
              </div>
              <h3 className="empty-title">还没有时光胶囊</h3>
              <p className="empty-desc">创建第一个胶囊，封存一段珍贵的记忆</p>
              <button className="btn btn-primary" onClick={handleCreate}>
                <span className="btn-icon">+</span>
                开始创建
              </button>
            </div>
          ) : (
            <CapsuleList capsuleData={capsules} onCapsuleClick={handleCapsuleClick} />
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;

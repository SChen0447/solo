import React, { useState, useMemo, useEffect } from 'react';
import { Capsule, CapsuleStatus, User } from '../types';
import { useAuth } from '../AuthContext';
import StarChart from '../components/StarChart';
import CapsuleDetail from '../components/CapsuleDetail';

interface Props {
  capsules: Capsule[];
  onOpenCapsule: (capsule: Capsule) => void;
  onNewCapsule: () => void;
  onRefresh: () => void;
}

export default function ArchivePage({ capsules, onOpenCapsule, onNewCapsule, onRefresh }: Props) {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<CapsuleStatus>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: user?.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredCapsules = useMemo(() => {
    return capsules.filter(c => {
      const created = new Date(c.createdAt);
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end + 'T23:59:59');
      if (created < start || created > end) return false;

      switch (statusFilter) {
        case 'unopened':
          return !c.isOpened;
        case 'opened':
          return c.isOpened && !c.reply;
        case 'replied':
          return !!c.reply;
        default:
          return true;
      }
    });
  }, [capsules, statusFilter, dateRange]);

  const unopenedCount = capsules.filter(c => !c.isOpened).length;
  const openedCount = capsules.filter(c => c.isOpened).length;
  const repliedCount = capsules.filter(c => c.reply).length;

  const handleStarClick = (capsule: Capsule) => {
    setSelectedCapsule(capsule);
  };

  const handleOpenFromDetail = () => {
    if (selectedCapsule) {
      onOpenCapsule(selectedCapsule);
      setSelectedCapsule(null);
    }
  };

  return (
    <div className="archive-page">
      <div className="archive-header">
        <div className="archive-title">
          <h2>我的星尘档案馆</h2>
          <p>
            共 {capsules.length} 枚胶囊 · 
            <span style={{ color: '#ffdd88' }}> 未开启 {unopenedCount}</span> · 
            <span style={{ color: '#88ccff' }}> 已开启 {openedCount}</span> · 
            <span style={{ color: '#aaffaa' }}> 已回复 {repliedCount}</span>
          </p>
        </div>
        <button className="btn-primary create-btn" onClick={onNewCapsule}>
          ✦ 埋藏新胶囊
        </button>
      </div>

      <div className="archive-filters">
        <div className="status-filters">
          {(['all', 'unopened', 'opened', 'replied'] as CapsuleStatus[]).map(s => (
            <button
              key={s}
              className={`status-filter ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' && '全部'}
              {s === 'unopened' && '未开启'}
              {s === 'opened' && '已开启'}
              {s === 'replied' && '已回复'}
            </button>
          ))}
        </div>

        <div className="date-filter">
          <label>日期范围：</label>
          <input
            type="date"
            value={dateRange.start}
            max={dateRange.end}
            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
          />
          <span>—</span>
          <input
            type="date"
            value={dateRange.end}
            min={dateRange.start}
            max={new Date().toISOString().split('T')[0]}
            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
          />
        </div>
      </div>

      <div className="chart-container">
        {isMobile ? (
          <div className="mobile-capsule-list">
            {filteredCapsules.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✧</div>
                <p>暂无符合条件的胶囊</p>
                <button className="btn-primary" onClick={onNewCapsule}>埋藏第一枚胶囊</button>
              </div>
            ) : (
              filteredCapsules.map(c => (
                <div
                  key={c.id}
                  className="capsule-card"
                  onClick={() => handleStarClick(c)}
                  style={{ borderColor: c.isOpened ? '#88ccff' : '#ffdd88' }}
                >
                  <div className="capsule-card-mood" style={{ background: c.moodColor }}>
                    {c.mood}
                  </div>
                  <div className="capsule-card-content">
                    <div className="capsule-card-title">
                      {c.isOpened ? `${c.senderName} → ${c.recipientName}` : '未开启胶囊'}
                    </div>
                    <div className="capsule-card-meta">
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      <span>开启：{new Date(c.openAt).toLocaleDateString()}</span>
                      {c.photos.length > 0 && <span>📷 {c.photos.length}</span>}
                    </div>
                    <div className="capsule-card-status" style={{ color: c.isOpened ? '#88ccff' : '#ffdd88' }}>
                      {c.reply ? '✓ 已回复' : c.isOpened ? '○ 已开启' : '✦ 等待开启'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <StarChart
            capsules={filteredCapsules}
            allCapsules={capsules}
            onStarClick={handleStarClick}
          />
        )}
      </div>

      {selectedCapsule && (
        <CapsuleDetail
          capsule={selectedCapsule}
          onClose={() => setSelectedCapsule(null)}
          onOpen={handleOpenFromDetail}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

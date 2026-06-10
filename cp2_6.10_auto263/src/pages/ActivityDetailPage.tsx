import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { activityApi } from '../utils/api';
import SignupForm from '../components/SignupForm';
import ReaderBooksPopup from '../components/ReaderBooksPopup';
import Toast from '../components/Toast';
import type { Activity, Signup } from '../types';
import { TYPE_COLORS } from '../types';
import { formatDate, formatDateTime, generateAvatarColor, getInitial } from '../utils/helpers';

const MOCK_CURRENT_READER_ID = '20240001';

const ActivityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [readerPopup, setReaderPopup] = useState<{ open: boolean; readerId: string; name: string }>({
    open: false,
    readerId: '',
    name: ''
  });
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });
  const [scrollY, setScrollY] = useState(0);

  const fetchActivity = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await activityApi.getById(id);
      setActivity(data);
    } catch (err) {
      setToast({ visible: true, message: err instanceof Error ? err.message : '加载失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [id]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currentSignup = useMemo(() => {
    if (!activity) return null;
    return activity.signups.find((s) => s.readerId === MOCK_CURRENT_READER_ID) || null;
  }, [activity]);

  const isFull = activity ? activity.signups.length >= activity.capacity : false;

  const handleSignup = async (data: { name: string; readerId: string; phone: string }) => {
    if (!id) throw new Error('活动ID不存在');
    setSigningUp(true);
    try {
      await activityApi.signup(id, data);
      setToast({ visible: true, message: '报名成功！', type: 'success' });
      await fetchActivity();
    } catch (err) {
      setToast({ visible: true, message: err instanceof Error ? err.message : '报名失败，请重试', type: 'error' });
      throw err;
    } finally {
      setSigningUp(false);
    }
  };

  const handleCheckin = async () => {
    if (!id) return;
    setCheckingIn(true);
    try {
      await activityApi.checkin(id, MOCK_CURRENT_READER_ID);
      setToast({ visible: true, message: '签到成功！', type: 'success' });
      await fetchActivity();
    } catch (err) {
      setToast({ visible: true, message: err instanceof Error ? err.message : '签到失败', type: 'error' });
    } finally {
      setCheckingIn(false);
    }
  };

  const handleReaderClick = (signup: Signup) => {
    setReaderPopup({ open: true, readerId: signup.readerId, name: signup.name });
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!activity) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❓</div>
        <p>活动不存在</p>
        <button className="btn btn-back" style={{ marginTop: 20 }} onClick={() => navigate('/')}>
          返回列表
        </button>
      </div>
    );
  }

  const coverColor = TYPE_COLORS[activity.type] || '#d4a373';

  return (
    <div className="detail-page">
      <button className="btn btn-back" style={{ marginBottom: 20 }} onClick={() => navigate('/')}>
        ← 返回列表
      </button>

      <motion.div
        className="detail-cover"
        style={{
          background: `linear-gradient(135deg, ${coverColor}, ${coverColor}cc)`,
          transform: `translateY(${scrollY * 0.3}px)`
        }}
      >
        <span className="detail-cover-type">{activity.type}</span>
        <h1>{activity.title}</h1>
      </motion.div>

      <div className="detail-info-section">
        <h2>📋 活动信息</h2>
        <div className="detail-info-grid">
          <div className="detail-info-item">
            <span className="detail-info-label">日期</span>
            <span className="detail-info-value">{formatDate(activity.date)}</span>
          </div>
          <div className="detail-info-item">
            <span className="detail-info-label">时间</span>
            <span className="detail-info-value">{activity.time}</span>
          </div>
          <div className="detail-info-item">
            <span className="detail-info-label">地点</span>
            <span className="detail-info-value">{activity.location}</span>
          </div>
          <div className="detail-info-item">
            <span className="detail-info-label">报名人数</span>
            <span className="detail-info-value">
              {activity.signups.length} / {activity.capacity}
            </span>
          </div>
        </div>
      </div>

      <div className="detail-info-section">
        <h2>📝 活动描述</h2>
        <p className="detail-description">{activity.description}</p>
      </div>

      <div className="detail-action-bar">
        {!currentSignup ? (
          <button
            className={`btn ${isFull ? 'btn-disabled' : 'btn-primary'}`}
            onClick={() => setShowSignup(true)}
            disabled={isFull}
          >
            {isFull ? '活动已满' : '立即报名'}
          </button>
        ) : currentSignup.checkedIn ? (
          <div className="checkin-status">
            ✓ 已签到
            {currentSignup.checkedInAt && <span>&nbsp;({formatDateTime(currentSignup.checkedInAt)})</span>}
          </div>
        ) : (
          <button className="btn btn-secondary" onClick={handleCheckin} disabled={checkingIn}>
            {checkingIn ? '签到中...' : '签到'}
          </button>
        )}
      </div>

      <div className="detail-info-section">
        <h2>👥 签到名单（{activity.signups.filter((s) => s.checkedIn).length}/{activity.signups.length}）</h2>
        {activity.signups.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px' }}>
            <p>暂无报名人员</p>
          </div>
        ) : (
          <div className="signup-list">
            {activity.signups.map((signup, idx) => (
              <motion.div
                key={signup.id}
                className="signup-item"
                onClick={() => handleReaderClick(signup)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
              >
                <div className="signup-avatar" style={{ background: generateAvatarColor(signup.name) }}>
                  {getInitial(signup.name)}
                </div>
                <div className="signup-info">
                  <div className={`signup-name ${signup.checkedIn ? 'checked-in' : 'not-checked'}`}>
                    {signup.checkedIn && <span className="checkin-checkmark">✓</span>}
                    {signup.name}
                  </div>
                  {signup.checkedIn && signup.checkedInAt && (
                    <div className="signup-time">签到于 {formatDateTime(signup.checkedInAt)}</div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <SignupForm isOpen={showSignup} onClose={() => setShowSignup(false)} onSubmit={handleSignup} />
      {signingUp && null}

      <ReaderBooksPopup
        isOpen={readerPopup.open}
        readerId={readerPopup.readerId}
        readerName={readerPopup.name}
        onClose={() => setReaderPopup({ ...readerPopup, open: false })}
      />

      <Toast
        isVisible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, visible: false })}
      />
    </div>
  );
};

export default ActivityDetailPage;
